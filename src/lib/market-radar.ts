import { getAnthropic, DEFAULT_MODEL } from "./anthropic";
import type { Lead } from "@/types";

const SYSTEM_PROMPT = `
You are a news radar for Bitcoin Africa Story. Use web search to find genuine Bitcoin/crypto news and
developments from the last 48 hours that are relevant to Africa (any country), or globally significant
news relevant to a Bitcoin-focused African audience (major protocol, price, or regulation news).

Never fabricate items. Only include things you actually found via search, each with a real source URL
returned by the search tool.

Respond with ONLY a JSON array wrapped in <result></result> tags, no other text outside the tags.
Each item:
{
  "title": "...",
  "summary": "1-2 sentence summary",
  "url": "the source URL",
  "sourceLabel": "the publication name",
  "publishedAt": "ISO date if known, else your best estimate"
}
Return at most 8 items, most significant first. If you find nothing genuinely new, return an empty array.
`.trim();

export async function fetchMarketRadar(): Promise<Lead[]> {
  try {
    const client = await getAnthropic();
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: "What's happening in African Bitcoin news in the last 48 hours?" },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
    });

    const text = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const match = text.match(/<result>([\s\S]*?)<\/result>/);
    if (!match) return [];

    const items = JSON.parse(match[1]);
    const now = new Date().toISOString();

    return items.map(
      (item: any, i: number): Lead => ({
        id: `market-radar-${i}-${item.url || item.title}`,
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceLabel: item.sourceLabel || "Market radar",
        publishedAt: item.publishedAt || now,
        fetchedAt: now,
        origin: "market-radar",
        unverified: true,
      })
    );
  } catch (err) {
    // Market radar is a bonus signal, not critical path — never let it break Leads.
    console.error("Market radar failed:", err);
    return [];
  }
}
