import { NextRequest, NextResponse } from "next/server";
import { generateDraft } from "@/lib/draft-generator";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { sourceMaterial, kind, sourceUrl } = await req.json();
    if (!sourceMaterial || !kind) {
      return NextResponse.json({ error: "sourceMaterial and kind are required" }, { status: 400 });
    }
    const draft = await generateDraft(sourceMaterial, kind, sourceUrl);
    return NextResponse.json(draft);
  } catch (err: any) {
    console.error("Draft generation error:", err);
    return NextResponse.json({ error: err.message || "Draft generation failed" }, { status: 500 });
  }
}
