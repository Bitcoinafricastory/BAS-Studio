import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canCreatePasscodeHere, getPasscode, missingPasscodeMessage } from "@/lib/passcode";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Tells the lock screen what to show: the app (signed in), the passcode form, or first-time
 * setup when no passcode exists yet. "Unconfigured" no longer means "open".
 */
export async function GET() {
  if (verifySessionToken(cookies().get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (await getPasscode()) return NextResponse.json({ ok: false });
    return NextResponse.json({
      ok: false,
      setup: canCreatePasscodeHere() ? "here" : "environment",
      message: missingPasscodeMessage(),
    });
  } catch (err) {
    console.error("Passcode check failed:", err);
    return NextResponse.json({ ok: false });
  }
}
