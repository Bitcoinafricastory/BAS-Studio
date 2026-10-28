import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateNewsletter } from "@/lib/newsletter/generate";
import { DATE_RE } from "@/lib/newsletter/week";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && /^[\w-]{1,80}$/.test(x)).slice(0, 15) : [];
  if (!ids.length) return NextResponse.json({ error: "Pick at least one article." }, { status: 400 });
  if (!DATE_RE.test(body?.start || "") || !DATE_RE.test(body?.end || "")) return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  try {
    const issue = await generateNewsletter(ids, body.start, body.end, typeof body.note === "string" ? body.note : "");
    return NextResponse.json({ issue });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to write the newsletter" }, { status: 500 });
  }
}
