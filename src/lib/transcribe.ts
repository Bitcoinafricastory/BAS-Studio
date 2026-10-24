import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import path from "path";

const execFile = promisify(execFileCb);

/**
 * Whisper writes download and transcription progress bars to stderr. Those are noise in an
 * error message, so this keeps only the lines that explain what went wrong.
 */
export function cleanWhisperError(stderr: string): string {
  const lines = stderr
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !/\d+%\|/.test(l) && // tqdm bars: "45%|████ | 62M/139M"
        !/[█▏▎▍▌▋▊▉]/.test(l) &&
        !/\b(it|B|KiB|MiB|MB|iB)\/s\b/.test(l) &&
        !/^\d+(\.\d+)?[kMG]?\/\d+(\.\d+)?[kMG]?\s*\[/.test(l),
    );
  return lines.slice(-6).join("\n");
}

/**
 * Transcribes a local audio/video file using the `whisper` CLI (openai-whisper, installed via pip).
 * Requires ffmpeg and whisper on the machine's PATH — see README for setup.
 *
 * Optional env vars (in .env.local):
 *   WHISPER_BIN       full path to the whisper command, if the one Studio finds isn't yours
 *   WHISPER_MODEL     tiny | base | small | medium | large (default: base)
 *   WHISPER_LANGUAGE  e.g. en, fr, sw. Skips language detection, which is faster and steadier
 */
export async function transcribeFile(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const bin = process.env.WHISPER_BIN || "whisper";
  const model = process.env.WHISPER_MODEL || "base";

  const args = [filePath, "--model", model, "--output_format", "txt", "--output_dir", dir, "--fp16", "False"];
  if (process.env.WHISPER_LANGUAGE) args.push("--language", process.env.WHISPER_LANGUAGE);

  try {
    // execFile, not exec: no shell, so file names can't break the command.
    await execFile(bin, args, { maxBuffer: 1024 * 1024 * 200 });
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      throw new Error(
        `Studio can't find the \`${bin}\` command. Install it (pip install -U openai-whisper) or set WHISPER_BIN in .env.local to its full path (run \`which whisper\` in your terminal to find it), then restart npm run dev.`,
      );
    }
    const detail = cleanWhisperError(String(err?.stderr || err?.message || ""));
    throw new Error(
      `Whisper stopped before finishing. ${detail || "No details were reported."}\n` +
        "Check that ffmpeg is installed and that Whisper has downloaded its model (run `whisper --model " +
        model +
        " yourfile.mp3` once in a terminal).",
    );
  }

  const txtPath = path.join(dir, `${base}.txt`);
  const text = await readFile(txtPath, "utf-8");
  return text.trim();
}
