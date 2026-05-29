# EVAL — Unreal People

> **Evaluation Date:** 2026-05-29
> **Evaluator:** Automated Portfolio Review
> **Maturity Level:** MVP / Prototype (Dual-Core AI Command Center)

---

## 1. Project Purpose & Problem Statement

Unreal People is a high-performance orchestration hub designed to bridge the gap between offline hardware inference and cloud multi-agent orchestration. Operating with a "Dual-Core" design philosophy, it allows users to utilize secure, offline quantized models (`llama-cpp-python` with LoRA injection) on local hardware (e.g. an RTX 5060 GPU) while simultaneously leveraging enterprise cloud agent teams (`CrewAI` powered by Groq/OpenAI) for fast multi-agent autonomous negotiation tasks.

It targets computer vision engineers, ML developers, and AI researchers who need an integrated UI/UX shell to control and balance on-device computation limits against collaborative cloud agent swarm execution.

---

## 2. Technical Architecture

The architecture consists of a Next.js (React + TypeScript) front-end communicating with a FastAPI backend:

- **Core 1 — Local Engine Sandbox (`llama-cpp-python`):**
  - Physically isolated processing path.
  - Loads GGUF quantized models directly to local VRAM.
  - Supports dynamic LoRA adapter loading and configuration for customized on-premise tasks.
- **Core 2 — Cloud API Engine (`CrewAI` + `LangChain`):**
  - Runs multi-agent autonomous loops utilizing high-speed cloud providers (Groq/OpenAI).
  - Dynamically builds CrewAI configurations (Agents, Tasks) via client JSON schemas.
  - Employs System Message Injection to inject custom agent personas (Name, Role, Context) into system prompts.
- **Frontend Command Center (Next.js):**
  - Built with a high-fidelity "cinematic" terminal UI utilizing Tailwind CSS.
  - Features real-time state panels for monitoring active GPU/VRAM loads and API latency loops.

---

## 3. Strengths

- **Slick Cinematic Interface:** High-fidelity sci-fi developer dashboard terminal aesthetics, featuring detailed scroll behaviors and responsive state visuals.
- **Dual-Core Architecture:** Excellent conceptual decoupling of local sandboxed offline execution from collaborative cloud swarms, protecting raw GPU memory structures.
- **Quantized GGUF & LoRA Support:** Integrates real on-device model mechanics by mapping GGUF buffers and LoRA fine-tuning paths directly in Python.
- **Dynamic CrewAI Teams:** Allows building custom multi-agent Crews (assigning tasks, roles, and descriptions dynamically) via the web UI.

---

## 4. Limitations & Known Gaps

- **VRAM Leak Risks in Llama.cpp:** Programmatic loading and reloading of multiple GGUF/LoRA weights inside the same backend process can occasionally trigger CUDA memory fragmentation and VRAM retention issues if not garbage collected aggressively.
- **Synchronous Agent Blocking:** If a CrewAI run takes several minutes, it may block backend response paths if not executed within background tasks or WebSocket-streamed contexts.
- **No Local GPU Telemetry Ingest:** The visual GPU/VRAM bars on the frontend are primarily simulated metrics; there is no live integration with NVIDIA System Management Interface (`nvidia-smi`) APIs.

---

## 5. Code Quality Assessment

- **Modular Separation:** Strong division between the frontend Next.js pages and backend FastAPI directories.
- **Clean API Spec:** Includes clear, dedicated API reference guides (`docs/API_REFERENCE.md`).

---

## 6. Maturity Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Functionality | 7.5/10 | Dual-core engine conceptualization is functional, but lacks production telemetry binding. |
| Code Quality | 8/10 | Solid next.js structures, clean layout styles, and robust CrewAI schema builds. |
| Documentation | 8/10 | Outlines architecture and API routes in dedicated docs files. |
| Scalability | 6.5/10 | Local hardware constraints and potential VRAM fragmentation under heavy GGUF hot-swapping. |
| Security | 8/10 | quarantine model isolates local GPU context from public internet layers. |
| **Overall** | **7.6/10** | **Highly futuristic and impressive dashboard.** Excellent proof of concept for local-plus-cloud AI workflows. |

---

## 7. Suggested Next Steps

1. **Integrate Live NVML Telemetry:** Leverage the PyNVML library (`nvidia-ml-py3`) in FastAPI to fetch actual live GPU temperature, clock speeds, and VRAM utilization from `nvidia-smi` and stream them to the Next.js UI via WebSockets.
2. **Asynchronous Celery Crew Executions:** Offload multi-agent CrewAI runs onto async task queues (e.g. Celery + Redis) to prevent blocking the FastAPI server event loop during long-running reasoning loops.
3. **Strict CUDA Cache Flushing:** Implement explicit PyTorch/CUDA cache eviction routines (`torch.cuda.empty_cache()` and manual garbage collection) during model swap operations to mitigate VRAM fragmentation.

---

<p align="center">Made by Devansh Tyagi @ 2026</p>
