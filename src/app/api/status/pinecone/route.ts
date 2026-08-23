import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

/**
 * GET /api/status/pinecone
 * Returns real stats from the Pinecone index: total vectors, namespace count, dimension.
 */
export async function GET() {
  if (!process.env.PINECONE_API_KEY) {
    return NextResponse.json({ status: "OFFLINE", reason: "NO_API_KEY" });
  }

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index("unreal-memory");
    const stats = await index.describeIndexStats();

    return NextResponse.json({
      status: "CONNECTED",
      vectors: stats.totalRecordCount ?? 0,
      namespaces: stats.namespaces ? Object.keys(stats.namespaces).length : 0,
      dimension: stats.dimension ?? 1024
    });

  } catch (err) {
    return NextResponse.json({ status: "OFFLINE", reason: String(err) });
  }
}
