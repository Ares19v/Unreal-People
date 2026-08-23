from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from dotenv import load_dotenv

# Auto-load backend/.env so API keys are available without manual shell setup
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

from core.crew_engine import execute_api_crew

app = FastAPI(title="Unreal People - Core Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models", "gguf")
LORA_DIR = os.path.join(BASE_DIR, "models", "lora")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LORA_DIR, exist_ok=True)

# --- QUARANTINED LOCAL HARDWARE STATE ---
ACTIVE_LOCAL_MODEL = None
ACTIVE_LOCAL_MODEL_PATH = None
ACTIVE_LORA_PATH = None


# ============================================================
# PYDANTIC MODELS
# ============================================================

class LoadLocalModelRequest(BaseModel):
    model_filename: str
    lora_filename: str = None
    precision: str = "FULL"
    quant_level: str = "Q4"

class CrewApiExecutionRequest(BaseModel):
    team_name: str
    task: str
    agents: list
    api_key: str
    provider: str
    api_model: str

class GraphExecutionRequest(BaseModel):
    team_name: str
    task: str
    agents: list
    api_key: str
    provider: str
    api_model: str

class LocalChatRequest(BaseModel):
    messages: list
    protocol: str
    agent_name: str

class MCPRequest(BaseModel):
    path: str
    content: str = None
    max_chars: int = 8000


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def read_root():
    return {
        "status": "SYSTEM_ONLINE",
        "hardware": "RTX_5060_READY",
        "api": "CLOUD_READY",
        "local_model": ACTIVE_LOCAL_MODEL_PATH or "NO_MODEL_LOADED",
        "lora": ACTIVE_LORA_PATH or "NONE"
    }


# ============================================================
# PAGE 2 — LOCAL ENGINE SANDBOX (QUARANTINED)
# ============================================================

@app.post("/api/upload_model")
async def upload_model(file: UploadFile = File(...), type: str = Form(...)):
    """Upload a GGUF base model or LoRA adapter to disk."""
    try:
        target_dir = LORA_DIR if type == "LORA" else MODELS_DIR
        file_path = os.path.join(target_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        return {
            "status": "SUCCESS",
            "filename": file.filename,
            "type": type,
            "size_mb": round(file_size_mb, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/list_models")
def list_models():
    """List all uploaded GGUF models and LoRA adapters."""
    gguf_files = []
    lora_files = []

    if os.path.exists(MODELS_DIR):
        for f in os.listdir(MODELS_DIR):
            fpath = os.path.join(MODELS_DIR, f)
            gguf_files.append({"name": f, "size_mb": round(os.path.getsize(fpath) / (1024 * 1024), 2)})

    if os.path.exists(LORA_DIR):
        for f in os.listdir(LORA_DIR):
            fpath = os.path.join(LORA_DIR, f)
            lora_files.append({"name": f, "size_mb": round(os.path.getsize(fpath) / (1024 * 1024), 2)})

    return {
        "models": gguf_files,
        "lora_adapters": lora_files,
        "active_model": ACTIVE_LOCAL_MODEL_PATH,
        "active_lora": ACTIVE_LORA_PATH
    }


@app.post("/api/initialize_engine")
async def initialize_engine(request: LoadLocalModelRequest):
    """
    Loads the GGUF model + optional LoRA adapter into RTX 5060 VRAM.
    LoRA/PEFT adapters are injected at load time via llama-cpp-python's native support.
    """
    global ACTIVE_LOCAL_MODEL, ACTIVE_LOCAL_MODEL_PATH, ACTIVE_LORA_PATH

    model_path = os.path.join(MODELS_DIR, request.model_filename)
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model file not found: {request.model_filename}")

    # Resolve LoRA path if provided
    lora_path = None
    if request.lora_filename and request.lora_filename not in ("NONE", "", None):
        candidate = os.path.join(LORA_DIR, request.lora_filename)
        if os.path.exists(candidate):
            lora_path = candidate
            print(f"// [PAGE_2] -> LORA ADAPTER FOUND: {request.lora_filename}")
        else:
            print(f"// [PAGE_2] -> WARNING: LoRA file not found: {request.lora_filename} — loading base model only.")

    try:
        from llama_cpp import Llama

        # Evict previous model from VRAM
        if ACTIVE_LOCAL_MODEL is not None:
            print("// [PAGE_2] -> EVICTING PREVIOUS MODEL FROM VRAM")
            del ACTIVE_LOCAL_MODEL
            ACTIVE_LOCAL_MODEL = None
            ACTIVE_LOCAL_MODEL_PATH = None
            ACTIVE_LORA_PATH = None

        print(f"\n// [PAGE_2_ISOLATION] -> LOADING INTO RTX 5060 VRAM: {request.model_filename}")
        if lora_path:
            print(f"// [PAGE_2_ISOLATION] -> INJECTING LORA ADAPTER (PEFT): {request.lora_filename}")

        ACTIVE_LOCAL_MODEL = Llama(
            model_path=model_path,
            lora_path=lora_path,        # LoRA/PEFT injection — None = base model only
            lora_scale=1.0,             # Full adapter strength (tune this if needed)
            n_gpu_layers=-1,            # Offload all layers to RTX 5060
            n_ctx=4096,
            chat_format="chatml",
            verbose=False
        )

        ACTIVE_LOCAL_MODEL_PATH = request.model_filename
        ACTIVE_LORA_PATH = request.lora_filename if lora_path else None

        print(f"// [PAGE_2_ISOLATION] -> ENGINE ONLINE: {request.model_filename}" +
              (f" + {request.lora_filename}" if lora_path else ""))

        return {
            "status": "ENGINE_INITIALIZED",
            "model": request.model_filename,
            "lora": ACTIVE_LORA_PATH or "NONE",
            "gpu_layers": -1,
            "context_size": 4096
        }

    except Exception as e:
        ACTIVE_LOCAL_MODEL = None
        ACTIVE_LOCAL_MODEL_PATH = None
        ACTIVE_LORA_PATH = None
        raise HTTPException(status_code=500, detail=f"LOAD_FAILURE: {str(e)}")


@app.post("/api/chat_local")
async def chat_local(request: LocalChatRequest):
    """Run inference on the locally loaded GGUF model (with optional LoRA)."""
    global ACTIVE_LOCAL_MODEL

    if ACTIVE_LOCAL_MODEL is None:
        raise HTTPException(status_code=503, detail="NO_LOCAL_MODEL: Initialize engine first.")

    try:
        system_message = (
            f"You are an exclusive, specialized AI entity. You MUST strictly adhere to your assigned PROTOCOL. "
            f"Do not break character.\n\n"
            f"--- CORE PROTOCOL ---\n{request.protocol}\n\n"
            f"--- REASONING INSTRUCTION ---\n"
            f"Before answering, internally reason through the question step by step. "
            f"Then provide your final response, in character."
        )

        llm_messages = [{"role": "system", "content": system_message}]
        for msg in request.messages:
            llm_messages.append({"role": msg["role"], "content": msg["content"]})

        response = ACTIVE_LOCAL_MODEL.create_chat_completion(
            messages=llm_messages,
            temperature=0.7,
            max_tokens=1024,
            stop=["<|im_end|>", "</s>"]
        )

        reply = response["choices"][0]["message"]["content"]
        return {
            "reply": reply,
            "source": "LOCAL_ENGINE",
            "model": ACTIVE_LOCAL_MODEL_PATH,
            "lora": ACTIVE_LORA_PATH or "NONE"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"INFERENCE_FAILURE: {str(e)}")


@app.get("/api/engine_status")
def engine_status():
    return {
        "loaded": ACTIVE_LOCAL_MODEL is not None,
        "model": ACTIVE_LOCAL_MODEL_PATH or "NONE",
        "lora": ACTIVE_LORA_PATH or "NONE"
    }


# ============================================================
# PAGE 3 — CLOUD CrewAI ORCHESTRATION (SEQUENTIAL)
# ============================================================

@app.post("/api/execute_crew")
async def execute_crew(request: CrewApiExecutionRequest):
    if not request.api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED")
    try:
        final_result = execute_api_crew(
            team_name=request.team_name,
            task_description=request.task,
            agents_data=request.agents,
            api_key=request.api_key,
            provider=request.provider,
            api_model=request.api_model
        )
        return {"status": "SUCCESS", "result": final_result, "mode": "SEQUENTIAL"}
    except Exception as e:
        print(f"// [FATAL ERROR] -> CREW CRASHED: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# PAGE 3 — LANGGRAPH ORCHESTRATION (CONDITIONAL / NON-LINEAR)
# ============================================================

@app.post("/api/execute_graph")
async def execute_graph(request: GraphExecutionRequest):
    """
    LangGraph-powered agent workflow. Supports conditional branching and loops —
    unlike CrewAI's fixed sequential flow.
    """
    if not request.api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED")
    try:
        from core.graph_engine import execute_graph_crew
        final_result = execute_graph_crew(
            team_name=request.team_name,
            task_description=request.task,
            agents_data=request.agents,
            api_key=request.api_key,
            provider=request.provider,
            api_model=request.api_model
        )
        return {"status": "SUCCESS", "result": final_result, "mode": "GRAPH"}
    except Exception as e:
        print(f"// [FATAL ERROR] -> GRAPH CRASHED: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# STATUS ENDPOINTS — For Peripheral Panel
# ============================================================

@app.get("/api/status/pinecone")
async def status_pinecone(api_key: str = None):
    key = api_key or os.environ.get("PINECONE_API_KEY")
    if not key:
        return {"status": "OFFLINE", "reason": "NO_API_KEY"}
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=key)
        index = pc.index("unreal-memory")
        stats = index.describe_index_stats()
        return {
            "status": "CONNECTED",
            "vectors": stats.total_vector_count if hasattr(stats, 'total_vector_count') else 0,
            "namespaces": len(stats.namespaces) if hasattr(stats, 'namespaces') and stats.namespaces else 0,
            "dimension": stats.dimension if hasattr(stats, 'dimension') else 1024
        }
    except Exception as e:
        return {"status": "OFFLINE", "reason": str(e)}


@app.get("/api/status/mcp")
async def status_mcp():
    try:
        test_path = os.path.join(BASE_DIR, ".mcp_probe")
        with open(test_path, "w") as f:
            f.write("MCP_PROBE_OK")
        with open(test_path, "r") as f:
            content = f.read()
        os.remove(test_path)
        if content == "MCP_PROBE_OK":
            return {"status": "ACTIVE", "filesystem": "READ_WRITE_OK", "base_dir": BASE_DIR}
        return {"status": "DEGRADED"}
    except Exception as e:
        return {"status": "OFFLINE", "reason": str(e)}


# ============================================================
# MCP — Filesystem Access Endpoints (for Agents)
# ============================================================

@app.post("/api/mcp/read_file")
async def mcp_read_file(request: MCPRequest):
    """Read a file's contents. Safety-restricted to prevent system file access."""
    try:
        resolved = os.path.realpath(request.path)
        blocked_prefixes = ["C:\\Windows", "C:\\System32", "/etc/shadow", "/proc", "/sys"]
        if any(resolved.lower().startswith(b.lower()) for b in blocked_prefixes):
            raise HTTPException(status_code=403, detail="ACCESS_DENIED: System path blocked.")
        if not os.path.exists(resolved):
            return {"status": "NOT_FOUND", "path": resolved}
        if not os.path.isfile(resolved):
            return {"status": "NOT_A_FILE", "path": resolved}
        with open(resolved, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(request.max_chars)
        return {
            "status": "SUCCESS",
            "path": resolved,
            "content": content,
            "truncated": len(content) >= request.max_chars
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "ERROR", "reason": str(e)}


@app.post("/api/mcp/list_dir")
async def mcp_list_dir(request: MCPRequest):
    """List files and subdirectories at a given path."""
    try:
        resolved = os.path.realpath(request.path)
        if not os.path.isdir(resolved):
            return {"status": "NOT_A_DIRECTORY", "path": resolved}
        entries = []
        for entry in os.scandir(resolved):
            entries.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size_bytes": entry.stat().st_size if entry.is_file() else None
            })
        entries.sort(key=lambda x: (not x["is_dir"], x["name"]))
        return {"status": "SUCCESS", "path": resolved, "entries": entries[:150]}
    except Exception as e:
        return {"status": "ERROR", "reason": str(e)}


@app.post("/api/mcp/write_file")
async def mcp_write_file(request: MCPRequest):
    """Write content to a file. Creates parent directories if needed."""
    try:
        if not request.content:
            raise HTTPException(status_code=400, detail="NO_CONTENT_PROVIDED")
        resolved = os.path.realpath(request.path)
        blocked_prefixes = ["C:\\Windows", "C:\\System32", "/etc", "/sys"]
        if any(resolved.lower().startswith(b.lower()) for b in blocked_prefixes):
            raise HTTPException(status_code=403, detail="ACCESS_DENIED: System path blocked.")
        parent = os.path.dirname(resolved)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(resolved, "w", encoding="utf-8") as f:
            f.write(request.content)
        return {
            "status": "SUCCESS",
            "path": resolved,
            "bytes_written": len(request.content.encode("utf-8"))
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "ERROR", "reason": str(e)}


# ============================================================
# PDF PARSING — Server Side
# ============================================================

@app.post("/api/parse_pdf")
async def parse_pdf(file: UploadFile = File(...)):
    try:
        import pdfplumber
        import io
        content = await file.read()
        text_output = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_output.append(page_text)
        extracted_text = "\n\n".join(text_output)
        if not extracted_text.strip():
            return {"status": "EMPTY", "text": "", "pages": 0}
        return {"status": "SUCCESS", "text": extracted_text, "pages": len(text_output)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF_PARSE_FAILURE: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
