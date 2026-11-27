import { getAdminDb } from "./firebase-admin";

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

/** New or changed passcodes must be at least this long. Existing ones keep working. */
export const MIN_PASSCODE_LENGTH = 10;

/** True on Vercel, where anyone on the internet can reach the app. */
export function isHosted(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Whether the first passcode can be created from the app itself. Only on your own machine, and
 * only when there is a database to save it in. On a hosted copy the first visitor would get to
 * choose it, so there it has to come from the environment instead.
 */
export function canCreatePasscodeHere(): boolean {
  return !isHosted() && Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
}

/** What to tell someone when no passcode exists yet. */
export function missingPasscodeMessage(): string {
  if (isHosted()) {
    return "Studio has no passcode yet, so it stays locked. Add BAS_STUDIO_PASSCODE in Vercel's environment variables, then redeploy.";
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return "Studio has no passcode yet. Add BAS_STUDIO_PASSCODE to .env.local and restart Studio.";
  }
  return "Studio has no passcode yet. Create one to start.";
}

/**
 * Resolves the passcode from either source: .env.local takes priority, falling back to
 * whatever's saved in Firestore via the in-app Settings screen. Returns null if neither
 * is set. Throws if Firestore can't be read, so callers never mistake an outage for
 * "no passcode".
 */
export async function getPasscode(): Promise<string | null> {
  if (process.env.BAS_STUDIO_PASSCODE) return process.env.BAS_STUDIO_PASSCODE;
  // Without Firebase there is nowhere a passcode could be saved.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return null;
  // A database error is thrown, not turned into "no passcode".
  const db = getAdminDb();
  const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
  const code = snap.exists ? snap.data()?.passcode : null;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

/**
 * Saves the first passcode, but only if none exists yet. Runs in a transaction so two people
 * racing to set it can't both succeed. Returns false when a passcode was already there.
 */
export async function createFirstPasscode(code: string): Promise<boolean> {
  if (process.env.BAS_STUDIO_PASSCODE) return false;
  const db = getAdminDb();
  const ref = db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? snap.data()?.passcode : null;
    if (typeof existing === "string" && existing.trim()) return false;
    tx.set(ref, { passcode: code }, { merge: true });
    return true;
  });
}
