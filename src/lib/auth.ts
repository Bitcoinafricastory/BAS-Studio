import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPasscode } from "./passcode";

export const SESSION_COOKIE = "bas_studio_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

let ephemeralSecret: string | undefined;

/**
 * The key that signs session cookies. SESSION_SECRET wins if set. Otherwise it is derived from
 * the Firebase service account key, which is private and stable across deploys. As a last
 * resort (no Firebase either, so nothing sensitive is reachable anyway) it is random per start.
 * It is deliberately NOT derived from the passcode, so changing the passcode in Settings does
 * not sign you out of the device you changed it on.
 */
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return `bas-studio|${process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`;
  return (ephemeralSecret ||= randomBytes(32).toString("hex"));
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** A signed, expiring token. The old cookie was the literal text "ok", which anyone could type in. */
export function createSessionToken(now = Date.now()): string {
  const payload = `v1.${now + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const exp = Number(parts[1]);
  return Number.isFinite(exp) && exp > now;
}

/** Compares two secrets without leaking, through timing, how many characters matched. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Call at the top of every API handler. Returns a 401 response to send back, or null when the
 * request may continue. The passcode screen alone only hides the interface; without this check
 * anyone who knew a /api/ address could read or change data.
 *
 * Like the screen, it stays open while no passcode exists anywhere (a fresh install), so the
 * person can still reach Settings to create one. If the passcode can't be read because the
 * database errors, it refuses rather than guessing.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  if (verifySessionToken(cookies().get(SESSION_COOKIE)?.value)) return null;
  try {
    if (!(await getPasscode())) return null;
  } catch (err) {
    console.error("Could not verify access:", err);
    return NextResponse.json({ error: "Couldn’t verify access right now. Try again in a moment." }, { status: 503 });
  }
  return NextResponse.json({ error: "Not signed in. Enter your passcode to continue." }, { status: 401 });
}
