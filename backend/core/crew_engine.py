import os
from crewai import Agent, Task, Crew, Process, LLM

def execute_api_crew(team_name: str, task_description: str, agents_data: list, api_key: str, provider: str, api_model: str):
    """
    Constructs a dynamic autonomous workflow using CrewAI 1.x and executes it
    STRICTLY via Cloud API (Groq or OpenAI).
    Updated for crewai 1.12.2 — uses native LLM class instead of LangChain wrappers.
    """
    print(f"\n// [SYSTEM]: INITIATING CLOUD CREW -> [{team_name}]")

    # 1. INITIALIZE THE CLOUD LLM (crewai 1.x uses native LLM class with litellm routing)
    try:
        print(f"// [SYSTEM]: ESTABLISHING UPLINK TO -> {provider} | {api_model}")

        if provider == "GROQ":
            # litellm format: "groq/<model_name>"
            llm_engine = LLM(
                model=f"groq/{api_model}",
                api_key=api_key,
                temperature=0.7
            )
        elif provider == "OPENAI":
            # litellm format: "openai/<model_name>"
            llm_engine = LLM(
                model=f"openai/{api_model}",
                api_key=api_key,
                temperature=0.7
            )
        else:
            raise ValueError(f"INVALID_PROVIDER: '{provider}'. Must be GROQ or OPENAI.")

    except Exception as e:
        raise Exception(f"API_FAULT: Check API Key and Provider settings. Detail: {str(e)}")

    crew_agents = []
    crew_tasks = []

    # 2. INSTANTIATE AGENTS with new crewai 1.x API
    for i, a in enumerate(agents_data):
        agent = Agent(
            role=a.get('subheading', 'Specialist'),
            goal=a.get('desc', 'Complete the assigned task with maximum expertise.'),
            backstory=(
                f"You are {a.get('name', 'an elite agent')}, a world-class specialist. "
                f"Your entire identity and expertise is defined by: {a.get('desc', '')}"
            ),
            verbose=True,
            allow_delegation=False,
            llm=llm_engine
        )
        crew_agents.append(agent)

        # 3. DYNAMIC SEQUENTIAL TASKING WITH CHAIN-OF-THOUGHT ENFORCEMENT
        # Forcing explicit reasoning before output significantly reduces logic errors
        if i == 0:
            task_desc = (
                f"OBJECTIVE: {task_description}\n\n"
                f"REASONING PROTOCOL (follow this exactly):\n"
                f"STEP 1 — ANALYZE: Break down the objective. What does it require? What are the risks, constraints, and key variables?\n"
                f"STEP 2 — REASON: Think through the approach step by step from your specialist perspective.\n"
                f"STEP 3 — EXECUTE: Now deliver your comprehensive expert output based on your reasoning.\n\n"
                f"Your final output must be well-structured markdown."
            )
        else:
            task_desc = (
                f"OBJECTIVE: Review and improve the preceding agent's work on: '{task_description}'\n\n"
                f"REASONING PROTOCOL:\n"
                f"STEP 1 — CRITIQUE: What did the previous agent miss, oversimplify, or get wrong from your specialist lens?\n"
                f"STEP 2 — ADD VALUE: What unique insight does your expertise contribute that wasn't covered?\n"
                f"STEP 3 — SYNTHESIZE: Deliver a refined, expanded version incorporating your critique.\n\n"
                f"Your final output must be well-structured markdown."
            )

        task = Task(
            description=task_desc,
            expected_output="A highly detailed, professional markdown report or code block responding to the objective.",
            agent=agent
        )
        crew_tasks.append(task)

    # 4. ORCHESTRATE THE CREW
    crew = Crew(
        agents=crew_agents,
        tasks=crew_tasks,
        process=Process.sequential,
        verbose=True
    )

    print("// [SYSTEM]: CLOUD NEURAL LINK ESTABLISHED. EXECUTING PROTOCOL...")

    # 5. KICKOFF
    result = crew.kickoff()
    return str(result)
