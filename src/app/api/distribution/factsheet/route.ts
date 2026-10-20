import { NextRequest, NextResponse } from "next/server";
import { loadArticle } from "@/lib/distribution/article";
import { buildFactSheet } from "@/lib/distribution/factsheet";
import { findAuthor, AUTHORS } from "@/lib/distribution/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { articleId } = await req.json();
    if (!articleId) return NextResponse.json({ error: "articleId is required" }, { status: 400 });

    const article = await loadArticle(articleId);
    if (!article.slug) return NextResponse.json({ error: "This article has no slug, so it has no public link yet." }, { status: 400 });

    const factSheet = await buildFactSheet(article);
    const { bodyText, ...meta } = article;
    return NextResponse.json({
      article: meta,
      factSheet,
      author: findAuthor(article.author) || null,
      authors: AUTHORS,
    });
  } catch (err: any) {
    console.error("Fact sheet error:", err);
    return NextResponse.json({ error: err.message || "Failed to build the fact sheet" }, { status: 500 });
  }
}
