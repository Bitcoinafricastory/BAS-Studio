import { getAnthropic, DEFAULT_MODEL } from "./anthropic";
import { getStyleSamples, styleSamplesBlock } from "./style-samples";
import { CATEGORIES } from "./constants";
import { slugify } from "./slugify";
import {
  articleSystemPrompt,
  fixPassPrompt,
  lintDraft,
  sanitizeLinks,
  extractUrls,
  normalizeUrl,
  HARD_RULES,
  type StyleIssue,
} from "./voice";
import { getBasArchive, archiveBlock } from "./voice/archive";
import type { Draft } from "@/types";

interface ParsedDraft {
  title: string;
  content: string;
  excerpt: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeywords?: string;
  category?: string;
  readTime?: string;
  suggestedEntities?: string[];
  suggestedInternalLinks?: { title: string; url: string }[];
  claimsToVerify?: string[];
}

function textOf(response: any): string {
  return response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

function parseResult(text: string): ParsedDraft {
  const match = text.match(/<result>([\s\S]*?)<\/result>/);
  if (!match) throw new Error("Draft generation returned an unexpected format. Try again.");
  return JSON.parse(match[1]);
}

/**
 * Drafts an article in the BAS voice. The model gets the shared BAS rules, the editor's
 * approved ledes and corrections, recent published articles for voice, and the real BAS
 * archive for backlinks. Afterwards the draft is checked: links not found in the source
 * material or the archive are removed, and if the style check finds slop, dashes, tables
 * or contrast framing, the model gets one pass to fix those sentences.
 */
export async function generateDraft(
  sourceMaterial: string,
  kind: "notes" | "youtube" | "audio",
  sourceUrl?: string
): Promise<Draft> {
  const client = await getAnthropic();
  const [samples, archive] = await Promise.all([getStyleSamples(), getBasArchive()]);

  const system = articleSystemPrompt({
    styleBlock: styleSamplesBlock(samples),
    archiveBlock: archiveBlock(archive),
    categories: CATEGORIES,
  });
  const userMessage = `Source material (${kind}${sourceUrl ? `, from ${sourceUrl}` : ""}):\n\n${sourceMaterial}`;

  const first = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 6000,
    temperature: 0.6,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  const firstText = textOf(first);
  let parsed = parseResult(firstText);

  const allowedLinks = [...extractUrls(sourceMaterial), ...(sourceUrl ? [sourceUrl] : []), ...archive.map((a) => a.url)];
  const check = (p: ParsedDraft) => {
    const { html, removed } = sanitizeLinks(p.content || "", allowedLinks);
    const issues = lintDraft({ ...p, content: html });
    return { html, removed, issues };
  };

  let { html, removed, issues } = check(parsed);

  // One fix pass for the hard style problems. Facts and links must not change.
  const hard = issues.filter((i: StyleIssue) => HARD_RULES.has(i.rule));
  if (hard.length) {
    try {
      const second = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 6000,
        temperature: 0.3,
        system,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: firstText },
          { role: "user", content: fixPassPrompt(hard.map((i) => i.message)) },
        ],
      });
      const fixed = parseResult(textOf(second));
      parsed = { ...parsed, ...fixed };
      ({ html, removed, issues } = check(parsed));
    } catch (err) {
      // Keep the first draft; the remaining issues are shown to the editor.
      console.error("Style fix pass failed:", err);
    }
  }

  const archiveUrls = new Set(archive.map((a) => normalizeUrl(a.url)));
  const internalLinks = (parsed.suggestedInternalLinks || []).filter((l) => l?.url && archiveUrls.has(normalizeUrl(l.url)));

  const claims = [...(parsed.claimsToVerify || [])];
  if (removed.length) {
    claims.push(`Removed ${removed.length} link${removed.length > 1 ? "s" : ""} not found in your source material or the BAS archive: ${removed.join(", ")}`);
  }

  const now = new Date().toISOString();
  const category = parsed.category && CATEGORIES.includes(parsed.category) ? parsed.category : CATEGORIES[0];

  return {
    title: parsed.title,
    slug: slugify(parsed.title),
    content: html,
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
    focusKeywords: parsed.focusKeywords || "",
    suggestedEntities: parsed.suggestedEntities || [],
    suggestedInternalLinks: internalLinks,
    claimsToVerify: claims,
    styleNotes: issues.map((i) => i.message),
    createdAt: now,
    updatedAt: now,
    sourceMaterial: { kind, raw: sourceMaterial },
  };
}
