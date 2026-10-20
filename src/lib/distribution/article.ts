import { getAdminDb } from "../firebase-admin";
import type { ArticleListItem, ArticleRecord } from "./types";

export const SITE_URL = (process.env.SITE_URL || "https://www.bitcoinafricastory.com").replace(/\/$/, "");

export function articleUrl(slug: string): string {
  return `${SITE_URL}/news/${slug}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractLinks(html: string): { text: string; url: string }[] {
  const out: { text: string; url: string }[] = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ text: htmlToText(m[2]).slice(0, 120), url });
  }
  return out;
}

function toIso(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v.toDate === "function") return v.toDate().toISOString().slice(0, 10);
  return "";
}

// Only these fields are ever read from a news document. Anything else on the record
// (internal notes, private fields) never reaches the generator, by construction.
export async function loadArticle(id: string): Promise<ArticleRecord> {
  const snap = await getAdminDb().collection("news").doc(id).get();
  if (!snap.exists) throw new Error("Article not found");
  const d = snap.data() || {};
  const html = String(d.content || "");
  const slug = String(d.slug || "");
  return {
    id: snap.id,
    title: String(d.title || ""),
    slug,
    url: articleUrl(slug),
    date: String(d.date || toIso(d.createdAt)),
    author: String(d.author || ""),
    category: String(d.category || ""),
    tags: Array.isArray(d.tags) ? d.tags.map(String) : typeof d.tags === "string" ? d.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    image: String(d.image || ""),
    imageAlt: String(d.imageAlt || ""),
    bodyText: htmlToText(html),
    links: extractLinks(html),
  };
}

export async function listPublished(limit = 60): Promise<ArticleListItem[]> {
  const db = getAdminDb();
  let docs;
  try {
    // Ordering on one field and filtering status in memory avoids needing a composite index.
    docs = (await db.collection("news").orderBy("createdAt", "desc").limit(limit * 2).get()).docs;
  } catch {
    docs = (await db.collection("news").limit(limit * 2).get()).docs;
  }
  return docs
    .filter((d) => d.data().status === "published")
    .slice(0, limit)
    .map((d) => {
      const x = d.data();
      return {
        id: d.id,
        title: String(x.title || ""),
        slug: String(x.slug || ""),
        author: String(x.author || ""),
        category: String(x.category || ""),
        date: String(x.date || toIso(x.createdAt)),
        image: String(x.image || ""),
      };
    });
}
