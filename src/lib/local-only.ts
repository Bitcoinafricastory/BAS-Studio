/**
 * Whisper, yt-dlp and ffmpeg run as programs on the machine Studio runs on. Vercel has none of
 * them, and it rejects request bodies over 4.5 MB, so these features only work when Studio runs
 * on your own computer (npm run dev). Calling this first turns a confusing failure into a
 * clear message.
 */
export function assertLocalTools(feature: string): void {
  if (process.env.VERCEL) {
    throw new LocalOnlyError(
      `${feature} runs Whisper on the computer Studio runs on, so it only works when you run Studio on your own computer (npm run dev), not on the hosted site. You can paste a transcript into Notes instead.`
    );
  }
}

export class LocalOnlyError extends Error {}
