import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// These become part of a Firestore document id, which can't contain "/".
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// The learning loop's raw material: what the generator wrote beside what the editor
// actually posted. Stored in Studio's own collection, separate from the site's `news`.
export async function GET(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const articleId = req.nextUrl.searchParams.get("articleId");
    if (!articleId || !ID_RE.test(articleId)) return NextResponse.json({ error: "A valid articleId is required" }, { status: 400 });
    const snap = await getAdminDb().collection("distribution").where("articleId", "==", articleId).get();
    const posted: Record<string, { postedText: string; postUrl: string }> = {};
    snap.docs.forEach((d) => {
      const x = d.data();
      posted[x.outputId] = { postedText: x.postedText, postUrl: x.postUrl };
    });
    return NextResponse.json({ posted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const { articleId, outputId, draftText, postedText, postUrl } = await req.json();
    if (!articleId || !outputId || !postedText) {
      return NextResponse.json({ error: "articleId, outputId and postedText are required" }, { status: 400 });
    }
    if (!ID_RE.test(String(articleId)) || !ID_RE.test(String(outputId))) {
      return NextResponse.json({ error: "Invalid articleId or outputId" }, { status: 400 });
    }
    await getAdminDb()
      .collection("distribution")
      .doc(`${articleId}__${outputId}`)
      .set({
        articleId,
        outputId,
        draftText: draftText || "",
        postedText,
        edited: (draftText || "") !== postedText,
        postUrl: postUrl || "",
        postedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Mark posted error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
