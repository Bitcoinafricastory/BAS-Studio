import { NextRequest, NextResponse } from "next/server";
import { loadArticle } from "@/lib/distribution/article";
import { generateVariant } from "@/lib/distribution/generate";
import { OUTPUT_SPECS } from "@/lib/distribution/outputs";
import type { OutputId } from "@/lib/distribution/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One call per output so each stays well inside the function time limit. The browser
// fires these in parallel and fills each card as its result arrives.
export async function POST(req: NextRequest) {
  try {
    const { articleId, output, factSheet, author, angle, variants } = await req.json();
    if (!articleId || !output || !factSheet || !author?.name || !author?.xHandle) {
      return NextResponse.json({ error: "articleId, output, factSheet and author are required" }, { status: 400 });
    }
    if (!OUTPUT_SPECS[output as OutputId]) return NextResponse.json({ error: "Unknown output type" }, { status: 400 });

    const article = await loadArticle(articleId);
    const count = Math.min(Math.max(Number(variants) || 2, 1), 2);
    const input = { outputId: output as OutputId, article, author, factSheet, angle };
    const results = await Promise.all(Array.from({ length: count }, (_, i) => generateVariant(input, i)));
    return NextResponse.json({ output, variants: results });
  } catch (err: any) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: err.message || "Generation failed" }, { status: 500 });
  }
}
