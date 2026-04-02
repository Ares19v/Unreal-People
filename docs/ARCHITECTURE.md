# System Architecture: Unreal People

## The Dual-Core Philosophy
Unreal People is designed to bridge the gap between secure, offline hardware inference and high-speed cloud orchestration. It achieves this through a strict architectural bifurcation.

### Core 1: Local Engine (Hardware Sandbox)
* **Location:** Page 2 (Frontend) -> `main.py /initialize_engine` (Backend)
* **Engine:** `llama-cpp-python`
* **Purpose:** Allows users to load quantized LLM weights (`.gguf`) directly into local VRAM (e.g., RTX 5060). Supports LoRA adapter injection for specialized, offline logic tuning.
* **Quarantine:** This core is completely isolated. Hardware initialization logic is physically separated from cloud API execution to prevent memory leaks and VRAM fragmentation.

### Core 2: Cloud API Engine (High-Speed Orchestration)
* **Location:** Page 3 CrewAI Hub (Frontend) -> `crew_engine.py` (Backend)
* **Engine:** `Langchain` (Groq, OpenAI)
* **Purpose:** Handles complex, multi-agent autonomous workflows via `CrewAI`. By routing complex reasoning loops to enterprise APIs, the system bypasses local hardware bottlenecks for multi-agent negotiation.

## Agent Persona Injection
Agents are dynamically generated via "System Message Injection." Instead of relying on slow, hardware-intensive fine-tuning, the system injects user-defined JSON properties (Name, Subheading, Description) into high-priority system prompts, forcing the base model to "act" as the defined specialist during the CrewAI execution loop.
