import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ChatMessage } from "@/types/chat";

export const dynamic = "force-dynamic";

// Chats live in their own Firestore collection, separate from the site's `news`.
// Studio has one shared passcode rather than user accounts, so the history is shared by
// whoever can open Studio: it is the newsroom's history, not a personal one.
const COLLECTION = "chats";
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;
const MAX_MESSAGES = 200;
const MAX_RESEARCH_BYTES = 200_000;

function iso(v: any): string {
  try {
    return v?.toDate ? v.toDate().toISOString() : "";
  } catch {
    return "";
  }
}

function cleanMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input.slice(-MAX_MESSAGES).map((m: any) => {
    const out: ChatMessage = {
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content ?? "").slice(0, 30000),
    };
    if (m?.error) out.error = true;
    if (m?.research && typeof m.research === "object") {
      // JSON round-trip drops `undefined`, which Firestore refuses to store.
      const json = JSON.stringify(m.research);
      if (json.length < MAX_RESEARCH_BYTES) out.research = JSON.parse(json);
    }
    return out;
  });
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content.replace(/\s+/g, " ").trim() || "New chat";
  return first.length > 60 ? first.slice(0, 57).trimEnd() + "…" : first;
}

export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const id = req.nextUrl.searchParams.get("id");

    if (id) {
      if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
      const snap = await db.collection(COLLECTION).doc(id).get();
      if (!snap.exists) return NextResponse.json({ error: "That chat no longer exists" }, { status: 404 });
      const d = snap.data() || {};
      return NextResponse.json({
        chat: {
          id: snap.id,
          title: d.title || "New chat",
          provider: d.provider === "grok" ? "grok" : "claude",
          messages: cleanMessages(d.messages),
          updatedAt: iso(d.updatedAt),
        },
      });
    }

    // Ordering on one field needs no composite index.
    const snap = await db.collection(COLLECTION).orderBy("updatedAt", "desc").limit(100).get();
    const chats = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || "New chat",
        updatedAt: iso(d.updatedAt),
        count: Array.isArray(d.messages) ? d.messages.length : 0,
      };
    });
    return NextResponse.json({ chats });
  } catch (err: any) {
    console.error("Chats GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load chats" }, { status: 500 });
  }
}

// Create or update a chat. The browser picks the id, so two quick saves can never create
// two documents for the same conversation.
export async function POST(req: NextRequest) {
  try {
    const { id, messages, provider } = await req.json();
    if (!ID_RE.test(String(id))) return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    const clean = cleanMessages(messages);
    if (clean.length === 0) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    const ref = getAdminDb().collection(COLLECTION).doc(id);
    const existing = await ref.get();
    const data: Record<string, any> = {
      messages: clean,
      provider: provider === "grok" ? "grok" : "claude",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!existing.exists) {
      data.title = deriveTitle(clean); // a renamed chat keeps its name on later saves
      data.createdAt = FieldValue.serverTimestamp();
    }
    await ref.set(data, { merge: true });
    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    console.error("Chats POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save chat" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, title } = await req.json();
    const t = String(title ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
    if (!ID_RE.test(String(id)) || !t) return NextResponse.json({ error: "A chat id and title are required" }, { status: 400 });
    await getAdminDb().collection(COLLECTION).doc(id).update({ title: t });
    return NextResponse.json({ ok: true, title: t });
  } catch (err: any) {
    console.error("Chats PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to rename chat" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (!ID_RE.test(id)) return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Chats DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete chat" }, { status: 500 });
  }
}
