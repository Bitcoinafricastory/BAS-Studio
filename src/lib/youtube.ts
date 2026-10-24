import { YoutubeTranscript } from "youtube-transcript";
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { transcribeFile } from "./transcribe";

const execFile = promisify(execFileCb);

export interface YoutubeTranscriptResult {
  text: string;
  method: "captions" | "whisper";
}

export async function getYoutubeTranscript(url: string): Promise<YoutubeTranscriptResult> {
  // The address is passed to a program, so only a plain web address is allowed through.
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("protocol");
  } catch {
    throw new Error("That doesn’t look like a web address. Paste the full YouTube link, starting with https://");
  }
  // Fast path: most videos already have captions — no download or transcription needed.
  try {
    const segments = await YoutubeTranscript.fetchTranscript(url);
    const text = segments
      .map((s) => s.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) return { text, method: "captions" };
  } catch (err) {
    console.warn("YouTube captions unavailable, falling back to audio download + Whisper:", err);
  }

  // Fallback: download audio with yt-dlp, transcribe locally with Whisper.
  const dir = await mkdtemp(path.join(tmpdir(), "bas-yt-"));
  const audioPath = path.join(dir, "audio.mp3");
  try {
    try {
      // execFile with an argument list: the link is never read by a shell, so quotes or ; in it can't run commands.
      await execFile("yt-dlp", ["-x", "--audio-format", "mp3", "-o", audioPath, "--", url], {
        maxBuffer: 1024 * 1024 * 50,
      });
    } catch (err: any) {
      throw new Error(
        "This video has no captions, and downloading the audio failed. Make sure `yt-dlp` is " +
          `installed (pip install yt-dlp). Original error: ${err.message}`
      );
    }
    const text = await transcribeFile(audioPath);
    return { text, method: "whisper" };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
