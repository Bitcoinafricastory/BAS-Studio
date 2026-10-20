// Server-only: the list of published BAS articles, used for real backlinks in drafts and
// for "has BAS covered this?" in research. Kept out of the voice index because it reads
// Firestore through the Admin SDK.
import { listPublished, articleUrl } from "../distribution/article";

export interface ArchiveEntry {
  title: string;
  url: string;
  category: string;
  date: string;
}

let cache: { at: number; entries: ArchiveEntry[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function getBasArchive(limit = 200): Promise<ArchiveEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries.slice(0, limit);
  try {
    const items = await listPublished(limit);
    const entries = items
      .filter((i) => i.slug && i.title)
      .map((i) => ({ title: i.title, url: articleUrl(i.slug), category: i.category, date: i.date }));
    cache = { at: Date.now(), entries };
    return entries;
  } catch (err) {
    console.error("Failed to load the BAS archive:", err);
    return [];
  }
}

export function archiveBlock(entries: ArchiveEntry[]): string {
  if (!entries.length) return "(The archive could not be loaded. Do not add any BAS links.)";
  return entries.map((e) => `${e.title} | ${e.url}`).join("\n");
}
