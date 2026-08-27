import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  if (!process.env.BAS_STUDIO_PASSCODE) {
    return NextResponse.json(
      { error: "BAS_STUDIO_PASSCODE is not set on the server" },
      { status: 500 }
    );
  }

  if (passcode === process.env.BAS_STUDIO_PASSCODE) {
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



export const dynamic = "force-dynamic";
