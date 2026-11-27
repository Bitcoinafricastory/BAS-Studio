import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth";
import { MIN_PASSCODE_LENGTH } from "@/lib/passcode";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";

const SETTINGS_COLLECTION = "settings";
const SECRETS_DOC = "secrets";

// Never returns actual secret values — only enough for the UI to show status.
export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const db = getAdminDb();
    const snap = await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).get();
    const data = snap.exists ? snap.data() || {} : {};

    const status = (envVar: string | undefined, firestoreValue: unknown) => {
      if (envVar) return "env";
      if (typeof firestoreValue === "string" && firestoreValue.trim()) return "app";
      return "none";
    };

    return NextResponse.json({
      anthropic: status(process.env.ANTHROPIC_API_KEY, data.anthropicApiKey),
      xai: status(process.env.XAI_API_KEY, data.xaiApiKey),
      passcode: status(process.env.BAS_STUDIO_PASSCODE, data.passcode),
    });
  } catch (err: any) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

type Field = "anthropicApiKey" | "xaiApiKey" | "passcode";

async function validate(field: Field, value: string): Promise<string | null> {
  try {
    if (field === "anthropicApiKey") {
      // Cheapest real validation: a 1-token completion. Anthropic's SDK has no lightweight
      // "list models" style check across all versions, so this is the reliable option.
      const client = new Anthropic({ apiKey: value });
      await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
    } else if (field === "xaiApiKey") {
      const client = new OpenAI({ apiKey: value, baseURL: "https://api.x.ai/v1" });
      await client.models.list();
    }
    // passcode has nothing to validate against an external API — any non-empty string is valid.
    return null;
  } catch (err: any) {
    return err.message || "Validation failed";
  }
}

const FIELD_LABEL: Record<Field, string> = {
  anthropicApiKey: "Anthropic",
  xaiApiKey: "xAI",
  passcode: "Passcode",
};

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const body = await req.json();
    const entry = (Object.entries(body ?? {}) as [string, unknown][]).find(([, v]) => typeof v === "string");
    if (!entry) {
      return NextResponse.json({ error: "No valid field provided" }, { status: 400 });
    }
    // Object.hasOwn, not `in`: `in` also matches inherited names like "constructor".
    if (!Object.hasOwn(FIELD_LABEL, entry[0])) {
      return NextResponse.json({ error: "Unknown field" }, { status: 400 });
    }
    const field = entry[0] as Field;
    const value = (entry[1] as string).trim();
    if (!value) {
      return NextResponse.json({ error: `${FIELD_LABEL[field]} value is required` }, { status: 400 });
    }
    if (field === "passcode" && value.length < MIN_PASSCODE_LENGTH) {
      return NextResponse.json(
        { error: `Use at least ${MIN_PASSCODE_LENGTH} characters for the passcode.` },
        { status: 400 }
      );
    }

    const validationError = await validate(field, value);
    if (validationError) {
      return NextResponse.json(
        { error: `That ${FIELD_LABEL[field]} value didn't work: ${validationError}` },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).set({ [field]: value }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Settings POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const field = searchParams.get("field");
    if (!field || !Object.hasOwn(FIELD_LABEL, field)) {
      return NextResponse.json({ error: "field query param is required" }, { status: 400 });
    }
    // Removing the passcode used to unlock the whole app for anyone. It can be changed, never removed.
    if (field === "passcode") {
      return NextResponse.json(
        { error: "The passcode can be changed but not removed. Studio stays locked without one." },
        { status: 400 }
      );
    }
    const db = getAdminDb();
    await db.collection(SETTINGS_COLLECTION).doc(SECRETS_DOC).set({ [field]: null }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Settings DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to remove" }, { status: 500 });
  }
}
