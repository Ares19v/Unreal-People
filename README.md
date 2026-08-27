<div align="center">

# ? Unreal People
### Dual-Core AI Command Center & Local Hardware Inference Hub

[![CI](https://github.com/Ares19v/Unreal-People/actions/workflows/ci.yml/badge.svg)](https://github.com/Ares19v/Unreal-People/actions/workflows/ci.yml)


[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![NVIDIA CUDA](https://img.shields.io/badge/CUDA-RTX_5060_Ready-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://developer.nvidia.com/cuda-zone)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>High-performance orchestration hub bridging offline hardware-accelerated LLM inference (llama-cpp / LoRA on RTX 5060) and multi-agent cloud swarms (CrewAI / Groq / OpenAI) with real-time audio and avatar telemetry.</b>
</p>

</div>

---

## ?? Overview

**Unreal People** is a dual-core AI command center and agent orchestration platform. Built to balance offline privacy and compute constraints against scalable cloud swarms, it allows developers and researchers to seamlessly dispatch tasks between local GPU-quantized models and cloud agent teams.

### Dual-Core Architecture Philosophy:
1. **Core 1: Local Engine Sandbox (Edge / Offline)**:
   - Powered by quantized GGUF models running locally on NVIDIA RTX GPU hardware via `llama-cpp-python`.
   - Zero external network dependency for confidential code synthesis, local reasoning, and low-latency response generation.
   - Dynamic LoRA adapter injection for specialized domain tasks without reloading base weights.
2. **Core 2: Cloud Agent Swarm (Distributed / Collaborative)**:
   - Multi-agent collaboration pipelines powered by `CrewAI` and high-throughput providers (Groq / OpenAI).
   - Autonomous role division (Researcher, Architect, Code Reviewer, QA) with inter-agent debate and consensus protocols.

---

## ? Key Features

- **Dynamic Hybrid Router**: Automatically routes queries based on sensitivity, offline status, or computational complexity.
- **Hardware Telemetry HUD**: Real-time monitoring of VRAM allocation, GPU core utilization, token generation velocity (tok/sec), and thermals.
- **Agent Swarm Control Room**: Interactive UI displaying active agent thoughts, delegation trees, scratchpads, and live outputs.
- **Audio & Voice Pipeline**: Streaming text-to-speech and speech-to-text integration for vocal agent interactions.
- **3D Avatar & Stream Ready**: WebSocket channels designed to pipe facial action units and animation blend shapes to Unreal Engine Metahuman avatars.
- **One-Click Launch**: Includes batch launch scripts (`LAUNCH_UNREAL.bat`) for automated virtual environment activation and background process daemonization.

---

## ??? System Architecture

```
Unreal-People/
??? backend/                # FastAPI Core & Agent Orchestration Services
?   ??? app/
?   ?   ??? core/           # Config, hardware telemetry & GPU manager
?   ?   ??? engines/        # Local llama-cpp & Cloud CrewAI adapters
?   ?   ??? routers/        # WebSocket streams & REST endpoints
?   ?   ??? services/       # Voice, prompt caching & audio synthesis
?   ??? requirements.txt    # Backend Python dependencies
?   ??? main.py             # Server entry point
??? src/                    # Next.js / React Frontend Application
?   ??? components/         # Mission control HUD, agent visualizers & charts
?   ??? hooks/              # WebSocket hooks & telemetry listeners
?   ??? app/                # App router layout and dashboard views
??? public/                 # Static assets, icons, and 3D UI elements
??? LAUNCH_UNREAL.bat       # Production launch script
??? EVAL.md                 # System benchmark & evaluation report
??? package.json            # Frontend scripts and UI dependencies
```

---

## ?? Getting Started

### Prerequisites
- **Hardware**: NVIDIA GPU recommended (e.g. RTX 3060/4060/5060 or higher with CUDA 12+)
- **Software**: Python 3.10+, Node.js 18+, CUDA Toolkit

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies with CUDA acceleration
pip install -r requirements.txt
```

Configure your `.env` file:
```env
PORT=8000
HOST=0.0.0.0
LOCAL_MODEL_PATH=models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Start the backend:
```bash
python main.py
```

### 2. Frontend Setup

```bash
# In the root directory
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the Command Center.

---

## ?? Automated Launch

For Windows workstations with GPU acceleration configured:
```cmd
LAUNCH_UNREAL.bat
```

---

## ?? License

Distributed under the MIT License. See `LICENSE` for details.

---

© 2026 Devansh Tyagi (Ares19v). All Rights Reserved.
