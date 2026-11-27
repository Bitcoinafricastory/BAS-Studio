import { askJson } from "./llm";
import { FACT_SHEET_PROMPT } from "./prompts";
import type { ArticleRecord, FactSheet } from "./types";

const str = { type: "string" };
const FACT_SHEET_SCHEMA = {
  type: "object",
  properties: {
    subject: str,
    followsEarlierCoverage: { type: "boolean" },
    what: str,
    who: { type: "array", items: { type: "object", properties: { name: str, role: str, handle: { type: ["string", "null"] } }, required: ["name"] } },
    when: str,
    where: str,
    numbers: { type: "array", items: { type: "object", properties: { value: str, context: str }, required: ["value"] } },
    quotes: { type: "array", items: { type: "object", properties: { speaker: str, text: str }, required: ["text"] } },
    whyItMatters: str,
    whatsNext: str,
    hedged: { type: "array", items: { type: "object", properties: { claim: str, hedge: str }, required: ["claim"] } },
    facts: { type: "array", maxItems: 15, items: { type: "object", properties: { text: str, sourceSentence: str }, required: ["text"] } },
  },
  required: ["subject", "what", "who", "facts"],
};

// Step 1 of the pipeline: every draft is written from this one checked fact sheet,
// never from the raw article, so the checker has something exact to compare against.
export async function buildFactSheet(article: ArticleRecord): Promise<FactSheet> {
  const links = article.links.map((l) => `${l.text}: ${l.url}`).join("\n") || "(none)";
  const user = `TITLE: ${article.title}
PUBLISHED: ${article.date}
CATEGORY: ${article.category}

ARTICLE TEXT:
${article.bodyText.slice(0, 24000)}

LINKS IN THE ARTICLE (the Sources list and the only place handles may come from):
${links}`;

  const fs = await askJson<Partial<FactSheet>>({ system: FACT_SHEET_PROMPT, user, schema: FACT_SHEET_SCHEMA, maxTokens: 4000 });
  return {
    subject: fs.subject || article.title,
    followsEarlierCoverage: !!fs.followsEarlierCoverage,
    what: fs.what || "",
    who: fs.who || [],
    when: fs.when || "",
    where: fs.where || "",
    numbers: fs.numbers || [],
    quotes: fs.quotes || [],
    whyItMatters: fs.whyItMatters || "",
    whatsNext: fs.whatsNext || "",
    hedged: fs.hedged || [],
    facts: fs.facts || [],
  };
}
