import { exec as execCb } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import path from "path";

const exec = promisify(execCb);

/**
 * Transcribes a local audio/video file using the `whisper` CLI (openai-whisper, installed via pip).
 * Requires ffmpeg and whisper on the machine's PATH — see README for setup.
 */
export async function transcribeFile(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));

  try {
    await exec(
      `whisper "${filePath}" --model base --output_format txt --output_dir "${dir}" --fp16 False`,
      { maxBuffer: 1024 * 1024 * 50 }
    );
  } catch (err: any) {
    throw new Error(
      "Local Whisper transcription failed. Make sure `whisper` is installed " +
        "(pip install -U openai-whisper) and ffmpeg is on your PATH. " +
        `Original error: ${err.message}`
    );
  }

  const txtPath = path.join(dir, `${base}.txt`);
  const text = await readFile(txtPath, "utf-8");
  return text.trim();
}
