import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPasscode } from "@/lib/passcode";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (verifySessionToken(cookies().get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: true });
  }

  // If no passcode is configured anywhere (fresh install, or someone intentionally cleared
  // it to manage it from Settings), the gate would otherwise be an unrecoverable lock,
  // because Settings itself sits behind it. Treat "unconfigured" as "open" until a
  // passcode is actually set from either .env.local or the Settings screen.
  try {
    return NextResponse.json({ ok: !(await getPasscode()) });
  } catch (err) {
    console.error("Passcode check failed:", err);
    return NextResponse.json({ ok: false });
  }
}
