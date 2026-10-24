import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { listMeetings, readTranscript, saveAndTranscribe, transcribeSaved } from "@/lib/meetings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const text = await readTranscript(id);
      if (text === null) return NextResponse.json({ error: "No transcript found for that meeting" }, { status: 404 });
      return NextResponse.json({ id, text });
    }
    return NextResponse.json({ meetings: await listMeetings() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // JSON body {id}: transcribe a recording that's already saved but has no transcript.
    if ((req.headers.get("content-type") || "").includes("application/json")) {
      const { id, language } = await req.json();
      return NextResponse.json({ ...(await transcribeSaved(String(id || ""), language ? String(language) : undefined)), method: "whisper" });
    }
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
    const title = String(form.get("title") || "").slice(0, 80);
    const language = form.get("language") ? String(form.get("language")) : undefined;
    const result = await saveAndTranscribe(Buffer.from(await file.arrayBuffer()), path.extname(file.name) || ".webm", title, language);
    return NextResponse.json({ id: result.id, text: result.text, folder: result.dir, method: "whisper" });
  } catch (err: any) {
    console.error("Meeting error:", err);
    return NextResponse.json({ error: err.message || "Failed to save the meeting" }, { status: 500 });
  }
}
