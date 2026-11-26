import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import {
  MIN_PASSCODE_LENGTH,
  canCreatePasscodeHere,
  createFirstPasscode,
  missingPasscodeMessage,
} from "@/lib/passcode";

export const dynamic = "force-dynamic";

/**
 * Creates the very first passcode and signs this browser in. It only works on your own machine
 * and only while no passcode exists; after that, the passcode is changed from Settings.
 */
export async function POST(req: NextRequest) {
  if (!canCreatePasscodeHere()) {
    return NextResponse.json({ error: missingPasscodeMessage() }, { status: 403 });
  }

  let passcode = "";
  try {
    const body = await req.json();
    passcode = typeof body?.passcode === "string" ? body.passcode.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (passcode.length < MIN_PASSCODE_LENGTH) {
    return NextResponse.json(
      { error: `Use at least ${MIN_PASSCODE_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const created = await createFirstPasscode(passcode);
    if (!created) {
      return NextResponse.json({ error: "A passcode already exists. Sign in with it instead." }, { status: 409 });
    }
  } catch (err) {
    console.error("Passcode setup failed:", err);
    return NextResponse.json({ error: "Couldn’t save the passcode. Try again in a moment." }, { status: 503 });
  }

  setSessionCookie();
  return NextResponse.json({ ok: true });
}
