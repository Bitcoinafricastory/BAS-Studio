import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { fetchAllFeeds } from "@/lib/feeds";
import { fetchMarketRadar } from "@/lib/market-radar";
import { fetchXRadar } from "@/lib/x-radar";
import { mergeLeads } from "@/lib/leads-merge";
import type { Lead, Source } from "@/types";
import { requireAuth } from "@/lib/auth";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Each AI radar gets this long before it's dropped, so one slow search can't run the whole
// request past the platform's time limit.
const RADAR_LIMIT_MS = 45_000;

function withinLimit(task: Promise<Lead[]>, label: string): Promise<Lead[]> {
  return Promise.race([
    task,
    new Promise<Lead[]>((resolve) =>
      setTimeout(() => {
        console.warn(`${label} took longer than ${RADAR_LIMIT_MS / 1000}s and was skipped.`);
        resolve([]);
      }, RADAR_LIMIT_MS)
    ),
  ]);
}

async function feedLeads(): Promise<Lead[]> {
  const snap = await getAdminDb().collection("sources").get();
  const sources = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Source, "id">) }));
  return fetchAllFeeds(sources);
}

const radarLeads = () =>
  Promise.all([withinLimit(fetchMarketRadar(), "Market radar"), withinLimit(fetchXRadar(), "X radar")]);

/**
 * ?part=feeds returns the RSS and news feeds, which take seconds. ?part=radar returns the two AI
 * radars, which can take most of a minute. The Leads screen asks for both at once and shows the
 * feeds as soon as they arrive. With no part, both come back together, as before.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  const part = new URL(req.url).searchParams.get("part");
  try {
    if (part === "feeds") return NextResponse.json({ leads: mergeLeads(await feedLeads()) });
    if (part === "radar") return NextResponse.json({ leads: mergeLeads(...(await radarLeads())) });
    const [feeds, [market, x]] = await Promise.all([feedLeads(), radarLeads()]);
    return NextResponse.json({ leads: mergeLeads(feeds, market, x) });
  } catch (err: any) {
    console.error("Leads GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load leads" }, { status: 500 });
  }
}
