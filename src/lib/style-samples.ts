import { getAdminDb } from "./firebase-admin";
import { APPROVED_LEDES, htmlToText } from "./voice";

export interface StyleSample {
  title: string;
  headings: string[];
  excerpt: string;
}

// Articles the editor approved line by line come first; they are the best picture of the
// BAS voice. The rest of the slots go to the latest published articles.
const APPROVED_SLUGS = APPROVED_LEDES.map((l) => l.url.split("/news/")[1]).filter(Boolean);

function toSample(data: Record<string, any>): StyleSample {
  const html = String(data.content || "");
  const headings = Array.from(html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)).map((m) => htmlToText(m[1]));
  return {
    title: String(data.title || ""),
    headings,
    excerpt: htmlToText(html).slice(0, 1800),
  };
}

export async function getStyleSamples(limit = 5): Promise<StyleSample[]> {
  try {
    const db = getAdminDb();
    const samples: StyleSample[] = [];
    const seen = new Set<string>();

    if (APPROVED_SLUGS.length) {
      // A single-field "in" query needs no composite index.
      const approved = await db.collection("news").where("slug", "in", APPROVED_SLUGS.slice(0, 10)).get();
      approved.docs
        .filter((d) => d.data().status === "published")
        .forEach((d) => {
          seen.add(d.id);
          samples.push(toSample(d.data()));
        });
    }

    if (samples.length < limit) {
      // Order on one field and filter status in memory, so no composite index is needed.
      const latest = await db.collection("news").orderBy("createdAt", "desc").limit(30).get();
      latest.docs
        .filter((d) => d.data().status === "published" && !seen.has(d.id))
        .slice(0, limit - samples.length)
        .forEach((d) => samples.push(toSample(d.data())));
    }

    return samples.slice(0, limit);
  } catch (err) {
    console.error("Failed to load style samples:", err);
    return [];
  }
}

export function styleSamplesBlock(samples: StyleSample[]): string {
  if (!samples.length) return "(No published articles could be loaded. Rely on the approved examples.)";
  return samples
    .map((s, i) => `--- Sample ${i + 1}: "${s.title}" ---\nSections: ${s.headings.join(" | ") || "(none)"}\n${s.excerpt}`)
    .join("\n\n");
}
