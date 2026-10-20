import { xLength, plainLength } from "./count";
import { findBannedWords, findBannedPhrases, hasContrastFraming } from "../voice/lint";
import { HANDLE_REGISTRY, BAS_X_HANDLE } from "./registry";
import type { ArticleRecord, AuthorRecord, CheckResult, FactSheet, OutputId } from "./types";

interface Ctx {
  outputId: OutputId;
  article: ArticleRecord;
  author: AuthorRecord;
  factSheet: FactSheet;
}

const err = (rule: string, message: string): CheckResult => ({ level: "error", rule, message });
const warn = (rule: string, message: string): CheckResult => ({ level: "warn", rule, message });

const URL_RE = /https?:\/\/\S+/gi;
const isX = (id: OutputId) => ["x_bas_post", "x_bas_comment", "x_author_post", "x_thread", "x_archive"].includes(id);
const isLinkedIn = (id: OutputId) => id === "li_bas_post" || id === "li_author_post";

function stripNoise(text: string): string {
  return text.replace(URL_RE, " ").replace(/@\w+/g, " ").replace(/#\w+/g, " ");
}

function handlesIn(text: string): string[] {
  return Array.from(text.matchAll(/(?:^|[^\w])@(\w{1,15})/g)).map((m) => m[1]);
}

function allowedHandles({ article, author, factSheet }: Ctx): Set<string> {
  const set = new Set<string>([BAS_X_HANDLE, author.xHandle.replace(/^@/, "")]);
  HANDLE_REGISTRY.forEach((r) => set.add(r.handle));
  factSheet.who.forEach((w) => w.handle && set.add(w.handle.replace(/^@/, "")));
  article.links.forEach((l) => {
    const m = l.url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(\w+)/i);
    if (m) set.add(m[1]);
  });
  return new Set(Array.from(set).map((h) => h.toLowerCase()));
}

export function runChecks(text: string, ctx: Ctx): CheckResult[] {
  const { outputId, article, author, factSheet } = ctx;
  const out: CheckResult[] = [];
  const lower = text.toLowerCase();
  const hasUrl = text.includes(article.url) || /bitcoinafricastory\.com/i.test(text);

  if (outputId === "alt_text") return out;

  // ---- Length
  if (outputId === "x_author_post") {
    const cap = author.premium ? 4000 : 280;
    const len = xLength(text);
    if (len > cap) out.push(err("length", `${len} characters; the limit for this account is ${cap}.`));
  } else if (outputId === "x_bas_post") {
    const len = plainLength(text);
    if (len < 400 || len > 1000) out.push(warn("length", `${len} characters; aim for 400 to 1,000.`));
  } else if (isLinkedIn(outputId)) {
    const len = plainLength(text);
    if (len > 3000) out.push(err("length", `${len} characters; LinkedIn allows 3,000.`));
  }

  // ---- Required parts
  if (outputId === "x_bas_post") {
    if (!lower.includes("check the first comment")) out.push(err("required", 'Missing "Check the first comment to read the full story. 👇".'));
    if (hasUrl) out.push(err("required", "The link must not be in the body of a BAS X post. It goes in the first comment."));
  }
  if (outputId === "x_bas_comment") {
    if (!text.includes(article.url)) out.push(err("required", "The first comment must contain the article link."));
    if (!new RegExp(`@${author.xHandle.replace(/^@/, "")}\\b`, "i").test(text)) out.push(err("required", "The first comment must credit the author's @handle."));
    if (!text.includes("👇")) out.push(err("required", "Missing the 👇 before the link line."));
  }
  if (outputId === "x_author_post") {
    if (!/^In my latest for @btcafricastory, I covered/.test(text)) out.push(err("required", 'Must start "In my latest for @btcafricastory, I covered".'));
    if (!text.includes(article.url)) out.push(err("required", "Must end with the article link."));
  }
  if (outputId === "li_bas_post") {
    if (!text.includes(article.url)) out.push(err("required", "The link must be inside the LinkedIn post."));
    if (!text.includes(author.linkedinName || author.name)) out.push(err("required", "Must credit the author by name."));
  }
  if (outputId === "li_author_post") {
    if (!/^In my latest for Bitcoin Africa Story, I covered/.test(text)) out.push(err("required", 'Must start "In my latest for Bitcoin Africa Story, I covered".'));
    if (!text.includes(article.url)) out.push(err("required", "The link must be inside the LinkedIn post."));
  }
  if (isLinkedIn(outputId)) {
    const tags = (text.match(/#\w+/g) || []).length;
    if (tags < 3 || tags > 4) {
      if (outputId === "li_bas_post") out.push(warn("hashtags", `${tags} hashtags; use three or four at the end.`));
    }
    if (/(^|\s)@\w+/.test(text)) out.push(err("handles", "LinkedIn posts use full names, not @handles. Tag people by typing @ in LinkedIn."));
  }
  if (outputId === "x_thread") {
    const parts = text.split(/^\s*---\s*$/m).map((p) => p.trim());
    if (parts.length !== 2) out.push(err("required", "A thread must be exactly two posts separated by ---."));
    else {
      if (/https?:\/\//.test(parts[0]) || parts[0].includes("bitcoinafricastory.com")) out.push(err("required", "Post 1 must not contain the link."));
      if (!parts[1].includes(article.url)) out.push(err("required", "Post 2 must contain the link."));
      if (!new RegExp(`@${author.xHandle.replace(/^@/, "")}\\b`, "i").test(parts[1])) out.push(err("required", "Post 2 must credit the author's @handle."));
    }
  }
  if (outputId === "x_archive" && hasUrl) out.push(err("required", "Archive posts are self-contained; the link goes in the first comment."));

  // ---- Banned patterns
  // Shared with the article checks (src/lib/voice). Quoted speech is exempt, since quotes stay exact.
  const bannedFound = findBannedWords(text);
  if (bannedFound.length) out.push(err("banned", `Banned wording: ${bannedFound.join(", ")}.`));
  const phrasesFound = findBannedPhrases(text);
  if (phrasesFound.length) out.push(err("banned", `Banned phrase: ${phrasesFound.join(", ")}.`));
  if (text.includes("—")) out.push(err("banned", "Contains an em dash. Use a colon or a full stop."));
  if (isX(outputId) && /(^|\s)#\w+/.test(text)) out.push(err("banned", "Hashtags are not used on X."));
  const emojis = (text.match(/\p{Extended_Pictographic}/gu) || []).filter((e) => e !== "👇");
  if (emojis.length) out.push(err("banned", `Only 👇 is allowed as an emoji. Found: ${Array.from(new Set(emojis)).join(" ")}`));
  if (hasContrastFraming(text) || /\bNo (one|government|company|bank)\b[^.\n]{0,60}\.\s+[A-Z]/.test(text))
    out.push(warn("banned", 'Looks like contrast framing ("It\'s not X, it\'s Y"). Rewrite it plainly.'));

  // ---- Handles
  const allowed = allowedHandles(ctx);
  const unknown = Array.from(new Set(handlesIn(text))).filter((h) => !allowed.has(h.toLowerCase()));
  if (unknown.length) out.push(warn("handles", `Handle not in the registry or the article's links: ${unknown.map((h) => "@" + h).join(", ")}. Confirm it or remove the tag.`));

  // ---- Facts: numbers, then capitalised names, must appear in the fact sheet
  const blob = (JSON.stringify(factSheet) + " " + article.title).toLowerCase();
  const blobNoComma = blob.replace(/(\d),(\d)/g, "$1$2");
  const body = stripNoise(text);
  const nums = Array.from(new Set(body.match(/\d[\d,]*(?:\.\d+)?/g) || []));
  const badNums = nums.filter((n) => !blobNoComma.includes(n.replace(/,/g, "").toLowerCase()));
  if (badNums.length) out.push(warn("facts", `Number not found in the fact sheet: ${badNums.join(", ")}.`));

  const known = new Set(["bitcoin", "africa", "story", "bas", "linkedin", "premium", "check", "read", "x"]);
  HANDLE_REGISTRY.forEach((r) => r.name.toLowerCase().split(/\s+/).forEach((t) => known.add(t)));
  author.name.toLowerCase().split(/\s+/).forEach((t) => known.add(t));
  const names = new Set<string>();
  for (const line of body.split(/\n/)) {
    for (const sentence of line.split(/(?<=[.!?:])\s+/)) {
      const words = sentence.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
      words.slice(1).forEach((w) => {
        if (/^[A-Z][a-z]{2,}/.test(w) && !known.has(w.toLowerCase()) && !blob.includes(w.toLowerCase())) names.add(w);
      });
    }
  }
  if (names.size) out.push(warn("facts", `Name not found in the fact sheet: ${Array.from(names).slice(0, 6).join(", ")}.`));

  // ---- Certainty
  for (const w of ["announced", "confirmed", "because"]) {
    if (new RegExp(`\\b${w}\\b`, "i").test(text) && !blob.includes(w)) {
      out.push(warn("certainty", `Uses "${w}" but the source does not say it. Check the claim keeps the source's certainty.`));
    }
  }

  // ---- Repetition
  const dupNums = nums.filter((n) => (body.match(new RegExp(`(?<![\\d.,])${n.replace(/[.,]/g, "\\$&")}(?![\\d])`, "g")) || []).length > 1);
  if (dupNums.length) out.push(warn("repetition", `The same number appears twice: ${dupNums.join(", ")}.`));
  const words = body.toLowerCase().match(/[a-z0-9']+/g) || [];
  const seen = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i++) {
    const g = words.slice(i, i + 5).join(" ");
    if (seen.has(g)) {
      out.push(warn("repetition", `A phrase repeats: "${g}".`));
      break;
    }
    seen.add(g);
  }

  return out;
}
