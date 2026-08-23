"""
LangGraph-powered multi-agent engine.
Unlike CrewAI's fixed sequential flow, LangGraph supports:
  - Conditional branching (route to different agents based on output)
  - Loops (agent can retry or refine until quality threshold met)
  - Dynamic state passing between nodes

Architecture:
  Each agent is a "node" in a directed state graph.
  The orchestrator starts at the first agent, passes state through the graph,
  and the final node outputs the result.
"""
from typing import TypedDict, Annotated, List
import operator
import os

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END


# ============================================================
# SHARED STATE SCHEMA
# Each node reads/writes to this shared state dict
# ============================================================

class AgentState(TypedDict):
    task: str                              # The original user objective
    messages: Annotated[List, operator.add]  # Accumulates all agent outputs
    current_draft: str                     # The latest working draft (passed between agents)
    iteration: int                         # How many agent passes have run
    final_output: str                      # The resolved final output


def _build_llm(provider: str, api_key: str, api_model: str):
    """Build a LangChain LLM for use as LangGraph node logic."""
    if provider == "GROQ":
        os.environ["GROQ_API_KEY"] = api_key
        return ChatGroq(temperature=0.7, model_name=api_model)
    elif provider == "OPENAI":
        os.environ["OPENAI_API_KEY"] = api_key
        return ChatOpenAI(temperature=0.7, model_name=api_model)
    else:
        raise ValueError(f"INVALID_PROVIDER: {provider}")


def _make_agent_node(agent_data: dict, llm, is_first: bool):
    """
    Factory that creates a LangGraph node function for a given agent.
    Each node reads the current state, runs LLM inference, and returns updated state.
    """
    name = agent_data.get("name", "Agent")
    role = agent_data.get("subheading", "Specialist")
    protocol = agent_data.get("desc", "You are a helpful AI.")

    def agent_node(state: AgentState) -> AgentState:
        task = state["task"]
        draft = state.get("current_draft", "")

        # Build system prompt with CoT instruction
        system_content = (
            f"You are {name}, {role}. {protocol}\n\n"
            f"REASONING PROTOCOL:\n"
            f"1. Analyze the task from your unique specialist perspective.\n"
            f"2. Identify what value YOU specifically add that a generalist cannot.\n"
            f"3. Produce or refine the output accordingly.\n"
            f"Always respond in well-structured markdown."
        )

        if is_first or not draft:
            user_content = f"TASK: {task}\n\nProvide your initial comprehensive analysis and solution."
        else:
            user_content = (
                f"TASK: {task}\n\n"
                f"PREVIOUS DRAFT:\n{draft}\n\n"
                f"As {role}, critique and refine the above draft. "
                f"Add your specialist insights. Return an improved complete version."
            )

        response = llm.invoke([
            SystemMessage(content=system_content),
            HumanMessage(content=user_content)
        ])

        new_draft = response.content
        print(f"// [LANGGRAPH] -> NODE COMPLETE: {name} ({role})")

        return {
            "messages": [AIMessage(content=f"[{name}]: {new_draft}")],
            "current_draft": new_draft,
            "iteration": state.get("iteration", 0) + 1,
            "final_output": new_draft
        }

    agent_node.__name__ = f"agent_{name.lower().replace(' ', '_')}"
    return agent_node


def execute_graph_crew(
    team_name: str,
    task_description: str,
    agents_data: list,
    api_key: str,
    provider: str,
    api_model: str
) -> str:
    """
    Build and execute a LangGraph multi-agent workflow.
    Each agent is a node; they pass a shared draft through the graph sequentially,
    with each agent building on the previous agent's output.

    Future enhancement: add conditional edges so a "reviewer" node can loop back
    if quality is insufficient.
    """
    print(f"\n// [LANGGRAPH]: BUILDING GRAPH FOR TEAM [{team_name}]")

    llm = _build_llm(provider, api_key, api_model)

    # Build state graph
    graph_builder = StateGraph(AgentState)

    node_names = []
    for i, agent_data in enumerate(agents_data):
        is_first = (i == 0)
        node_fn = _make_agent_node(agent_data, llm, is_first)
        node_name = f"agent_{i}"
        graph_builder.add_node(node_name, node_fn)
        node_names.append(node_name)

    # Wire edges: linear pipeline (agent_0 → agent_1 → ... → END)
    graph_builder.set_entry_point(node_names[0])
    for i in range(len(node_names) - 1):
        graph_builder.add_edge(node_names[i], node_names[i + 1])
    graph_builder.add_edge(node_names[-1], END)

    graph = graph_builder.compile()

    # Execute
    initial_state: AgentState = {
        "task": task_description,
        "messages": [],
        "current_draft": "",
        "iteration": 0,
        "final_output": ""
    }

    print(f"// [LANGGRAPH]: EXECUTING GRAPH WITH {len(agents_data)} NODES...")
    final_state = graph.invoke(initial_state)

    print("// [LANGGRAPH]: GRAPH EXECUTION COMPLETE")
    return final_state.get("final_output", "Graph execution produced no output.")
