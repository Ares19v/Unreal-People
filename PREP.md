# PREP — Unreal People (From-Scratch Study Guide)

Welcome to the beginner-friendly developer study guide for **Unreal People**! In this guide, you will learn the core concepts of local model execution, quantization, adapters, and multi-agent cloud orchestration.

---

## 1. Local Model Sandboxing: GGUF & Quantization

To run Large Language Models (LLMs) offline on local hardware, we must solve a major hurdle: **Memory (VRAM) Constraints**.

### What is Quantization?
* Normally, LLM parameters are stored as 16-bit or 32-bit floating-point numbers (FP16 or FP32).
* A 7-billion parameter model in FP16 requires approximately **14 GB of VRAM** just to load into memory, exceeding the limits of standard consumer GPUs (like an RTX 4060 or 5060, which typically have 6GB to 8GB).
* **Quantization** compresses these parameters into lower-bit representations (e.g. 4-bit integers - `Q4_K_M` or 8-bit - `Q8_0`).
* A 7B model quantized to 4-bit runs beautifully inside only **~4.5 GB of VRAM**, making offline inference on standard laptops a reality.

### What is GGUF?
* **GGUF** (GPT-Generated Unified Format) is a file format designed by the llama.cpp community to package models. It is single-file, highly optimized, and allows fast CPU/GPU split-loading, meaning if a model is slightly too large for VRAM, the system can gracefully offload parts of it to standard system RAM.

---

## 2. Dynamic Customization with LoRA Adapters

Fine-tuning a complete model requires updating billions of weights, demanding massive GPU cluster budgets. **LoRA** (Low-Rank Adaptation) changes this:

* **How LoRA works**: During training, we freeze the original model weights. We insert small, lightweight mathematical rank-decomposition matrices (adapters) into the attention layers.
* **Why it's cool**:
  * Instead of a 14 GB model file, a LoRA adapter file is typically only **10 MB to 100 MB**.
  * You can dynamically load and swap different LoRA adapters at runtime to instantly transition the base model from a "medical specialist" to a "code writer," without restarting the core model in GPU memory.

---

## 3. Multi-Agent Orchestration with CrewAI

For highly complex, multi-step tasks, single LLM prompts often fail. **CrewAI** orchestrates collaborative teams of LLMs (Agents) acting as a cohesive crew.

### Core CrewAI Components:
1. **Agent**: A persona with a specific role, goal, and backstage context (e.g., "Senior Researcher", "Tech Copywriter").
2. **Task**: A specific assignment with clear instructions, expected deliverables, and the assigned agent.
3. **Crew**: The logical container that coordinates how agents communicate, pass information, and execute tasks (sequentially or hierarchically).

```
   ┌────────────────────────────────────────┐
   │                  Crew                  │
   ├──────────────┬──────────────┬──────────┤
   │ Agent A      │ Agent B      │ Agent C  │
   │ (Researcher) │ (Writer)     │ (Editor) │
   └──────┬───────┴──────┬───────┴────┬─────┘
          ▼              ▼            ▼
       Task 1         Task 2       Task 3
     (Collect)      (Synthesize)  (Polish)
```

---

## 4. The Dual-Core Philosophy

Unreal People splits processing into two distinct architectural "Cores":

* **Local Core**: Runs quantized GGUF models via `llama-cpp-python` entirely offline. Perfect for highly private, local data tasks.
* **Cloud Core**: Spawns fast, collaborative Crews via OpenAI/Groq APIs. Perfect for complex multi-agent negotiation loops that would crush local CPU/GPU cores.

---

## 5. Exercises & Self-Guided Challenges

1. **Calculate VRAM Requirements**: Calculate the approximate VRAM required to load a 13-billion parameter model under FP16, Q8 (8-bit), and Q4 (4-bit) quantization.
2. **Build a Local GPU monitor**: In the backend FastAPI application, use python's `subprocess` module to call `nvidia-smi` and parse the current GPU memory usage, sending it to the frontend via a simple `/api/gpu-stats` endpoint.
3. **Design a Two-Agent Research Crew**: Create a python script using `crewai` in the backend that sets up a Research Agent to gather data, and a Synthesizer Agent to format it into a professional markdown summary.
