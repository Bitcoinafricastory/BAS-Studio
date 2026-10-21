import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { transcribeFile } from "./transcribe";

const execFile = promisify(execFileCb);

// https://x.com/i/spaces/1AbCdEfGhIjKl  (twitter.com and a trailing /peek also appear in the wild)
const SPACE_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/i\/spaces\/([A-Za-z0-9]{8,32})(?:[/?#].*)?$/;

export function parseSpaceUrl(input: string): string | null {
  const m = SPACE_RE.exec(input.trim());
  return m ? `https://x.com/i/spaces/${m[1]}` : null;
}

/**
 * Downloads the replay audio of an ended X Space with yt-dlp and transcribes it with Whisper.
 * Only works for Spaces whose host left the replay on, and only where yt-dlp, ffmpeg and
 * whisper are installed (your own machine, not Vercel).
 */
export async function getSpaceTranscript(rawUrl: string): Promise<{ text: string; method: "whisper" }> {
  const url = parseSpaceUrl(rawUrl);
  if (!url) throw new Error("That doesn’t look like an X Space link. It should look like https://x.com/i/spaces/…");

  const dir = await mkdtemp(path.join(tmpdir(), "bas-space-"));
  const audioPath = path.join(dir, "audio.mp3");
  try {
    try {
      // execFile, not exec: the URL is never interpreted by a shell.
      await execFile("yt-dlp", ["-x", "--audio-format", "mp3", "-o", audioPath, url], { maxBuffer: 1024 * 1024 * 50 });
    } catch (err: any) {
      const msg = String(err.stderr || err.message || "");
      if (/ENOENT/.test(String(err.code)) || /not found/i.test(msg)) {
        throw new Error(
          "yt-dlp isn’t installed here, so Studio can’t fetch the Space audio. Install it (pip install yt-dlp), or download the recording and use the Audio/Video tab, or paste the transcript into Notes.",
        );
      }
      if (/not (?:available|ended)|live|replay|no formats|private|unavailable/i.test(msg)) {
        throw new Error(
          "That Space has no downloadable replay. The host must have left the replay on and the Space must have ended. Use the Audio/Video tab with your own recording instead.",
        );
      }
      throw new Error(`Couldn’t download that Space. ${msg.split("\n").filter(Boolean).pop() || ""}`.trim());
    }
    const text = await transcribeFile(audioPath);
    return { text, method: "whisper" };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
