import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/research";

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



export const dynamic = "force-dynamic";
