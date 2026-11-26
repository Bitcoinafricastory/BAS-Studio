import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/slugify";
import { readTimeFor } from "@/lib/read-time";
import { getDirectoryEntities } from "@/lib/entities";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const textList = (v: unknown, maxItems: number, maxLen: number) =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && !!x.trim())
        .map((x) => x.trim().slice(0, maxLen))
        .slice(0, maxItems)
    : [];
const httpUrl = (v: unknown) => {
  const s = text(v, 2000);
  return /^https?:\/\//i.test(s) ? s : "";
};

/** A slug no other article uses: "my-story", then "my-story-2", "my-story-3"… */
async function freeSlug(db: FirebaseFirestore.Firestore, base: string): Promise<string> {
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const hit = await db.collection("news").where("slug", "==", candidate).limit(1).get();
    if (hit.empty) return candidate;
  }
  throw new Error("Couldn’t find a free URL slug for this title. Change the headline and try again.");
}

/**
 * Saves a draft into the site's `news` collection. Only the fields the site's dashboard knows
 * are written, each checked for type and length. Studio's own notes (claims to verify, style
 * notes, source material, suggestions) never reach the article, which the public can read.
 * The article always lands as a draft; publishing stays in the dashboard.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body = await req.json();
    const title = text(body?.title, 300);
    const content = typeof body?.content === "string" ? body.content : "";
    const excerpt = text(body?.excerpt, 600);
    const category = text(body?.category, 40);
    if (!title || !content.trim() || !excerpt || !category) {
      return NextResponse.json({ error: "title, content, category, and excerpt are required" }, { status: 400 });
    }
    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Category must be one of: ${CATEGORIES.join(", ")}` }, { status: 400 });
    }
    if (content.length > 400_000) {
      return NextResponse.json({ error: "The article body is too long to save." }, { status: 400 });
    }

    const db = getAdminDb();

    // Byline: filled from the site's authors list, the same way the dashboard's picker does it.
    let byline = { author: "", authorId: "", authorImage: "", authorLinkedIn: "", authorX: "" };
    const authorId = text(body?.authorId, 200);
    if (authorId) {
      const snap = await db.collection("authors").doc(authorId).get();
      if (!snap.exists) return NextResponse.json({ error: "That author isn’t in the authors list." }, { status: 400 });
      byline = {
        author: String(snap.get("name") || ""),
        authorId,
        authorImage: String(snap.get("avatar") || ""),
        authorLinkedIn: String(snap.get("linkedin") || ""),
        authorX: String(snap.get("twitter") || ""),
      };
    }

    // Directory links: only slugs that exist in the directory.
    const wanted = textList(body?.linkedEntityIds, 40, 200);
    let linkedEntityIds: string[] = [];
    if (wanted.length) {
      const known = new Set((await getDirectoryEntities()).map((e) => e.slug));
      linkedEntityIds = wanted.filter((s) => known.has(s));
    }

    const faqs = Array.isArray(body?.faqs)
      ? body.faqs
          .map((f: any) => ({ question: text(f?.question, 300), answer: text(f?.answer, 1500) }))
          .filter((f: { question: string; answer: string }) => f.question && f.answer)
          .slice(0, 10)
      : [];

    const date = /^\d{4}-\d{2}-\d{2}$/.test(text(body?.date, 10)) ? text(body?.date, 10) : new Date().toISOString().slice(0, 10);
    const slug = await freeSlug(db, slugify(text(body?.slug, 200) || title) || slugify(title) || "draft");

    const article = {
      title,
      slug,
      excerpt,
      content,
      category,
      image: httpUrl(body?.image),
      imageAlt: text(body?.imageAlt, 300),
      ...byline,
      date,
      readTime: readTimeFor(content),
      youtubeUrl: httpUrl(body?.youtubeUrl),
      isPopular: false,
      isTopStory: false,
      seoTitle: text(body?.seoTitle, 120),
      metaDescription: text(body?.metaDescription, 320),
      focusKeywords: text(body?.focusKeywords, 300),
      canonicalUrl: "",
      tags: textList(body?.tags, 15, 60),
      keyTakeaways: textList(body?.keyTakeaways, 8, 400),
      faqs,
      showFaqs: faqs.length > 0,
      linkedEntityIds,
      status: "draft", // always lands as a draft — publishing stays in the existing dashboard
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("news").add(article);
    return NextResponse.json({ id: docRef.id, slug });
  } catch (err: any) {
    console.error("Send draft error:", err);
    return NextResponse.json({ error: err.message || "Failed to save draft" }, { status: 500 });
  }
}
