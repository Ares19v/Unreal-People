import os
from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

def execute_api_crew(team_name: str, task_description: str, agents_data: list, api_key: str, provider: str, api_model: str):
    """
    Constructs a dynamic autonomous workflow using CrewAI and executes it
    STRICTLY via Cloud API (Groq or OpenAI).
    """
    print(f"\n// [SYSTEM]: INITIATING CLOUD CREW -> [{team_name}]")

    # 1. INITIALIZE THE CLOUD LLM
    try:
        print(f"// [SYSTEM]: ESTABLISHING UPLINK TO -> {provider} | {api_model}")
        if provider == "GROQ":
            os.environ["GROQ_API_KEY"] = api_key
            llm_engine = ChatGroq(temperature=0.7, model_name=api_model)
        elif provider == "OPENAI":
            os.environ["OPENAI_API_KEY"] = api_key
            llm_engine = ChatOpenAI(temperature=0.7, model_name=api_model)
        else:
            raise ValueError("INVALID_PROVIDER")
    except Exception as e:
        raise Exception(f"API_FAULT: Check API Key and Provider settings. {str(e)}")

    crew_agents = []
    crew_tasks = []

    # 2. INSTANTIATE AGENTS
    for i, a in enumerate(agents_data):
        agent = Agent(
            role=a['subheading'],
            goal=a['desc'],
            backstory=f"You are {a['name']}, an elite specialist. {a['desc']}",
            verbose=True,
            allow_delegation=False,
            llm=llm_engine
        )
        crew_agents.append(agent)

        # 3. DYNAMIC SEQUENTIAL TASKING
        if i == 0:
            task_desc = f"PRIMARY OBJECTIVE: {task_description}. Provide a comprehensive initial analysis, draft, or solution based on your expertise."
        else:
            task_desc = f"SECONDARY OBJECTIVE: Review the preceding work regarding '{task_description}'. Refine, expand, or rewrite it specifically through the lens of your expertise."

        task = Task(
            description=task_desc,
            expected_output="A highly detailed, professional markdown report or code block.",
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
