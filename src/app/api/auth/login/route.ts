import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPasscode } from "@/lib/passcode";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  const expected = await getPasscode();
  if (!expected) {
    return NextResponse.json(
      { error: "No passcode is configured yet. Set one from Settings, or set BAS_STUDIO_PASSCODE in .env.local." },
      { status: 500 }
    );
  }

  if (passcode === expected) {
    cookies().set("bas_studio_session", "ok", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
}
