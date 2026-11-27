import { xLength, plainLength } from "./count";
import { findBannedWords, findBannedPhrases, hasContrastFraming } from "../voice/lint";
import { HANDLE_REGISTRY, BAS_X_HANDLE, BAS_X_PREMIUM, X_LIMIT, X_PREMIUM_LIMIT, THREAD_LINES } from "./registry";
import { BAS_X_OUTPUTS } from "./outputs";
import type { ArticleRecord, AuthorRecord, CheckResult, FactSheet, OutputId } from "./types";

interface Ctx {
  outputId: OutputId;
  article: ArticleRecord;
  author: AuthorRecord;
  factSheet: FactSheet;
  mainPost?: string; // the BAS main post, which the requote must not repeat
}

const err = (rule: string, message: string): CheckResult => ({ level: "error", rule, message });
const warn = (rule: string, message: string): CheckResult => ({ level: "warn", rule, message });

const URL_RE = /https?:\/\/\S+/gi;
const isX = (id: OutputId) => BAS_X_OUTPUTS.includes(id) || id === "x_author_post";
const isLinkedIn = (id: OutputId) => id === "li_bas_post" || id === "li_author_post";

function stripNoise(text: string): string {
  return text.replace(URL_RE, " ").replace(/@\w+/g, " ").replace(/#\w+/g, " ");
}

function handlesIn(text: string): string[] {
  return Array.from(text.matchAll(/(?:^|[^\w])@(\w{1,15})/g)).map((m) => m[1]);
}

function fiveWordPhrases(text: string): Set<string> {
  const words = stripNoise(text).toLowerCase().match(/[a-z0-9']+/g) || [];
  const out = new Set<string>();
  for (let i = 0; i + 5 <= words.length; i++) out.add(words.slice(i, i + 5).join(" "));
  return out;
}

const urlsIn = (text: string) => Array.from(text.matchAll(URL_RE)).map((m) => m[0].replace(/[).,]+$/, ""));
const sameUrl = (a: string, b: string) => a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

/** The X character limit for an output: 280 unless the account posting it has Premium. */
export function xLimitFor(outputId: OutputId, author: AuthorRecord): number | null {
  if (outputId === "x_author_post") return author.premium ? X_PREMIUM_LIMIT : X_LIMIT;
  if (BAS_X_OUTPUTS.includes(outputId)) return BAS_X_PREMIUM ? X_PREMIUM_LIMIT : X_LIMIT;
  return null;
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
  const hasUrl = text.includes(article.url) || /bitcoinafricastory\.com/i.test(text);

  if (outputId === "alt_text") return out;

  // A reply the generator chose to skip has nothing to check.
  if ((outputId === "x_bas_action" || outputId === "x_bas_extra") && /^skip\.?$/i.test(text.trim())) return out;

  // ---- Length
  const xCap = xLimitFor(outputId, author);
  if (xCap !== null) {
    const len = xLength(text);
    if (len > xCap) out.push(err("length", `${len} characters; the limit for this account is ${xCap}.`));
  } else if (isLinkedIn(outputId)) {
    const len = plainLength(text);
    if (len > 3000) out.push(err("length", `${len} characters; LinkedIn allows 3,000.`));
  }

  // ---- Required parts
  if (outputId === "x_bas_post" || outputId === "x_archive") {
    if (!text.trim().endsWith(THREAD_LINES.mainPostEnd)) out.push(err("required", `Must end with "${THREAD_LINES.mainPostEnd}".`));
    if (urlsIn(text).length || hasUrl) out.push(err("required", "No link in the main post. The link goes in Reply 1."));
  }
  if (outputId === "x_bas_post") {
    if (/(?:[$₦£€]|\b(?:usd|ngn|kes|zar|ghs|ugx|tzs|xof)\b)\s?\d|\d[\d,.]*\s?(?:sats|btc|usd|naira|cedis?|shillings?|rand)\b/i.test(text))
      out.push(warn("price", "Looks like a price. Prices go in a reply, not the main post."));
    if (/\b(hurry|last chance|don'?t miss|do not miss|before it'?s too late|limited (?:spots|seats)|only \d+ (?:days?|hours?|spots|seats) left)\b/i.test(text))
      out.push(warn("pressure", "Deadline pressure. Keep the main post normal and put dates in a reply."));
  }
  if (outputId === "x_bas_action" || outputId === "x_bas_extra") {
    const links = urlsIn(text);
    if (links.length !== 1) out.push(err("required", "A reply carries exactly one link."));
    for (const u of links) {
      if (sameUrl(u, article.url)) out.push(err("required", "The article link belongs in Reply 1, not here."));
      else if (!article.links.some((l) => sameUrl(l.url, u))) out.push(err("required", `This link is not in the article: ${u}`));
    }
  }
  if (outputId === "x_bas_comment") {
    if (!text.includes(article.url)) out.push(err("required", "The first comment must contain the article link."));
    if (!new RegExp(`@${author.xHandle.replace(/^@/, "")}\\b`, "i").test(text)) out.push(err("required", "The first comment must credit the author's @handle."));
    if (!text.includes("👇")) out.push(err("required", "Missing the 👇 before the link line."));
  }
  if (outputId === "x_author_post") {
    if (!text.trim().endsWith(THREAD_LINES.requoteEnd)) out.push(err("required", `Must end with "${THREAD_LINES.requoteEnd}".`));
    if (urlsIn(text).length) out.push(err("required", "No link in the requote. It quotes the main post, which leads to the article."));
    if (ctx.mainPost) {
      const main = fiveWordPhrases(ctx.mainPost);
      const shared = Array.from(fiveWordPhrases(text)).find((g) => main.has(g));
      if (shared) out.push(err("angle", `Repeats the main post ("${shared}"). Take a different angle.`));
    }
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
