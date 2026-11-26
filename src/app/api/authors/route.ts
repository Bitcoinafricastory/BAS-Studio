import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Active authors from the site's `authors` collection, for the byline picker on Edit & Send. */
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const snap = await getAdminDb().collection("authors").get();
    const authors = snap.docs
      .map((d) => ({
        id: d.id,
        name: String(d.get("name") || ""),
        slug: String(d.get("slug") || ""),
        isActive: d.get("isActive"),
      }))
      // The site stores isActive as the text "active" or "inactive"; missing means active.
      .filter((a) => a.name && a.isActive !== "inactive")
      .map(({ id, name, slug }) => ({ id, name, slug }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ authors });
  } catch (err: any) {
    console.error("Authors GET error:", err);
    return NextResponse.json({ error: "Couldn’t load authors." }, { status: 500 });
  }
}
