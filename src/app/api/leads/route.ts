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

/** A short, plain reason for a radar failure, shown on the Leads screen. */
function reasonFor(label: string, err: any): string {
  const msg = String(err?.error?.error?.message || err?.message || err || "");
  if (/credit balance is too low/i.test(msg)) return `${label} is off: the Anthropic account has run out of credit. Top it up at console.anthropic.com, under Plans & Billing.`;
  if (/No xAI API key/i.test(msg)) return `${label} is off: no xAI key is set.`;
  if (/api key|authentication|401/i.test(msg)) return `${label} is off: its API key was rejected.`;
  return `${label} failed: ${msg.slice(0, 160)}`;
}

/**
 * Runs one radar with a time limit. Resolves with its leads, or with none and a note saying why
 * (too slow, out of credit, no key), so one radar never holds up or breaks the screen.
 */
function withinLimit(task: () => Promise<Lead[]>, label: string): Promise<{ leads: Lead[]; note?: string }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`${label} took longer than ${RADAR_LIMIT_MS / 1000}s and was skipped.`);
      resolve({ leads: [], note: `${label} took too long and was skipped this time.` });
    }, RADAR_LIMIT_MS);
    task()
      .then((leads) => resolve({ leads }))
      .catch((err) => resolve({ leads: [], note: reasonFor(label, err) }))
      .finally(() => clearTimeout(timer));
  });
}

async function feedLeads(): Promise<Lead[]> {
  const snap = await getAdminDb().collection("sources").get();
  const sources = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Source, "id">) }));
  return fetchAllFeeds(sources);
}

async function radarLeads(): Promise<{ market: Lead[]; x: Lead[]; notes: string[] }> {
  const [m, x] = await Promise.all([withinLimit(fetchMarketRadar, "The AI radar"), withinLimit(fetchXRadar, "The X radar")]);
  return { market: m.leads, x: x.leads, notes: [m.note, x.note].filter((n): n is string => !!n) };
}

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
    if (part === "radar") {
      const { market, x, notes } = await radarLeads();
      return NextResponse.json({ leads: mergeLeads(market, x), notes });
    }
    const [feeds, { market, x, notes }] = await Promise.all([feedLeads(), radarLeads()]);
    return NextResponse.json({ leads: mergeLeads(feeds, market, x), notes });
  } catch (err: any) {
    console.error("Leads GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load leads" }, { status: 500 });
  }
}
