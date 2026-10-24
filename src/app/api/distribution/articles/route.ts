import { NextResponse } from "next/server";
import { listPublished } from "@/lib/distribution/article";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    return NextResponse.json({ articles: await listPublished(60) });
  } catch (err: any) {
    console.error("Distribution articles error:", err);
    return NextResponse.json({ error: err.message || "Failed to load articles" }, { status: 500 });
  }
}
