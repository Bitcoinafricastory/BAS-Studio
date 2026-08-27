import { NextRequest, NextResponse } from "next/server";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { transcribeFile } from "@/lib/transcribe";
import { getYoutubeTranscript } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 300; // local transcription can take a while

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const { youtubeUrl } = await req.json();
      if (!youtubeUrl) {
        return NextResponse.json({ error: "youtubeUrl is required" }, { status: 400 });
      }
      const result = await getYoutubeTranscript(youtubeUrl);
      return NextResponse.json(result);
    }

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      const dir = await mkdtemp(path.join(tmpdir(), "bas-upload-"));
      const ext = path.extname(file.name) || ".mp3";
      const filePath = path.join(dir, `audio${ext}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      try {
        const text = await transcribeFile(filePath);
        return NextResponse.json({ text, method: "whisper" });
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  } catch (err: any) {
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 });
  }
}



export const dynamic = "force-dynamic";
