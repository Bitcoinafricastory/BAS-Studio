import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPasscode } from "@/lib/passcode";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = cookies().get("bas_studio_session");
  if (session?.value === "ok") {
    return NextResponse.json({ ok: true });
  }

  // If no passcode is configured anywhere (fresh install, or someone intentionally cleared
  // it to manage it from Settings), the gate would otherwise be an unrecoverable lock —
  // Settings itself sits behind this same gate. Treat "unconfigured" as "open" until a
  // passcode is actually set from either .env.local or the Settings screen.
  const configured = await getPasscode();
  return NextResponse.json({ ok: !configured });
}
