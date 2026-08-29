import Anthropic from "@anthropic-ai/sdk";
import { getAdminDb } from "./firebase-admin";

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

/**
 * Resolves the Anthropic key from either source: .env.local takes priority (never leaves
 * your machine), falling back to whatever's saved in Firestore via the in-app Settings
 * screen. Returns null if neither is set.
 */
export async function getAnthropicApiKey(): Promise<string | null> {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const db = getAdminDb();
    const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
    const key = snap.exists ? snap.data()?.anthropicApiKey : null;
    return typeof key === "string" && key.trim() ? key.trim() : null;
  } catch (err) {
    console.error("Failed to read Anthropic key from Firestore settings:", err);
    return null;
  }
}

export async function getAnthropic(): Promise<Anthropic> {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    throw new Error(
      "No Anthropic API key configured. Add it from Settings in the app, or set ANTHROPIC_API_KEY in .env.local."
    );
  }
  return new Anthropic({ apiKey });
}

export const DEFAULT_MODEL = "claude-sonnet-4-6";
