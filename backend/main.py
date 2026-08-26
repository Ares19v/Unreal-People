from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import threading
import queue
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


# ============================================================
# PYDANTIC MODELS
# ============================================================

class CrewApiExecutionRequest(BaseModel):
    team_name: str
    task: str
    agents: list
    api_key: str = ""
    provider: str = "GROQ"
    api_model: str = "qwen/qwen3.8-27b"

class GraphExecutionRequest(BaseModel):
    team_name: str
    task: str
    agents: list
    api_key: str = ""
    provider: str = "GROQ"
    api_model: str = "qwen/qwen3.8-27b"
    mode: str = "supervisor"  # "sequential" | "supervisor"

class ChatApiRequest(BaseModel):
    messages: list
    agentId: str
    protocol: str = "You are a helpful AI."
    userId: str = None

class MCPRequest(BaseModel):
    path: str
    content: str = None
    max_chars: int = 8000


# ============================================================
# ROOT
# ============================================================

@app.get("/")
@app.get("/health")
def read_root():
    return {
        "status": "SYSTEM_ONLINE",
        "orchestrator": "LANGGRAPH_READY",
        "api": "CLOUD_READY",
        "mcp": "CONNECTED"
    }



@app.post("/api/chat")
async def chat_unified(request: ChatApiRequest):
    """
    Unified chat route:
    Routes to high-speed Cloud LLM (Groq) with MCP & RAG memory context.
    """
    last_msg = request.messages[-1]["content"] if request.messages else ""

    # 1. MCP Context Detection
    mcp_context = ""
    try:
        if os.path.exists(BASE_DIR):
            mcp_context = (
                f"\n\n--- MCP FILESYSTEM ACCESS (ACTIVE) ---\n"
                f"You have secure read/write access to the local development environment. "
                f"Base directory: {BASE_DIR}. "
                f"You can reference local files and directories to provide grounded, context-aware answers."
            )
    except Exception:
        pass

    # 2. RAG Memory Context via Pinecone
    rag_context = ""
    pinecone_key = os.environ.get("PINECONE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if pinecone_key and openai_key and last_msg:
        try:
            import urllib.request
            import json
            req = urllib.request.Request(
                "https://api.openai.com/v1/embeddings",
                data=json.dumps({
                    "input": last_msg,
                    "model": "text-embedding-3-small",
                    "dimensions": 1024
                }).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                emb_data = json.loads(resp.read().decode("utf-8"))
                vector = emb_data["data"][0]["embedding"]

                from pinecone import Pinecone
                pc = Pinecone(api_key=pinecone_key)
                ns_name = f"user_{request.userId}" if request.userId else "user_default"
                index = pc.index("unreal-memory").namespace(ns_name)
                res = index.query(vector=vector, top_k=5, include_metadata=True, filter={"agentId": {"$eq": request.agentId}})
                if res.matches:
                    mem_lines = [f"[{m.metadata.get('role', 'USER').upper()}]: {m.metadata.get('content', '')}" for m in res.matches if m.score > 0.5]
                    if mem_lines:
                        rag_context = "\n\n--- MEMORY: PAST CONVERSATIONS ---\n" + "\n".join(mem_lines)
        except Exception:
            pass

    # 3. System Prompt Synthesis (CoT)
    system_prompt = (
        f"You are an exclusive, specialized AI entity. You MUST strictly adhere to your assigned PROTOCOL. "
        f"Do not break character. Do not introduce yourself as a generic AI.\n\n"
        f"--- CORE PROTOCOL ---\n{request.protocol}\n\n"
        f"--- REASONING INSTRUCTION (CoT) ---\n"
        f"Before answering, internally reason through the question step by step. "
        f"Consider multiple angles. Then deliver a precise, in-character response."
    )
    if rag_context:
        system_prompt += rag_context
    if mcp_context:
        system_prompt += mcp_context

    # 4. Cloud Groq Inference
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY missing in backend/.env")

    try:
        import urllib.request
        import json
        model_name = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
        payload = {
            "model": model_name,
            "messages": [{"role": "system", "content": system_prompt}] + request.messages,
            "temperature": 0.7
        }
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
                "User-Agent": "Unreal-People-Engine/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            reply = data["choices"][0]["message"]["content"]
            return {"reply": reply, "source": "GROQ", "model": model_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM_REQUEST_FAILED: {str(e)}")


# ============================================================
# CREWAI ORCHESTRATION (SEQUENTIAL)
# ============================================================

@app.post("/api/execute_crew")
async def execute_crew(request: CrewApiExecutionRequest):
    api_key = request.api_key or os.environ.get(f"{request.provider}_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED")
    try:
        final_result = execute_api_crew(
            team_name=request.team_name,
            task_description=request.task,
            agents_data=request.agents,
            api_key=api_key,
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
    api_key = request.api_key or os.environ.get(f"{request.provider}_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED")
    try:
        from core.graph_engine import execute_graph_crew
        final_result = execute_graph_crew(
            team_name=request.team_name,
            task_description=request.task,
            agents_data=request.agents,
            api_key=api_key,
            provider=request.provider,
            api_model=request.api_model,
            mode=request.mode
        )
        return {"status": "SUCCESS", "result": final_result, "mode": "GRAPH"}
    except Exception as e:
        print(f"// [FATAL ERROR] -> GRAPH CRASHED: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# SSE STREAMING ENDPOINT — Real-time execution trace
# ============================================================

@app.post("/api/execute_stream")
async def execute_stream(request: GraphExecutionRequest):
    """
    Streaming version of /api/execute_graph.
    Returns Server-Sent Events (SSE) — each event is a JSON object describing
    what is happening in real-time: supervisor_start, agent_start, tool_call,
    tool_result, agent_complete, task_complete.

    Frontend connects via EventSource or fetch with ReadableStream.
    """
    api_key = request.api_key or os.environ.get(f"{request.provider}_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="NO_API_KEY")
    if not request.agents:
        raise HTTPException(status_code=400, detail="NO_AGENTS_ASSIGNED")

    # Thread-safe queue — graph pushes events here, SSE generator reads them
    event_q = queue.Queue()

    def run_graph_in_thread():
        try:
            from core.graph_engine import execute_graph_crew
            execute_graph_crew(
                team_name=request.team_name,
                task_description=request.task,
                agents_data=request.agents,
                api_key=api_key,
                provider=request.provider,
                api_model=request.api_model,
                mode=request.mode,
                event_queue=event_q
            )
        except Exception as e:
            error_payload = json.dumps({"type": "error", "message": str(e)})
            event_q.put(error_payload)
            event_q.put(None)  # sentinel

    # Start graph execution in background thread
    t = threading.Thread(target=run_graph_in_thread, daemon=True)
    t.start()

    def sse_generator():
        while True:
            try:
                item = event_q.get(timeout=120)  # 2 min max wait per event
            except queue.Empty:
                yield "data: " + json.dumps({"type": "error", "message": "TIMEOUT"}) + "\n\n"
                break

            if item is None:
                # Sentinel — execution complete
                yield "data: " + json.dumps({"type": "stream_end"}) + "\n\n"
                break

            yield f"data: {item}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ============================================================
# MCP REGISTRY — Exposes connected MCP servers and their tools
# ============================================================

@app.get("/api/mcp/registry")
async def mcp_registry():
    """
    Returns the list of all known MCP servers, their connection status,
    and the tools they expose. Used by the frontend MCP panel.
    """
    from core.tools import TOOL_REGISTRY

    local_tools = [
        {
            "name": name,
            "description": info["description"],
            "args": info["args"]
        }
        for name, info in TOOL_REGISTRY.items()
    ]

    registry = [
        {
            "id": "local_filesystem",
            "name": "LOCAL FILESYSTEM",
            "status": "ACTIVE",
            "description": "Read, write, and list files on the server filesystem.",
            "tools": [t for t in local_tools if t["name"] in ("read_file", "write_file", "list_directory")]
        },
        {
            "id": "web_search",
            "name": "WEB SEARCH",
            "status": "ACTIVE",
            "description": "DuckDuckGo web search — no API key required.",
            "tools": [t for t in local_tools if t["name"] == "web_search"]
        },
        {
            "id": "python_runtime",
            "name": "PYTHON RUNTIME",
            "status": "ACTIVE",
            "description": "Execute Python code in a sandboxed subprocess.",
            "tools": [t for t in local_tools if t["name"] == "run_python"]
        },
        {
            "id": "pinecone",
            "name": "PINECONE MEMORY",
            "status": "ACTIVE" if os.environ.get("PINECONE_API_KEY") else "OFFLINE",
            "description": "Vector database — agent long-term memory and RAG context.",
            "tools": [
                {"name": "query_memory", "description": "Query relevant past memories", "args": {"query": "string", "top_k": "int"}},
                {"name": "store_memory", "description": "Store agent output to memory", "args": {"content": "string", "agent_id": "string"}}
            ]
        },
        {
            "id": "groq_cloud",
            "name": "GROQ CLOUD",
            "status": "ACTIVE" if os.environ.get("GROQ_API_KEY") else "OFFLINE",
            "description": "Fast cloud LLM inference via Groq API.",
            "tools": [
                {"name": "cloud_inference", "description": "Route to Groq LLM", "args": {"model": "string", "messages": "array"}}
            ]
        }
    ]

    return {
        "status": "OK",
        "mcp_count": len(registry),
        "active_count": sum(1 for r in registry if r["status"] == "ACTIVE"),
        "registry": registry
    }



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
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
