import { NextResponse } from "next/server";
import { queryPinecone } from "@/utils/ragEngine";

export async function POST(req: Request) {
  try {
    const { messages, agentId, protocol } = await req.json();
    const lastMessage = messages[messages.length - 1].content;
    let context = "";

    // 1. RAG INTERCEPT FOR KACIM ONLY
    if (agentId === "Kacim") {
      context = await queryPinecone(lastMessage);
    }

    // 2. STRICT PERSONALITY ENFORCEMENT WRAPPER
    let systemPrompt = `You are an exclusive, specialized AI entity. You MUST strictly adhere to your assigned PROTOCOL. Do not break character. Do not introduce yourself as a generic AI. Embody the traits, tone, and knowledge base defined below.\n\n--- CORE PROTOCOL ---\n${protocol}`;
    
    // Only inject context if it exists (prevents confusing non-RAG agents)
    if (context && context !== "NO_MEMORIES_FOUND" && !context.includes("WARNING")) {
      systemPrompt += `\n\n--- CRITICAL MEMORY / RAG CONTEXT ---\nUse the following retrieved data to inform your response. Do not explicitly state that you are reading from a database, just weave the knowledge naturally into your personality.\n\n${context}`;
    }

    // 3. CORE LLM ENGINE
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.7, // Adds a slight bit of creativity to help them roleplay
      }),
    });

    const groqData = await groqRes.json();
    
    if (!groqRes.ok) {
      console.error("GROQ API ERROR:", groqData);
      throw new Error("LLM_REJECTED_REQUEST");
    }

    return NextResponse.json({ reply: groqData.choices[0].message.content });

  } catch (error) {
    console.error("ENGINE_FAILURE:", error);
    return NextResponse.json({ error: "API_FAILURE" }, { status: 500 });
  }
}
