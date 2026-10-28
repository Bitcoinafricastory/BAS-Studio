import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireAuth } from "@/lib/auth";
import { DATE_RE } from "@/lib/newsletter/week";

export const dynamic = "force-dynamic";

// Saved issues live in the `newsletters` collection.
const COLLECTION = "newsletters";
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

function sanitize(b: any) {
  const items = Array.isArray(b?.items) ? b.items.slice(0, 20) : [];
  return {
    subjects: (Array.isArray(b?.subjects) ? b.subjects : []).slice(0, 5).map((s: unknown) => str(s, 200)),
    subject: str(b?.subject, 200),
    preheader: str(b?.preheader, 300),
    intro: str(b?.intro, 3000),
    closing: str(b?.closing, 3000),
    weekStart: DATE_RE.test(b?.weekStart || "") ? b.weekStart : "",
    weekEnd: DATE_RE.test(b?.weekEnd || "") ? b.weekEnd : "",
    items: items.map((i: any) => ({
      id: str(i?.id, 80),
      title: str(i?.title, 300),
      url: /^https?:\/\//i.test(i?.url || "") ? str(i.url, 500) : "",
      author: str(i?.author, 120),
      category: str(i?.category, 80),
      image: /^https?:\/\//i.test(i?.image || "") ? str(i.image, 800) : "",
      blurb: str(i?.blurb, 2000),
    })),
  };
}

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const snap = await getAdminDb().collection(COLLECTION).orderBy("updatedAt", "desc").limit(40).get();
    return NextResponse.json({ issues: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load issues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = typeof body?.id === "string" && body.id ? body.id : "";
  if (id && !ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const col = getAdminDb().collection(COLLECTION);
    const now = new Date().toISOString();
    const data = sanitize(body.issue);
    if (id) {
      await col.doc(id).set({ ...data, updatedAt: now }, { merge: true });
      return NextResponse.json({ id });
    }
    const ref = await col.add({ ...data, createdAt: now, updatedAt: now });
    return NextResponse.json({ id: ref.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
