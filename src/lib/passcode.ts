import { getAdminDb } from "./firebase-admin";

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

/**
 * Resolves the passcode from either source: .env.local takes priority, falling back to
 * whatever's saved in Firestore via the in-app Settings screen. Returns null if neither
 * is set (which the login route treats as "gate not configured yet"). Throws if Firestore
 * can't be read, so callers never mistake an outage for "no passcode".
 */
export async function getPasscode(): Promise<string | null> {
  if (process.env.BAS_STUDIO_PASSCODE) return process.env.BAS_STUDIO_PASSCODE;
  // Without Firebase there is nowhere a passcode could be saved, and nothing sensitive to guard.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) return null;
  // A database error is thrown, not turned into "no passcode": that would unlock everything.
  const db = getAdminDb();
  const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
  const code = snap.exists ? snap.data()?.passcode : null;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}
