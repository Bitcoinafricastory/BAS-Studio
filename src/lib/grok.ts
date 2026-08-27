import OpenAI from "openai";
import { getAdminDb } from "./firebase-admin";

// xAI's API is OpenAI-compatible. As of Jan 12 2026, the old Live Search API
// (search_parameters) is retired — this uses the current Responses API with
// dedicated x_search / web_search tools instead.

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

/**
 * Resolves the xAI key from either source: .env.local takes priority (the more secure
 * option — never leaves your machine), falling back to whatever's saved in Firestore via
 * the in-app Settings screen. Returns null if neither is set.
 */
export async function getXaiApiKey(): Promise<string | null> {
  if (process.env.XAI_API_KEY) return process.env.XAI_API_KEY;
  try {
    const db = getAdminDb();
    const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
    const key = snap.exists ? snap.data()?.xaiApiKey : null;
    return typeof key === "string" && key.trim() ? key.trim() : null;
  } catch (err) {
    console.error("Failed to read xAI key from Firestore settings:", err);
    return null;
  }
}

export async function getGrok(): Promise<OpenAI> {
  const apiKey = await getXaiApiKey();
  if (!apiKey) {
    throw new Error(
      "No xAI API key configured. Add it from Settings in the app, or set XAI_API_KEY in .env.local."
    );
  }
  return new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
}

// Update this if xAI ships a newer model — check https://docs.x.ai for current names.
export const DEFAULT_GROK_MODEL = "grok-4.6";

// The Responses API returns a convenience `output_text` field in most SDK versions;
// this falls back to walking `output` for text content blocks if that's absent.
export function extractGrokText(response: any): string {
  if (typeof response.output_text === "string" && response.output_text) {
    return response.output_text;
  }
  const output = response.output || [];
  return output
    .flatMap((item: any) => item.content || [])
    .filter((c: any) => c.type === "output_text" || c.type === "text")
    .map((c: any) => c.text)
    .join("\n");
}
