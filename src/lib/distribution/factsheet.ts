import { ask, parseJson } from "./llm";
import { FACT_SHEET_PROMPT } from "./prompts";
import type { ArticleRecord, FactSheet } from "./types";

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

  const raw = await ask({ system: FACT_SHEET_PROMPT, user, maxTokens: 4000, temperature: 0 });
  const fs = parseJson<Partial<FactSheet>>(raw);
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
