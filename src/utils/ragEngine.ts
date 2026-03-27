import { Pinecone } from "@pinecone-database/pinecone";

export const queryPinecone = async (queryText: string) => {
  if (!process.env.PINECONE_API_KEY) return "WARNING: PINECONE_API_KEY MISSING";
  
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index("unreal-memory");

  try {
    // Generate Embedding (Adjusting to 1024 to match your terminal error)
    const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: queryText, model: "text-embedding-3-small", dimensions: 1024 }) 
    });
    
    const embedData = await embedRes.json();
    if (!embedData.data) return "WARNING: EMBEDDING_FAILED";
    
    const vector = embedData.data[0].embedding;

    // Query DB
    const queryResponse = await index.query({ vector: vector, topK: 3, includeMetadata: true });
    return queryResponse.matches?.map(m => m.metadata?.text).join("\n") || "NO_MEMORIES_FOUND";
  } catch (err) {
    console.error("RAG Engine Error:", err);
    return "WARNING: RAG_SYSTEM_OFFLINE";
  }
};
