import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import OpenAI from "openai";

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

// Never returns the key itself — only enough for the UI to show status.
export async function GET() {
  try {
    const envSet = !!process.env.XAI_API_KEY;
    let firestoreSet = false;
    if (!envSet) {
      const db = getAdminDb();
      const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
      firestoreSet = !!(snap.exists && snap.data()?.xaiApiKey);
    }
    return NextResponse.json({
      xai: envSet ? "env" : firestoreSet ? "app" : "none",
    });
  } catch (err: any) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { xaiApiKey } = await req.json();
    if (!xaiApiKey || typeof xaiApiKey !== "string" || !xaiApiKey.trim()) {
      return NextResponse.json({ error: "xaiApiKey is required" }, { status: 400 });
    }

    // Validate the key actually works before saving it — a cheap models.list() call
    // rather than a real completion, so this doesn't burn tokens just to check.
    try {
      const testClient = new OpenAI({ apiKey: xaiApiKey.trim(), baseURL: "https://api.x.ai/v1" });
      await testClient.models.list();
    } catch (err: any) {
      return NextResponse.json(
        { error: `That key didn't work against xAI's API: ${err.message || "unknown error"}` },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db
      .collection(SETTINGS_COLLECTION)
      .doc(SECRETS_DOC)
      .set({ xaiApiKey: xaiApiKey.trim() }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Settings POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save key" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = getAdminDb();
    await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).set({ xaiApiKey: null }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Settings DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to remove key" }, { status: 500 });
  }
}



export const dynamic = "force-dynamic";
