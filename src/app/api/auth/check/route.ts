import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const session = cookies().get("bas_studio_session");
  return NextResponse.json({ ok: session?.value === "ok" });
}

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";
