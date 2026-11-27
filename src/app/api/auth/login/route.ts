import { NextRequest, NextResponse } from "next/server";
import { getPasscode, missingPasscodeMessage } from "@/lib/passcode";
import { safeEqual, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Slows down guessing: 8 wrong tries per address, then a 10 minute pause. This lives in memory,
// so on Vercel each server instance counts separately. It raises the cost of guessing without
// being a complete defence, so pick a passcode that isn't a common word.
const MAX_TRIES = 8;
const WINDOW_MS = 10 * 60 * 1000;
const tries = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const now = Date.now();
  const entry = tries.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_TRIES) {
    return NextResponse.json({ error: "Too many wrong tries. Wait a few minutes and try again." }, { status: 429 });
  }
  // Count the try before anything is awaited. Counting only after a wrong answer let many
  // requests sent at once all pass the limit check above.
  const counted = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
  counted.count++;
  tries.set(key, counted);

  let passcode = "";
  try {
    const body = await req.json();
    passcode = typeof body?.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let expected: string | null;
  try {
    expected = await getPasscode();
  } catch (err: any) {
    console.error("Login: couldn't read the passcode:", err);
    return NextResponse.json({ error: "Couldn’t check the passcode right now. Try again in a moment." }, { status: 503 });
  }
  if (!expected) {
    return NextResponse.json({ error: missingPasscodeMessage() }, { status: 503 });
  }

  if (passcode && safeEqual(passcode, expected)) {
    tries.delete(key);
    setSessionCookie();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
}
