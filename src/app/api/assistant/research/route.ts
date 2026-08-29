import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/research";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  try {
    const { query, depth } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    const result = await runResearch(query.trim(), depth === "deep" ? "deep" : "quick");
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Research error:", err);
    return NextResponse.json({ error: err.message || "Research failed" }, { status: 500 });
  }
}
