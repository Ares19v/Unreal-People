import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

/**
 * GET /api/status/mcp
 * Proxies to the Python backend MCP status check.
 * Returns ACTIVE if the backend is running and has filesystem read/write access.
 */
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/status/mcp`, {
      signal: AbortSignal.timeout(2000)
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "OFFLINE", reason: "BACKEND_NOT_RUNNING" });
  }
}
