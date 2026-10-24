import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { transcribeFile } from "./transcribe";

// Each recording gets its own folder, like  meeting-20261024-081500_BLINK_SYNC/
//   audio.webm  +  transcript.txt
// The location is MEETINGS_DIR, or ~/bas-studio-meetings. This only works when Studio runs on
// a computer with a real disk and Whisper installed. Vercel's disk is temporary and has no Whisper.

export const meetingsDir = () => process.env.MEETINGS_DIR || path.join(os.homedir(), "bas-studio-meetings");

export const ID_RE = /^meeting-\d{8}-\d{6}(?:_[A-Z0-9_]{1,60})?$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function makeId(title: string, now = new Date()): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
    .slice(0, 60);
  return slug ? `meeting-${stamp}_${slug}` : `meeting-${stamp}`;
}

export function assertWritable() {
  if (process.env.VERCEL) {
    throw new Error(
      "Meeting recording saves to a folder and runs Whisper, so it only works when Studio runs on your own computer (npm run dev), not on the Vercel site.",
    );
  }
}

export interface MeetingSummary {
  id: string;
  title: string;
  createdAt: string;
  hasTranscript: boolean;
}

const titleOf = (id: string) => {
  const m = /^meeting-\d{8}-\d{6}_?(.*)$/.exec(id);
  return m && m[1] ? m[1].replace(/_/g, " ") : "Untitled meeting";
};

function dateOf(id: string): string {
  const m = /^meeting-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(id);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).toISOString() : "";
}

export async function listMeetings(): Promise<MeetingSummary[]> {
  let names: string[] = [];
  try {
    names = await readdir(meetingsDir());
  } catch {
    return []; // nothing recorded yet
  }
  const out: MeetingSummary[] = [];
  for (const id of names.filter((n) => ID_RE.test(n))) {
    const hasTranscript = await stat(path.join(meetingsDir(), id, "transcript.txt")).then(
      () => true,
      () => false,
    );
    out.push({ id, title: titleOf(id), createdAt: dateOf(id), hasTranscript });
  }
  return out.sort((a, b) => b.id.localeCompare(a.id)).slice(0, 100);
}

export async function readTranscript(id: string): Promise<string | null> {
  if (!ID_RE.test(id)) return null;
  try {
    return await readFile(path.join(meetingsDir(), id, "transcript.txt"), "utf-8");
  } catch {
    return null;
  }
}

/** Transcribes a meeting that was recorded earlier but has no transcript yet (for example, Whisper failed the first time). */
export async function transcribeSaved(id: string, language?: string) {
  assertWritable();
  if (!ID_RE.test(id)) throw new Error("Invalid meeting id");
  const dir = path.join(meetingsDir(), id);
  const files = await readdir(dir).catch(() => [] as string[]);
  const audio = files.find((f) => /^audio\.[a-z0-9]{2,5}$/i.test(f));
  if (!audio) throw new Error("No audio file was found in that meeting’s folder.");
  const text = await transcribeFile(path.join(dir, audio), language);
  await writeFile(path.join(dir, "transcript.txt"), text + "\n");
  await rm(path.join(dir, audio.replace(/\.[^.]+$/, ".txt")), { force: true });
  return { id, text };
}

export async function saveAndTranscribe(audio: Buffer, ext: string, title: string, language?: string) {
  assertWritable();
  const id = makeId(title);
  const dir = path.join(meetingsDir(), id);
  await mkdir(dir, { recursive: true });
  const safeExt = /^\.[a-z0-9]{2,5}$/i.test(ext) ? ext.toLowerCase() : ".webm";
  const audioPath = path.join(dir, `audio${safeExt}`);
  // The audio is written first, so a failed transcription never loses the recording.
  await writeFile(audioPath, audio);
  try {
    const text = await transcribeFile(audioPath, language);
    await writeFile(path.join(dir, "transcript.txt"), text + "\n");
    await rm(path.join(dir, "audio.txt"), { force: true });
    return { id, text, dir };
  } catch (err: any) {
    throw new Error(`${err.message} The recording was saved in ${dir}, so you can transcribe it again later.`);
  }
}
