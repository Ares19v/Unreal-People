import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId, protocol } = await req.json();
    const userMessage = messages[messages.length - 1].content;
    const host = "https://unreal-memory-gui16s2.svc.aped-4627-b74a.pinecone.io";
    const apiKey = process.env.PINECONE_API_KEY!;

    // 1. DYNAMIC PERSONALITY FROM PROTOCOL
    const systemInstruction = `You are an AI agent with the following identity protocol: ${protocol || "General Assistant"}. 
    Maintain this personality strictly. Use the provided user context to personalize your response.`;

    // 2. SEARCH MEMORY
    let pastContext = "";
    try {
      const queryRes = await fetch(`${host}/query`, {
        method: "POST",
        headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ topK: 5, data: userMessage, includeMetadata: true, filter: { agentId: { "$eq": agentId } } })
      });
      const queryData = await queryRes.json();
      pastContext = queryData.matches?.map((m: any) => m.metadata?.text).join(" | ") || "";
    } catch (e) { console.log("Memory empty."); }

    // 3. GENERATE WITH DYNAMIC PROTOCOL
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `${systemInstruction}\n\nUSER_HISTORY: ${pastContext}` },
          ...messages
        ]
      })
    });
    const groqData = await groqRes.json();
    const aiReply = groqData.choices[0].message.content;

    // 4. STORE
    fetch(`${host}/vectors/upsert`, {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: [{ id: "m-" + Date.now(), metadata: { text: userMessage, agentId }, data: userMessage }]
      })
    });

    return NextResponse.json({ reply: aiReply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
