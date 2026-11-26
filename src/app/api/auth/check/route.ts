import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canCreatePasscodeHere, getPasscode, missingPasscodeMessage } from "@/lib/passcode";
import { SESSION_COOKIE, explainSessionToken, secretSource, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Tells the lock screen what to show: the app (signed in), the passcode form, or first-time
 * setup when no passcode exists yet. "Unconfigured" no longer means "open".
 */
export async function GET() {
  if (verifySessionToken(cookies().get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: true });
  }

  // On Vercel preview copies only: say why the cookie was rejected and which key source is in
  // use (its name, never its value), to diagnose sign-ins that don't stick.
  const debug =
    process.env.VERCEL_ENV === "preview"
      ? {
          cookie: explainSessionToken(cookies().get(SESSION_COOKIE)?.value),
          keySource: secretSource(),
          instance: process.env.AWS_LAMBDA_LOG_STREAM_NAME ? "lambda" : "other",
        }
      : undefined;

  try {
    if (await getPasscode()) return NextResponse.json({ ok: false, debug });
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
