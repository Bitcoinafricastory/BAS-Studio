import { getGrok, extractGrokText, DEFAULT_GROK_MODEL } from "./grok";
import type { Lead } from "@/types";

const PROMPT = `
Search X (formerly Twitter) for genuine Bitcoin/crypto posts and discussions from the last 48
hours relevant to Africa (any country) — announcements, breaking developments, notable threads
from African Bitcoin builders, exchanges, projects, or communities.

Never fabricate items. Only include things you actually found via X search, each with a real
post URL.

Respond with ONLY a JSON array wrapped in <result></result> tags, no other text. Each item:
{
  "title": "...",
  "summary": "1-2 sentence summary",
  "url": "the X post URL",
  "sourceLabel": "the account handle, e.g. @handle",
  "publishedAt": "ISO date if known, else your best estimate"
}
Return at most 8 items, most significant first. If you find nothing genuinely new, return an
empty array.
`.trim();

/**
 * Grok's differentiator over Anthropic's web search is live X access — this often surfaces
 * breaking Bitcoin-Africa news hours or days before it reaches any article or RSS feed.
 * Requires XAI_API_KEY; if it's not set, this fails closed (returns []) rather than
 * breaking the rest of the Leads screen.
 */
export async function fetchXRadar(): Promise<Lead[]> {
  try {
    const client = await getGrok();
    const response = await (client as any).responses.create({
      model: DEFAULT_GROK_MODEL,
      input: [
        { role: "user", content: `${PROMPT}\n\nWhat's happening in African Bitcoin discussion on X right now?` },
      ],
      tools: [{ type: "x_search" }],
    });

    const text = extractGrokText(response);
    const match = text.match(/<result>([\s\S]*?)<\/result>/);
    if (!match) return [];

    const items = JSON.parse(match[1]);
    const now = new Date().toISOString();

    return items.map(
      (item: any, i: number): Lead => ({
        id: `x-radar-${i}-${item.url || item.title}`,
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceLabel: item.sourceLabel ? `X radar · ${item.sourceLabel}` : "X radar",
        publishedAt: item.publishedAt || now,
        fetchedAt: now,
        origin: "market-radar",
        unverified: true,
      })
    );
  } catch (err) {
    console.error("X radar failed (check XAI_API_KEY):", err);
    return [];
  }
}
