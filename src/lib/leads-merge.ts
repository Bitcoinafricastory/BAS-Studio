import type { Lead } from "@/types";

/**
 * The same story often arrives from several sources. Keep the first copy of each link, newest
 * first, and treat an unreadable date as "now" so it can't break the sort.
 */
export function mergeLeads(...groups: Lead[][]): Lead[] {
  const seen = new Set<string>();
  const stamp = (d: string) => {
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? t : Date.now();
  };
  return groups
    .flat()
    .filter((l) => {
      const key = (l.url || l.id).replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => stamp(b.publishedAt) - stamp(a.publishedAt));
}
