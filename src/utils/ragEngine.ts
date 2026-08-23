import { Pinecone } from "@pinecone-database/pinecone";

// ─────────────────────────────────────────────
// IN-MEMORY PROMPT CACHE
// Avoids redundant Pinecone + OpenAI embedding calls for similar recent queries.
// Cache key = userId + agentId + truncated query. TTL = 5 minutes.
// ─────────────────────────────────────────────
const ragCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (queryText: string, agentId: string, userId?: string): string => {
  // Use first 60 chars of query as cache key — precise enough for semantic dedup
  const querySlug = queryText.slice(0, 60).replace(/\s+/g, "_").toLowerCase();
  return `${userId ?? "anon"}::${agentId}::${querySlug}`;
};

const getCached = (key: string): string | null => {
  const cached = ragCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    ragCache.delete(key);
    return null;
  }
  return cached.result;
};

const setCache = (key: string, result: string) => {
  // Prevent unbounded memory growth — cap at 200 entries
  if (ragCache.size >= 200) {
    const firstKey = ragCache.keys().next().value;
    if (firstKey) ragCache.delete(firstKey);
  }
  ragCache.set(key, { result, timestamp: Date.now() });
};

// ─────────────────────────────────────────────
// SHARED EMBEDDING GENERATOR
// ─────────────────────────────────────────────
const generateEmbedding = async (text: string): Promise<number[] | null> => {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
        dimensions: 1024    // Matches your Pinecone index
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
};

const getUserNamespace = (userId: string) => `user_${userId}`;

// ─────────────────────────────────────────────
// UPSERT MEMORY
// Saves a conversation turn to Pinecone (fire and forget).
// ─────────────────────────────────────────────
export const upsertMemory = async (
  userId: string,
  agentId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> => {
  if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) return;
  if (!content.trim() || content.length < 10) return;

  try {
    const vector = await generateEmbedding(content);
    if (!vector) return;

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const ns = pc.index("unreal-memory").namespace(getUserNamespace(userId));

    const id = `${agentId}_${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await ns.upsert([{
      id,
      values: vector,
      metadata: { userId, agentId, role, content, timestamp: new Date().toISOString() }
    }]);

  } catch (err) {
    console.error("Memory upsert failed (non-blocking):", err);
  }
};

// ─────────────────────────────────────────────
// QUERY PINECONE — WITH CACHE
// Returns relevant past conversations formatted for system prompt injection.
// ─────────────────────────────────────────────
export const queryPinecone = async (
  queryText: string,
  agentId: string,
  userId?: string
): Promise<string> => {
  if (!process.env.PINECONE_API_KEY) return "WARNING: PINECONE_API_KEY MISSING";
  if (!process.env.OPENAI_API_KEY) return "WARNING: OPENAI_API_KEY MISSING";

  // Check cache first
  const cacheKey = getCacheKey(queryText, agentId, userId);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[RAG] Cache hit for ${cacheKey}`);
    return cached;
  }

  try {
    const vector = await generateEmbedding(queryText);
    if (!vector) return "WARNING: EMBEDDING_FAILED";

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    const index = userId
      ? pc.index("unreal-memory").namespace(getUserNamespace(userId))
      : pc.index("unreal-memory");

    const queryResponse = await index.query({
      vector,
      topK: 8,
      includeMetadata: true,
      filter: { agentId: { "$eq": agentId } }
    });

    if (!queryResponse.matches?.length) {
      setCache(cacheKey, "NO_MEMORIES_FOUND");
      return "NO_MEMORIES_FOUND";
    }

    const memories = queryResponse.matches
      .filter(m => (m.score ?? 0) > 0.5)
      .map(m => {
        const role = (m.metadata?.role as string ?? "").toUpperCase();
        const content = m.metadata?.content as string;
        const timestamp = m.metadata?.timestamp as string;
        const dateStr = timestamp
          ? new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "past";
        return `[${role} — ${dateStr}]: ${content}`;
      })
      .filter(Boolean)
      .join("\n");

    const result = memories || "NO_MEMORIES_FOUND";
    setCache(cacheKey, result);
    return result;

  } catch (err) {
    console.error("RAG Engine Error:", err);
    return "WARNING: RAG_SYSTEM_OFFLINE";
  }
};
