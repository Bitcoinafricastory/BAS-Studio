import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchAllFeeds } from "@/lib/feeds";
import { fetchMarketRadar } from "@/lib/market-radar";
import { fetchXRadar } from "@/lib/x-radar";
import type { Source } from "@/types";
import { requireAuth } from "@/lib/auth";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";
// Web-search research and the live radars take longer than the platform default allows.
export const maxDuration = 60;


export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

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

    // The same story often arrives from several feeds. Keep the first copy of each link, and treat
    // an unreadable date as "now" so it can't break the sort.
    const seen = new Set<string>();
    const stamp = (d: string) => {
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : Date.now();
    };
    const leads = [...feedLeads, ...radarLeads, ...xRadarLeads]
      .filter((l) => {
        const key = (l.url || l.id).replace(/[?#].*$/, "").replace(/\/$/, "").toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => stamp(b.publishedAt) - stamp(a.publishedAt));

    return NextResponse.json({ leads });
  } catch (err: any) {
    console.error("Leads GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load leads" }, { status: 500 });
  }
}
