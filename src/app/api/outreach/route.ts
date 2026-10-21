import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { applyAction, findOrg, isStatus, SEED_PROGRESS } from "@/lib/outreach/state";
import type { History, OutreachAction, Progress, ProgressMap } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

// One document per organisation (id = its slug) in the `outreach` collection. Studio has a
// shared passcode and no user accounts, so progress is the whole team's, not personal.
const COLLECTION = "outreach";

const HISTORY_KEYS = ["sent", "replied", "linked", "declined", "updated", "story", "noreply"] as const;

function toProgress(d: any): Progress {
  const h: History = {};
  for (const k of HISTORY_KEYS) if (typeof d?.history?.[k] === "string") h[k] = d.history[k];
  if (Array.isArray(d?.history?.followups)) h.followups = d.history.followups.filter((x: unknown) => typeof x === "string");
  return {
    status: isStatus(d?.status) ? d.status : "todo",
    note: typeof d?.note === "string" ? d.note : "",
    history: h,
    updatedAt: typeof d?.updatedAt === "string" ? d.updatedAt : undefined,
  };
}

export async function GET() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    // Progress carried over from the old tracker shows until the first edit writes its own doc.
    const progress: ProgressMap = { ...SEED_PROGRESS };
    for (const doc of snap.docs) progress[doc.id] = toProgress(doc.data());
    return NextResponse.json({ progress });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load outreach" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<OutreachAction> & { status?: unknown; note?: unknown };
    const slug = String(body.slug || "");
    if (!findOrg(slug)) return NextResponse.json({ error: "Unknown organisation" }, { status: 400 });

    let action: OutreachAction;
    if (body.type === "status" && isStatus(body.status)) action = { slug, type: "status", status: body.status };
    else if (body.type === "note" && typeof body.note === "string") action = { slug, type: "note", note: body.note.trim() };
    else if (body.type === "followup") action = { slug, type: "followup" };
    else return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const db = getAdminDb();
    const ref = db.collection(COLLECTION).doc(slug);
    // Transaction, so two people clicking at once can't overwrite each other's history.
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = snap.exists ? toProgress(snap.data()) : SEED_PROGRESS[slug];
      const updated = applyAction(prev, action, new Date().toISOString());
      // Firestore refuses `undefined`, so strip it with a JSON round-trip.
      tx.set(ref, JSON.parse(JSON.stringify(updated)));
      return updated;
    });
    return NextResponse.json({ progress: next });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
