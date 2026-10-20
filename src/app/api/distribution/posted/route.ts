import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

// The learning loop's raw material: what the generator wrote beside what the editor
// actually posted. Stored in Studio's own collection, separate from the site's `news`.
export async function GET(req: NextRequest) {
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");
    if (!articleId) return NextResponse.json({ error: "articleId is required" }, { status: 400 });
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
  try {
    const { articleId, outputId, draftText, postedText, postUrl } = await req.json();
    if (!articleId || !outputId || !postedText) {
      return NextResponse.json({ error: "articleId, outputId and postedText are required" }, { status: 400 });
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
