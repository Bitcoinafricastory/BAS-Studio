// BAS style checks. Pure functions with no server imports, so the editor screen can run
// them live in the browser while the generators run them on the server.
import { BANNED_WORD_PATTERNS, BANNED_PHRASES, GENERIC_HEADINGS, SEO_LIMITS } from "./rules";

export interface StyleIssue {
  level: "error" | "warn";
  rule: string;
  message: string;
}

// Rules that send a generated draft back for a fix pass.
export const HARD_RULES = new Set(["banned-word", "banned-phrase", "em-dash", "table", "contrast"]);

const QUOTE_RE = /"[^"\n]{0,600}"|“[^”\n]{0,600}”/g;

/** Quoted speech must stay exact, so it is exempt from the wording checks. */
export function stripQuotes(text: string): string {
  return text.replace(QUOTE_RE, " ");
}

export function findBannedWords(text: string): string[] {
  const t = stripQuotes(text);
  return BANNED_WORD_PATTERNS.filter((b) => b.pattern.test(t)).map((b) => b.word);
}

export function findBannedPhrases(text: string): string[] {
  const t = stripQuotes(text).toLowerCase().replace(/’/g, "'");
  return BANNED_PHRASES.filter((p) => t.includes(p));
}

export function hasContrastFraming(text: string): boolean {
  const t = stripQuotes(text);
  return (
    /\b(it'?s|it is|this is|that's|that is) not\b[^.\n]{0,80}[,;:]\s*(it'?s|it is|but)\b/i.test(t) ||
    /\b(not just|isn't just|aren't just|more than just)\b[^.\n]{0,80}\bbut\b/i.test(t) ||
    /\bNo (one|government|company|bank|planner)\b[^.\n]{0,60}\.\s+(One|A single)\b/.test(t)
  );
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/))
    .map((s) => s.trim())
    .filter(Boolean);
}

function ngrams(text: string, n: number): string[] {
  const words = stripQuotes(text).toLowerCase().match(/[a-z0-9']+/g) || [];
  const out: string[] = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}

const preview = (s: string, words = 8) => s.split(/\s+/).slice(0, words).join(" ") + "…";

/** Wording checks only: slop words and phrases, dashes, contrast framing. */
export function lintWording(text: string): StyleIssue[] {
  const out: StyleIssue[] = [];

  const words = findBannedWords(text);
  if (words.length) out.push({ level: "error", rule: "banned-word", message: `Slop word: ${words.join(", ")}.` });

  const phrases = findBannedPhrases(text);
  if (phrases.length) out.push({ level: "error", rule: "banned-phrase", message: `Slop phrase: "${phrases.join('", "')}".` });

  if (/—|\s–\s/.test(text))
    out.push({ level: "error", rule: "em-dash", message: "Contains a dash used as punctuation. Use a colon, a comma or a full stop." });

  if (hasContrastFraming(text))
    out.push({ level: "error", rule: "contrast", message: 'Contrast framing ("It\'s not X, it\'s Y" or "not just X, but Y"). Say it plainly.' });

  return out;
}

/** Wording plus readability checks for running prose: articles and passages. */
export function lintProse(text: string): StyleIssue[] {
  const out = lintWording(text);

  const long = sentences(stripQuotes(text)).filter((s) => s.split(/\s+/).length > 35);
  if (long.length)
    out.push({
      level: "warn",
      rule: "long-sentence",
      message: `${long.length} sentence${long.length > 1 ? "s" : ""} over 35 words. Split: "${preview(long[0])}"`,
    });

  const seen = new Set<string>();
  for (const g of ngrams(text, 7)) {
    if (seen.has(g)) {
      out.push({ level: "warn", rule: "repetition", message: `A phrase repeats: "${g}".` });
      break;
    }
    seen.add(g);
  }

  return out;
}

export interface DraftFields {
  title: string;
  content: string; // HTML
  excerpt?: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeywords?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/'s\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Full BAS article check: wording, structure, headings, links and SEO fields. */
export function lintDraft(d: DraftFields): StyleIssue[] {
  const html = d.content || "";
  const body = htmlToText(html);
  const out: StyleIssue[] = lintProse(body);
  // The title and SEO fields get the wording checks only: they naturally echo the body.
  for (const issue of lintWording([d.title, d.excerpt || "", d.seoTitle || "", d.metaDescription || ""].join("\n"))) {
    if (!out.some((o) => o.rule === issue.rule)) out.push(issue);
    else {
      const existing = out.find((o) => o.rule === issue.rule)!;
      if (existing.message !== issue.message) existing.message += ` Also in the title or SEO fields: ${issue.message}`;
    }
  }

  // Structure
  if (/<table\b/i.test(html)) out.push({ level: "error", rule: "table", message: "Contains a table. The BAS CMS does not render tables; use short paragraphs or a list." });
  if (/<h1\b/i.test(html)) out.push({ level: "warn", rule: "structure", message: "The body has an <h1>. The title is separate; sections use <h2>." });

  const headings = Array.from(html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)).map((m) => htmlToText(m[1]));
  const generic = headings.filter((h) => GENERIC_HEADINGS.includes(norm(h)));
  if (generic.length)
    out.push({ level: "warn", rule: "heading", message: `Generic heading: "${generic.join('", "')}". Describe what the section says and include the key name.` });
  const sections = headings.filter((h) => norm(h) !== "sources");
  if (body.split(/\s+/).length > 350 && sections.length < 2)
    out.push({ level: "warn", rule: "structure", message: "Fewer than two section headings. Break the article into sections with descriptive <h2> headings." });
  if (/<a\s/i.test(html) && !headings.some((h) => norm(h) === "sources"))
    out.push({ level: "warn", rule: "sources", message: 'No "Sources" section at the end.' });

  // Intro: a read-through line, and no repetition between intro and body
  const paras = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => htmlToText(m[1])).filter(Boolean);
  const firstH2 = html.search(/<h2\b/i);
  const introParas = firstH2 > -1 ? Array.from(html.slice(0, firstH2).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => htmlToText(m[1])) : paras.slice(0, 3);
  if (introParas.length && !introParas.some((p) => /^(here's|here is)\b/i.test(p.trim())))
    out.push({ level: "warn", rule: "read-through", message: 'The intro has no read-through line ("Here\'s how X started, why Y and what\'s next.").' });
  if (firstH2 > -1) {
    const introGrams = new Set(ngrams(introParas.join(" "), 6));
    const sourcesAt = html.search(/<h2[^>]*>\s*sources\s*<\/h2>/i);
    const rest = htmlToText(html.slice(firstH2, sourcesAt > firstH2 ? sourcesAt : undefined));
    const dup = ngrams(rest, 6).find((g) => introGrams.has(g));
    if (dup) out.push({ level: "warn", rule: "repetition", message: `The intro and a section repeat: "${dup}". Say it once.` });
  }
  const longParas = paras.filter((p) => sentences(p).length > 4).length;
  if (longParas) out.push({ level: "warn", rule: "paragraph", message: `${longParas} paragraph${longParas > 1 ? "s have" : " has"} more than four sentences. Keep paragraphs to one to three.` });

  // Title and SEO
  if (/—/.test(d.title)) out.push({ level: "warn", rule: "title", message: "The title has an em dash. Use a colon or a comma." });
  if (d.seoTitle !== undefined) {
    const n = Array.from(d.seoTitle).length;
    if (n > SEO_LIMITS.seoTitleMax) out.push({ level: "warn", rule: "seo", message: `SEO title is ${n} characters; keep it to ${SEO_LIMITS.seoTitleMax}.` });
  }
  if (d.metaDescription !== undefined && d.metaDescription.trim()) {
    const n = Array.from(d.metaDescription).length;
    if (n > SEO_LIMITS.metaMax || n < SEO_LIMITS.metaMin)
      out.push({ level: "warn", rule: "seo", message: `Meta description is ${n} characters; aim for ${SEO_LIMITS.metaMin} to ${SEO_LIMITS.metaMax}.` });
  }
  const focus = (d.focusKeywords || "").split(",")[0]?.trim();
  if (focus) {
    const k = norm(focus);
    const missing = [
      ["SEO title", d.seoTitle || d.title],
      ["meta description", d.metaDescription || ""],
      ["body", body],
    ]
      .filter(([, v]) => !norm(v).includes(k))
      .map(([where]) => where);
    if (missing.length) out.push({ level: "warn", rule: "seo", message: `Focus keyword "${focus}" is missing from the ${missing.join(", ")}.` });
  }

  return out;
}

export function issuesToNotes(issues: StyleIssue[]): string[] {
  return issues.map((i) => i.message);
}

// ---- Links

const URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi;

export function extractUrls(text: string): string[] {
  return Array.from(new Set((text.match(URL_RE) || []).map((u) => u.replace(/[.,;:!?]+$/, ""))));
}

/** Compare URLs loosely: no protocol, no www, no query string, no trailing slash. */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/**
 * Unwraps any link whose URL is not in the allowed set (the source material's own links
 * plus the BAS archive), keeping the link text. Returns the removed URLs so they can be
 * flagged. This is the guard against invented links.
 */
export function sanitizeLinks(html: string, allowed: string[]): { html: string; removed: string[] } {
  const ok = new Set(allowed.map(normalizeUrl));
  const removed: string[] = [];
  const cleaned = html.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (whole, href: string, inner: string) => {
    if (ok.has(normalizeUrl(href))) return whole;
    removed.push(href);
    return inner;
  });
  return { html: cleaned, removed };
}
