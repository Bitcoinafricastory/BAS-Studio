import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  try {
    const draft = await req.json();
    if (!draft.title || !draft.content || !draft.category || !draft.excerpt) {
      return NextResponse.json(
        { error: "title, content, category, and excerpt are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    // sourceMaterial is BAS Studio-only bookkeeping — not part of the site's news schema.
    const { sourceMaterial, id, ...articleFields } = draft;

    const docRef = await db.collection("news").add({
      ...articleFields,
      status: "draft", // always lands as a draft — publishing stays in the existing dashboard
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err: any) {
    console.error("Send draft error:", err);
    return NextResponse.json({ error: err.message || "Failed to save draft" }, { status: 500 });
  }
}
