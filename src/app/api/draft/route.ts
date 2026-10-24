import { NextRequest, NextResponse } from "next/server";
import { generateDraft } from "@/lib/draft-generator";
import { requireAuth } from "@/lib/auth";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const { sourceMaterial, kind, sourceUrl } = await req.json();
    if (!sourceMaterial || !kind) {
      return NextResponse.json({ error: "sourceMaterial and kind are required" }, { status: 400 });
    }
    if (typeof sourceMaterial !== "string") {
      return NextResponse.json({ error: "sourceMaterial must be text" }, { status: 400 });
    }
    // About 25,000 words. Longer than this and the model rejects the request with an unreadable error.
    if (sourceMaterial.length > 150_000) {
      return NextResponse.json(
        { error: "That source is too long to draft from in one go (over about 25,000 words). Trim it to the part you want written up." },
        { status: 400 }
      );
    }
    const draft = await generateDraft(sourceMaterial, kind, sourceUrl);
    return NextResponse.json(draft);
  } catch (err: any) {
    console.error("Draft generation error:", err);
    return NextResponse.json({ error: err.message || "Draft generation failed" }, { status: 500 });
  }
}
