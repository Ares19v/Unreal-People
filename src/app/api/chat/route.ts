import { NextResponse } from "next/server";
import { queryPinecone, upsertMemory } from "@/utils/ragEngine";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const { messages, agentId, protocol } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // ─── SESSION IDENTITY ───
    const cookieHeader = req.headers.get("cookie") ?? "";
    const sessionMatch = cookieHeader.match(/up_session=([^;]+)/);
    const userId = sessionMatch ? decodeURIComponent(sessionMatch[1]) : null;

    // ─── MEMORY RETRIEVAL ───
    let context = "";
    const hasMemoryKeys = !!process.env.PINECONE_API_KEY && !!process.env.OPENAI_API_KEY;
    if (hasMemoryKeys) {
      context = await queryPinecone(lastMessage, agentId, userId ?? undefined);
    }

    // ─── MCP CONTEXT INJECTION ───
    // Auto-detects backend MCP status — if filesystem access is live, agents get context
    let mcpContext = "";
    try {
      const mcpRes = await fetch(`${BACKEND_URL}/api/status/mcp`, {
        signal: AbortSignal.timeout(800)
      });
      const mcpData = await mcpRes.json();
      if (mcpData.status === "ACTIVE") {
        mcpContext = (
          `\n\n--- MCP FILESYSTEM ACCESS (ACTIVE) ---\n` +
          `You have secure read/write access to the local development environment. ` +
          `Base directory: ${mcpData.base_dir}. ` +
          `You can reference local files and directories to provide grounded, context-aware answers.`
        );
      }
    } catch {
      // Backend offline or MCP unavailable — silently skip
    }

    // ─── CHAIN-OF-THOUGHT SYSTEM PROMPT ───
    let systemPrompt = (
      `You are an exclusive, specialized AI entity. You MUST strictly adhere to your assigned PROTOCOL. ` +
      `Do not break character. Do not introduce yourself as a generic AI.\n\n` +
      `--- CORE PROTOCOL ---\n${protocol}\n\n` +
      `--- REASONING INSTRUCTION (CoT) ---\n` +
      `Before answering, internally reason through the question step by step. ` +
      `Consider multiple angles. Then deliver a precise, in-character response.`
    );

    if (context && context !== "NO_MEMORIES_FOUND" && !context.includes("WARNING")) {
      systemPrompt += (
        `\n\n--- MEMORY: PAST CONVERSATIONS WITH THIS USER ---\n` +
        `You remember the following from previous sessions. ` +
        `Weave this context naturally — do NOT say "I remember" explicitly. Just know it.\n\n${context}`
      );
    }

    if (mcpContext) systemPrompt += mcpContext;

    // ─── LOCAL ENGINE ROUTING ───
    // Transparently checks if a GGUF model is loaded in the Python backend.
    // If yes, route inference there. If no or backend offline, fall back to Groq.
    let reply = "";
    let source = "GROQ";

    try {
      const statusRes = await fetch(`${BACKEND_URL}/api/engine_status`, {
        signal: AbortSignal.timeout(1000)
      });
      const statusData = await statusRes.json();

      if (statusData.loaded) {
        const localRes = await fetch(`${BACKEND_URL}/api/chat_local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            protocol: systemPrompt,
            agent_name: agentId
          }),
          signal: AbortSignal.timeout(120000)
        });

        if (localRes.ok) {
          const localData = await localRes.json();
          reply = localData.reply;
          source = "LOCAL_ENGINE";
        }
      }
    } catch {
      // Backend offline or local engine not loaded — fall through to Groq
    }

    // ─── GROQ FALLBACK ───
    if (!reply) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.7,
        }),
      });

      const groqData = await groqRes.json();
      if (!groqRes.ok) {
        console.error("GROQ API ERROR:", groqData);
        throw new Error("LLM_REJECTED_REQUEST");
      }

      reply = groqData.choices[0].message.content;
      source = "GROQ";
    }

    // ─── MEMORY SAVE (fire-and-forget) ───
    if (hasMemoryKeys && userId) {
      upsertMemory(userId, agentId, "user", lastMessage);
      upsertMemory(userId, agentId, "assistant", reply);
    }

    return NextResponse.json({ reply, source });

  } catch (error) {
    console.error("ENGINE_FAILURE:", error);
    return NextResponse.json({ error: "API_FAILURE" }, { status: 500 });
  }
}
