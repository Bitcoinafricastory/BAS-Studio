import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPasscode } from "@/lib/passcode";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, safeEqual } from "@/lib/auth";

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
    return NextResponse.json(
      { error: "No passcode is configured yet. Set one from Settings, or set BAS_STUDIO_PASSCODE in .env.local." },
      { status: 500 }
    );
  }

  if (passcode && safeEqual(passcode, expected)) {
    tries.delete(key);
    cookies().set(SESSION_COOKIE, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return NextResponse.json({ ok: true });
  }

  const fresh = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + WINDOW_MS };
  fresh.count++;
  tries.set(key, fresh);
  return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
}
