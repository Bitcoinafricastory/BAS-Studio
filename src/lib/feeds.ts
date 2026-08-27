import Parser from "rss-parser";
import type { Lead, Source } from "@/types";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "BAS-Studio-Leads/1.0 (+https://bitcoinafricastory.com)" },
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export async function fetchFeed(source: Source): Promise<Lead[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).slice(0, 20).map((item) => ({
      id: item.guid || item.link || `${source.id}-${item.title}`,
      title: item.title || "(untitled)",
      summary: stripHtml(item.contentSnippet || item.content || "").slice(0, 280),
      url: item.link || "",
      sourceLabel: source.label,
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      origin: "feed" as const,
    }));
  } catch (err) {
    // A single dead feed shouldn't take down the whole Leads screen.
    console.error(`Feed fetch failed for ${source.label} (${source.url}):`, err);
    return [];
  }
}

export async function fetchAllFeeds(sources: Source[]): Promise<Lead[]> {
  const active = sources.filter((s) => s.active);
  const results = await Promise.all(active.map(fetchFeed));
  return results.flat();
}
