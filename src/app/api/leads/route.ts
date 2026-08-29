import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchAllFeeds } from "@/lib/feeds";
import { fetchMarketRadar } from "@/lib/market-radar";
import { fetchXRadar } from "@/lib/x-radar";
import type { Source } from "@/types";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";


export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await db.collection("sources").get();
    const sources = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Source, "id">) }));

    // Feeds, Claude's web-search radar, and Grok's X radar all run in parallel. Each fails
    // closed on its own (dead feed, missing API key, etc.) — one source failing never takes
    // down the others.
    const [feedLeads, radarLeads, xRadarLeads] = await Promise.all([
      fetchAllFeeds(sources),
      fetchMarketRadar(),
      fetchXRadar(),
    ]);

    const leads = [...feedLeads, ...radarLeads, ...xRadarLeads].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error("Leads GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load leads" }, { status: 500 });
  }
}
