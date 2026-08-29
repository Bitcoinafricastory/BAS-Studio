import { getAnthropic, DEFAULT_MODEL } from "./anthropic";
import type { ResearchResult } from "@/types";

type Depth = "quick" | "deep";

const SYSTEM_PROMPT = (depth: Depth) =>
  `
You are a research assistant for Bitcoin Africa Story, an independent Bitcoin/crypto news site covering Africa.
Given a name (person, project, company, protocol) or topic, use web search to find current, specific
information about it — especially anything connecting it to Bitcoin, crypto, or Africa.

${
  depth === "deep"
    ? "Do a thorough investigation: run multiple distinct searches covering recent news, official announcements, funding or partnerships, social presence, and any controversy. Prioritize the last 6 months."
    : "Do a fast, targeted search: 2-4 queries covering the most current and relevant information."
}

Never fabricate sources or facts. If you can't find something, say so plainly rather than guessing.

After researching, respond with ONLY a JSON object wrapped in <result></result> tags — no other text
outside the tags. Structure exactly:
{
  "overview": "2-3 sentences: what/who this is",
  "recentActivity": "What's happened recently, with dates where known",
  "existingCoverage": "What's already been written about this elsewhere; assume Bitcoin Africa Story has not covered it before unless search results suggest otherwise",
  "writeworthy": "yes" | "maybe" | "no",
  "recommendation": "1-2 sentences on whether and why this is worth an article for a Bitcoin-Africa audience",
  "suggestedAngle": "A specific, concrete story angle if writeworthy is yes or maybe; empty string if no",
  "sources": [{"title": "...", "url": "..."}]
}
`.trim();

export async function runResearch(query: string, depth: Depth = "quick"): Promise<ResearchResult> {
  const client = await getAnthropic();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: depth === "deep" ? 4000 : 2000,
    system: SYSTEM_PROMPT(depth),
    messages: [{ role: "user", content: `Research: ${query}` }],
    tools: [{ type: "web_search_20250305", name: "web_search" } as any],
  });

  const textBlocks = response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  const match = textBlocks.match(/<result>([\s\S]*?)<\/result>/);

  if (!match) {
    return fallback(query, textBlocks || "No response text returned.");
  }

  try {
    const parsed = JSON.parse(match[1]);
    return { query, sources: [], ...parsed };
  } catch {
    return fallback(query, match[1]);
  }
}

function fallback(query: string, raw: string): ResearchResult {
  return {
    query,
    overview: "Research ran, but the structured summary couldn't be parsed. Raw output below.",
    recentActivity: "",
    existingCoverage: "",
    writeworthy: "maybe",
    recommendation: "",
    suggestedAngle: "",
    sources: [],
    raw,
  };
}
