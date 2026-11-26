import { getAdminDb } from "./firebase-admin";

/**
 * The site's directory ("entities" collection). Articles link profiles by slug in
 * linkedEntityIds, which is what fills "Related Coverage" on each profile.
 */
export interface DirectoryEntity {
  slug: string;
  name: string;
}

const normalize = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

export async function getDirectoryEntities(): Promise<DirectoryEntity[]> {
  const snap = await getAdminDb().collection("entities").select("name", "slug").get();
  return snap.docs
    .map((d) => ({ slug: String(d.get("slug") || ""), name: String(d.get("name") || "") }))
    .filter((e) => e.slug && e.name);
}

/**
 * Matches names the draft mentions to directory profiles. Only exact matches (ignoring case,
 * accents, spaces and punctuation) are linked, so a near miss never links the wrong profile.
 * Names with no profile come back unmatched, for the editor to handle in the dashboard.
 */
export async function matchDirectoryEntities(
  names: string[]
): Promise<{ linked: DirectoryEntity[]; unmatched: string[] }> {
  const wanted = names.filter((n) => typeof n === "string" && n.trim());
  if (!wanted.length) return { linked: [], unmatched: [] };
  let entities: DirectoryEntity[];
  try {
    entities = await getDirectoryEntities();
  } catch (err) {
    console.error("Could not load directory profiles:", err);
    return { linked: [], unmatched: wanted };
  }
  const byKey = new Map<string, DirectoryEntity>();
  for (const e of entities) {
    byKey.set(normalize(e.name), e);
    byKey.set(normalize(e.slug), e);
  }
  const linked = new Map<string, DirectoryEntity>();
  const unmatched: string[] = [];
  for (const name of wanted) {
    const hit = byKey.get(normalize(name));
    if (hit) linked.set(hit.slug, hit);
    else unmatched.push(name);
  }
  return { linked: [...linked.values()], unmatched };
}
