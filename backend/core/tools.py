"""
backend/core/tools.py
─────────────────────
Real callable tools for agent execution.
Plain Python functions — no SDK required.
Agents call these during their ReAct loops to actually DO things.
"""
import os
import json
import subprocess
from pathlib import Path

# Base workspace directory — agents read/write relative to this
BASE_DIR = Path(__file__).parent.parent  # points to backend/


# ─── FILE SYSTEM ──────────────────────────────────────────────────────────────

def read_file(path: str) -> str:
    """Read the contents of a file. Path is relative to the project backend directory."""
    try:
        full = BASE_DIR / path
        if not full.exists():
            return f"ERROR: File not found → {path}"
        if full.is_dir():
            return f"ERROR: {path} is a directory, not a file. Use list_directory instead."
        text = full.read_text(encoding="utf-8", errors="replace")
        if len(text) > 8000:
            return text[:8000] + f"\n\n... [TRUNCATED — {len(text)} total chars]"
        return text
    except Exception as e:
        return f"ERROR: {e}"


def write_file(path: str, content: str) -> str:
    """Write content to a file. Creates parent directories if needed."""
    try:
        full = BASE_DIR / path
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(content, encoding="utf-8")
        return f"FILE_WRITTEN_OK → {path} ({len(content)} chars written)"
    except Exception as e:
        return f"ERROR: {e}"


def list_directory(path: str = ".") -> str:
    """List the files and folders inside a directory."""
    try:
        full = BASE_DIR / path
        if not full.exists():
            return f"ERROR: Directory not found → {path}"
        if not full.is_dir():
            return f"ERROR: {path} is a file, not a directory."
        items = sorted(full.iterdir())
        lines = []
        for p in items:
            tag = "[DIR] " if p.is_dir() else "[FILE]"
            size = f"  ({p.stat().st_size} B)" if p.is_file() else ""
            lines.append(f"{tag} {p.name}{size}")
        return "\n".join(lines) if lines else "EMPTY_DIRECTORY"
    except Exception as e:
        return f"ERROR: {e}"


# ─── WEB SEARCH ───────────────────────────────────────────────────────────────

def web_search(query: str, max_results: int = 5) -> str:
    """Search the web using DuckDuckGo. Returns titles, URLs, and snippets."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return "NO_RESULTS_FOUND"
        lines = []
        for i, r in enumerate(results, 1):
            lines.append(
                f"[{i}] {r.get('title', 'No Title')}\n"
                f"    URL: {r.get('href', '')}\n"
                f"    {r.get('body', '')[:300]}"
            )
        return "\n\n".join(lines)
    except Exception as e:
        return f"ERROR: {e}"


# ─── CODE EXECUTION ───────────────────────────────────────────────────────────

def run_python(code: str) -> str:
    """Execute a Python code snippet in a subprocess sandbox. 10 second timeout."""
    try:
        result = subprocess.run(
            ["python", "-c", code],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(BASE_DIR)
        )
        parts = []
        if result.stdout.strip():
            parts.append(f"STDOUT:\n{result.stdout.strip()}")
        if result.stderr.strip():
            parts.append(f"STDERR:\n{result.stderr.strip()}")
        if result.returncode != 0:
            parts.append(f"EXIT_CODE: {result.returncode}")
        return "\n".join(parts) if parts else "OK (no output)"
    except subprocess.TimeoutExpired:
        return "ERROR: Execution timed out (10s limit exceeded)"
    except Exception as e:
        return f"ERROR: {e}"


# ─── TOOL REGISTRY ─────────────────────────────────────────────────────────────
# Maps tool name → (function, description, arg schema)

TOOL_REGISTRY = {
    "read_file": {
        "fn": read_file,
        "description": "Read the contents of a file at the given path.",
        "args": {"path": "string — path to file, relative to backend directory"}
    },
    "write_file": {
        "fn": write_file,
        "description": "Write content to a file. Creates parent directories if needed.",
        "args": {"path": "string — file path", "content": "string — content to write"}
    },
    "list_directory": {
        "fn": list_directory,
        "description": "List files and folders in a directory.",
        "args": {"path": "string — directory path (default '.')"}
    },
    "web_search": {
        "fn": web_search,
        "description": "Search the web using DuckDuckGo. Returns titles, URLs, and snippets.",
        "args": {"query": "string — the search query", "max_results": "int — number of results (default 5)"}
    },
    "run_python": {
        "fn": run_python,
        "description": "Execute a Python code snippet in a sandboxed subprocess. Returns stdout/stderr.",
        "args": {"code": "string — valid Python code to execute"}
    }
}


def execute_tool(name: str, args: dict) -> str:
    """Execute a tool by name with given args. Returns string result."""
    if name not in TOOL_REGISTRY:
        available = ", ".join(TOOL_REGISTRY.keys())
        return f"ERROR: Unknown tool '{name}'. Available: {available}"
    try:
        fn = TOOL_REGISTRY[name]["fn"]
        return fn(**args)
    except TypeError as e:
        return f"ERROR: Bad arguments for tool '{name}': {e}"
    except Exception as e:
        return f"ERROR: Tool '{name}' failed: {e}"


def get_tool_descriptions() -> str:
    """Return a formatted string of all available tools for injection into prompts."""
    lines = ["AVAILABLE TOOLS:"]
    for name, info in TOOL_REGISTRY.items():
        args_str = ", ".join(f"{k}: {v}" for k, v in info["args"].items())
        lines.append(f"  - {name}({args_str})\n    → {info['description']}")
    return "\n".join(lines)
