import { getAdminDb } from "./firebase-admin";

export interface StyleSample {
  title: string;
  excerpt: string;
}

export async function getStyleSamples(limit = 5): Promise<StyleSample[]> {
  try {
    const db = getAdminDb();
    const snap = await db
      .collection("news")
      .where("status", "==", "published")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        title: data.title || "",
        excerpt: stripHtml(data.content || "").slice(0, 1200),
      };
    });
  } catch (err) {
    // If this query needs a Firestore composite index the first time it runs, Firestore's error
    // includes a direct console link to create it — check server logs if style samples come back empty.
    console.error("Failed to load style samples:", err);
    return [];
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
