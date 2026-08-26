"""
backend/core/graph_engine.py
─────────────────────────────
LangGraph multi-agent orchestration engine.

Supports two modes:

  1. SEQUENTIAL — agents chain one after another, each refining the previous output.
  2. SUPERVISOR — a coordinator agent decomposes the task and assigns specific subtasks
                  to each agent, then a synthesizer assembles the final output.

Each agent runs a ReAct loop: reason → pick tool → call tool → observe → repeat → output.
Events are pushed to a threading.Queue for real-time SSE streaming to the frontend.
"""
from __future__ import annotations

import json
import re
import time
import threading
from typing import TypedDict, Annotated, List, Optional, Any
import operator
import os

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from .tools import execute_tool, get_tool_descriptions, TOOL_REGISTRY


# ─── SHARED AGENT STATE ───────────────────────────────────────────────────────

class AgentState(TypedDict):
    task: str
    mode: str                                      # "sequential" | "supervisor"
    agents: list                                   # list of agent dicts
    assignments: dict                              # {agent_id: subtask}
    messages: Annotated[List, operator.add]        # accumulated agent outputs
    current_draft: str                             # for sequential mode
    final_output: str
    iteration: int


# ─── LLM FACTORY ─────────────────────────────────────────────────────────────

def _build_llm(provider: str, api_key: str, api_model: str):
    if provider == "GROQ":
        os.environ["GROQ_API_KEY"] = api_key
        return ChatGroq(temperature=0.7, model_name=api_model)
    elif provider == "OPENAI":
        os.environ["OPENAI_API_KEY"] = api_key
        return ChatOpenAI(temperature=0.7, model_name=api_model)
    raise ValueError(f"INVALID_PROVIDER: {provider}")


# ─── REACT LOOP ───────────────────────────────────────────────────────────────

REACT_SYSTEM = """{role_block}

You have access to the following tools. Use them when you need information or to perform actions.
{tool_descriptions}

RESPONSE FORMAT — You MUST use exactly one of these formats per message:

To call a tool:
TOOL_CALL: {{"tool": "<tool_name>", "args": {{<key>: <value>}}}}

When you have enough information and are ready to deliver your final answer:
FINAL_ANSWER: <your complete detailed response here>

Rules:
- Think step by step before choosing a tool or delivering your answer.
- Call tools one at a time. Observe the result before deciding next step.
- Do not fabricate tool results. Only use what tools actually return.
- Deliver FINAL_ANSWER in well-structured markdown.
"""

def _extract_json_object(text: str, prefix: str = "TOOL_CALL:") -> Optional[dict]:
    """Extract first valid balanced JSON object after prefix or from markdown block."""
    idx = text.find(prefix)
    text_after = text[idx + len(prefix):] if idx != -1 else text

    start = text_after.find('{')
    if start == -1:
        return None

    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text_after)):
        char = text_after[i]
        if escape:
            escape = False
            continue
        if char == '\\':
            escape = True
            continue
        if char == '"':
            in_str = not in_str
            continue
        if not in_str:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    json_str = text_after[start:i+1]
                    try:
                        return json.loads(json_str)
                    except Exception:
                        return None
    return None

def _run_react_loop(
    llm,
    agent_name: str,
    agent_role: str,
    agent_protocol: str,
    subtask: str,
    event_queue: Optional[Any] = None,
    max_iterations: int = 8
) -> str:
    """
    ReAct loop: reason → tool call → observe → repeat → final answer.
    Pushes events to event_queue if provided (for SSE streaming).
    """
    def push(event_type: str, data: dict):
        if event_queue is not None:
            data["type"] = event_type
            data["agent"] = agent_name
            event_queue.put(json.dumps(data))

    role_block = (
        f"You are {agent_name}, a specialist with the role: {agent_role}.\n"
        f"Your core protocol: {agent_protocol}"
    )

    system_prompt = REACT_SYSTEM.format(
        role_block=role_block,
        tool_descriptions=get_tool_descriptions()
    )

    conversation = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"YOUR ASSIGNED TASK:\n{subtask}")
    ]

    push("agent_start", {"role": agent_role, "subtask": subtask})

    for i in range(max_iterations):
        response = llm.invoke(conversation)
        text = response.content.strip()
        conversation.append(AIMessage(content=text))

        # Check for tool call
        call_obj = _extract_json_object(text, "TOOL_CALL:")
        if not call_obj:
            block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
            if block_match:
                try:
                    candidate = json.loads(block_match.group(1))
                    if isinstance(candidate, dict) and "tool" in candidate:
                        call_obj = candidate
                except Exception:
                    pass

        # If a tool call was detected, execute it
        if call_obj and "tool" in call_obj:
            tool_name = call_obj.get("tool", "")
            tool_args = call_obj.get("args", {})
            push("tool_call", {"tool": tool_name, "input": tool_args})

            result = execute_tool(tool_name, tool_args)
            push("tool_result", {"tool": tool_name, "output": result[:500]})

            conversation.append(HumanMessage(
                content=f"TOOL_RESULT [{tool_name}]:\n{result}\n\nNow provide your NEXT step or your FINAL_ANSWER:"
            ))
            continue

        # Check for FINAL_ANSWER
        answer_match = re.search(r'FINAL_ANSWER:\s*(.*)', text, re.DOTALL)
        if answer_match:
            final = answer_match.group(1).strip()
            push("agent_complete", {"output": final[:300] + "..." if len(final) > 300 else final})
            return final

        # If no tool call and no FINAL_ANSWER prefix, treat whole response as complete
        push("agent_complete", {"output": text[:300]})
        return text

    # Max iterations hit
    last = conversation[-1].content if conversation else "NO_OUTPUT"
    push("agent_complete", {"output": "[MAX_ITERATIONS_REACHED]"})
    return last


# ─── SUPERVISOR NODE ─────────────────────────────────────────────────────────

def _make_supervisor_node(llm, event_queue):
    def supervisor(state: AgentState) -> dict:
        task = state["task"]
        agents = state["agents"]

        if event_queue:
            event_queue.put(json.dumps({
                "type": "supervisor_start",
                "task": task,
                "agents": [{"name": a.get("name"), "role": a.get("subheading")} for a in agents]
            }))

        agent_list = "\n".join(
            f"  - ID: {a.get('id', i)} | Name: {a.get('name')} | Role: {a.get('subheading')} | Protocol: {a.get('desc', '')[:100]}"
            for i, a in enumerate(agents)
        )

        prompt = f"""You are a task coordinator. Your job is to decompose a complex task and assign each part to the right specialist.

TASK: {task}

AVAILABLE AGENTS:
{agent_list}

Instructions:
1. Analyze the task carefully.
2. Decompose it into distinct, non-overlapping subtasks — one per agent.
3. Match each subtask to the agent whose role and protocol best fits it.
4. Make each subtask specific and actionable.

Output ONLY a valid JSON object like this:
{{
  "<agent_id>": "<specific subtask for this agent>",
  "<agent_id>": "<specific subtask for this agent>"
}}

Do not include any explanation before or after the JSON."""

        response = llm.invoke([HumanMessage(content=prompt)])
        text = response.content.strip()

        # Extract JSON
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                assignments = json.loads(json_match.group())
            except json.JSONDecodeError:
                # Fallback: assign full task to each agent
                assignments = {
                    a.get("id", str(i)): task
                    for i, a in enumerate(agents)
                }
        else:
            assignments = {
                a.get("id", str(i)): task
                for i, a in enumerate(agents)
            }

        if event_queue:
            event_queue.put(json.dumps({
                "type": "supervisor_assignment",
                "assignments": assignments
            }))

        return {"assignments": assignments}

    return supervisor


# ─── AGENT NODE FACTORY ───────────────────────────────────────────────────────

def _make_agent_node(agent_data: dict, llm, mode: str, event_queue, is_first: bool = False):
    name = agent_data.get("name", "Agent")
    role = agent_data.get("subheading", "Specialist")
    protocol = agent_data.get("desc", "You are a helpful AI.")
    agent_id = agent_data.get("id", name.lower())

    def agent_node(state: AgentState) -> dict:
        if mode == "supervisor":
            subtask = state.get("assignments", {}).get(agent_id, state["task"])
        else:
            # Sequential: refine previous draft
            draft = state.get("current_draft", "")
            if is_first or not draft:
                subtask = state["task"]
            else:
                subtask = (
                    f"Original task: {state['task']}\n\n"
                    f"Previous draft (for you to review and improve from your specialist perspective):\n"
                    f"{draft}\n\n"
                    f"Add your unique expert contribution and return the improved version."
                )

        output = _run_react_loop(
            llm=llm,
            agent_name=name,
            agent_role=role,
            agent_protocol=protocol,
            subtask=subtask,
            event_queue=event_queue,
        )

        return {
            "messages": [AIMessage(content=f"[{name}]: {output}")],
            "current_draft": output,
            "iteration": state.get("iteration", 0) + 1,
            "final_output": output
        }

    agent_node.__name__ = f"agent_{name.lower().replace(' ', '_')}"
    return agent_node


# ─── SYNTHESIZER NODE ─────────────────────────────────────────────────────────

def _make_synthesizer_node(team_name: str, llm, event_queue):
    def synthesizer(state: AgentState) -> dict:
        if event_queue:
            event_queue.put(json.dumps({"type": "synthesizer_start"}))

        messages = state.get("messages", [])
        agent_outputs = "\n\n".join(
            f"{m.content}" for m in messages
            if isinstance(m, AIMessage)
        )

        prompt = f"""You are the final synthesizer for team "{team_name}".

Each specialist on the team has completed their assigned subtask. Your job is to combine their work into one cohesive, professional final deliverable.

ORIGINAL TASK: {state['task']}

AGENT CONTRIBUTIONS:
{agent_outputs}

Produce a single, well-organized final output that:
- Integrates all contributions logically
- Resolves any conflicts or overlaps
- Is formatted in clean markdown
- Reads as a unified document, not a collection of fragments"""

        response = llm.invoke([HumanMessage(content=prompt)])
        final = response.content.strip()

        if event_queue:
            event_queue.put(json.dumps({
                "type": "task_complete",
                "final_output": final
            }))

        return {"final_output": final}

    return synthesizer


# ─── MAIN EXECUTION FUNCTION ──────────────────────────────────────────────────

def execute_graph_crew(
    team_name: str,
    task_description: str,
    agents_data: list,
    api_key: str,
    provider: str,
    api_model: str,
    mode: str = "supervisor",
    event_queue=None
) -> str:
    """
    Build and execute a LangGraph multi-agent workflow.

    Args:
        mode: "sequential" | "supervisor"
        event_queue: optional threading.Queue for SSE event streaming
    """
    print(f"\n// [LANGGRAPH]: BUILDING GRAPH — TEAM [{team_name}] — MODE [{mode}]")
    start_time = time.time()

    llm = _build_llm(provider, api_key, api_model)

    if event_queue:
        event_queue.put(json.dumps({
            "type": "execution_start",
            "team": team_name,
            "mode": mode,
            "task": task_description,
            "agent_count": len(agents_data)
        }))

    graph_builder = StateGraph(AgentState)
    node_names = []

    if mode == "supervisor":
        # Add supervisor node
        graph_builder.add_node("supervisor", _make_supervisor_node(llm, event_queue))
        node_names.append("supervisor")

        # Add one node per agent
        for i, agent_data in enumerate(agents_data):
            node_fn = _make_agent_node(agent_data, llm, mode="supervisor", event_queue=event_queue)
            node_name = f"agent_{i}"
            graph_builder.add_node(node_name, node_fn)
            node_names.append(node_name)

        # Add synthesizer
        graph_builder.add_node("synthesizer", _make_synthesizer_node(team_name, llm, event_queue))

        # Wire: supervisor → all agents sequentially → synthesizer
        graph_builder.set_entry_point("supervisor")
        prev = "supervisor"
        for name in node_names[1:]:  # skip supervisor
            graph_builder.add_edge(prev, name)
            prev = name
        graph_builder.add_edge(prev, "synthesizer")
        graph_builder.add_edge("synthesizer", END)

    else:
        # Sequential mode
        for i, agent_data in enumerate(agents_data):
            node_fn = _make_agent_node(
                agent_data, llm, mode="sequential",
                event_queue=event_queue, is_first=(i == 0)
            )
            node_name = f"agent_{i}"
            graph_builder.add_node(node_name, node_fn)
            node_names.append(node_name)

        graph_builder.set_entry_point(node_names[0])
        for i in range(len(node_names) - 1):
            graph_builder.add_edge(node_names[i], node_names[i + 1])
        graph_builder.add_edge(node_names[-1], END)

    graph = graph_builder.compile()

    initial_state: AgentState = {
        "task": task_description,
        "mode": mode,
        "agents": agents_data,
        "assignments": {},
        "messages": [],
        "current_draft": "",
        "final_output": "",
        "iteration": 0
    }

    print(f"// [LANGGRAPH]: EXECUTING — {len(agents_data)} AGENTS — MODE [{mode}]")
    final_state = graph.invoke(initial_state)

    duration_ms = int((time.time() - start_time) * 1000)
    print(f"// [LANGGRAPH]: COMPLETE — {duration_ms}ms")

    if event_queue:
        event_queue.put(None)  # sentinel: stream done

    return final_state.get("final_output", "Graph execution produced no output.")
