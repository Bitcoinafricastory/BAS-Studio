import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listPublished } from "@/lib/distribution/article";
import { DATE_RE, inWeek } from "@/lib/newsletter/week";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const start = req.nextUrl.searchParams.get("start") || "";
  const end = req.nextUrl.searchParams.get("end") || "";
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  try {
    const all = await listPublished(120);
    const articles = all.filter((a) => inWeek(a.date, start, end)).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ articles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load articles" }, { status: 500 });
  }
}
