import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { DEFAULT_SOURCES } from "@/lib/sources";
import type { Source } from "@/types";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("sources").get();

    if (snap.empty) {
      const batch = db.batch();
      const seeded: Source[] = [];
      for (const s of DEFAULT_SOURCES) {
        const ref = db.collection("sources").doc();
        batch.set(ref, s);
        seeded.push({ id: ref.id, ...s });
      }
      await batch.commit();
      return NextResponse.json({ sources: seeded });
    }

    const sources = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Source, "id">) }));
    return NextResponse.json({ sources });
  } catch (err: any) {
    console.error("Sources GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load sources" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { label, url, type } = await req.json();
    if (!label || !url || !type) {
      return NextResponse.json({ error: "label, url, and type are required" }, { status: 400 });
    }
    const db = getAdminDb();
    const ref = await db.collection("sources").add({ label, url, type, active: true });
    return NextResponse.json({ id: ref.id, label, url, type, active: true });
  } catch (err: any) {
    console.error("Sources POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to add source" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, active } = await req.json();
    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ error: "id and active are required" }, { status: 400 });
    }
    const db = getAdminDb();
    await db.collection("sources").doc(id).update({ active });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Sources PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update source" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const db = getAdminDb();
    await db.collection("sources").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Sources DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete source" }, { status: 500 });
  }
}
