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
          // Present / empty / missing for each setting, by name only. Never the values.
          env: Object.fromEntries(
            [
              "SESSION_SECRET",
              "FIREBASE_SERVICE_ACCOUNT_KEY",
              "BAS_STUDIO_PASSCODE",
              "ANTHROPIC_API_KEY",
              "XAI_API_KEY",
              "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
            ].map((k) => [k, k in process.env ? (process.env[k] ? "present" : "empty") : "missing"])
          ),
          gitBranch: process.env.VERCEL_GIT_COMMIT_REF || "",
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
