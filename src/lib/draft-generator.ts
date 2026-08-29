import { getAnthropic, DEFAULT_MODEL } from "./anthropic";
import { getStyleSamples } from "./style-samples";
import { CATEGORIES } from "./constants";
import { slugify } from "./slugify";
import type { Draft } from "@/types";

const SYSTEM_PROMPT = (styleBlock: string) =>
  `
You are drafting an article for Bitcoin Africa Story, written in the writer's own voice.

Below are excerpts from the writer's own previously published articles. Study their voice, sentence
rhythm, and structure — not the topics — and match that voice in the new draft. Never imitate the
style of any other outlet, and never lift phrasing from the source material verbatim beyond what's
needed for direct quotes.

${styleBlock}

CRITICAL RULES:
- Draft ONLY from the source material the writer provides below. Do not pull in outside facts you
  weren't given, and do not rewrite or summarize other outlets' articles.
- If the source material is thin, write a shorter but accurate draft rather than padding with
  invented detail.
- Flag any claim in the draft that should be fact-checked before publishing.
- "category" must be exactly one of: ${CATEGORIES.join(", ")}.
- "readTime" must be a short string like "4 min read", matching the site's existing format.

Respond with ONLY a JSON object wrapped in <result></result> tags, no other text. Structure:
{
  "title": "...",
  "content": "Full article body as clean HTML (p, h2, h3, strong, em, ul/li tags only — no inline styles)",
  "excerpt": "1-2 sentence teaser",
  "seoTitle": "...",
  "metaDescription": "...",
  "category": "one of the allowed categories listed above",
  "readTime": "4 min read",
  "suggestedEntities": ["names of people/companies/projects mentioned, for directory linking"],
  "suggestedInternalLinks": [{"title": "...", "url": ""}],
  "claimsToVerify": ["specific claims worth double-checking before publishing"]
}
`.trim();

export async function generateDraft(
  sourceMaterial: string,
  kind: "notes" | "youtube" | "audio",
  sourceUrl?: string
): Promise<Draft> {
  const client = await getAnthropic();
  const samples = await getStyleSamples();

  const styleBlock = samples.length
    ? samples.map((s, i) => `--- Sample ${i + 1}: "${s.title}" ---\n${s.excerpt}`).join("\n\n")
    : "(No published articles found yet in Firestore — write in a clear, direct, journalistic voice.)";

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT(styleBlock),
    messages: [{ role: "user", content: `Source material (${kind}):\n\n${sourceMaterial}` }],
  });

  const text = response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");

  const match = text.match(/<result>([\s\S]*?)<\/result>/);
  if (!match) {
    throw new Error("Draft generation returned an unexpected format — try again.");
  }

  const parsed = JSON.parse(match[1]);
  const now = new Date().toISOString();
  const category = CATEGORIES.includes(parsed.category) ? parsed.category : CATEGORIES[0];

  return {
    title: parsed.title,
    slug: slugify(parsed.title),
    content: parsed.content,
    excerpt: parsed.excerpt,
    category,
    image: "",
    imageAlt: "",
    author: "",
    date: new Date().toISOString().split("T")[0],
    readTime: parsed.readTime || "3 min read",
    youtubeUrl: kind === "youtube" ? sourceUrl || "" : "",
    status: "draft",
    seoTitle: parsed.seoTitle || parsed.title,
    metaDescription: parsed.metaDescription || parsed.excerpt,
    focusKeywords: "",
    suggestedEntities: parsed.suggestedEntities || [],
    suggestedInternalLinks: parsed.suggestedInternalLinks || [],
    claimsToVerify: parsed.claimsToVerify || [],
    createdAt: now,
    updatedAt: now,
    sourceMaterial: { kind, raw: sourceMaterial },
  };
}
