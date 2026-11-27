"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Newspaper, Loader2 } from "lucide-react";
import Link from "next/link";
import LeadCard from "@/components/leads/LeadCard";
import { Page, PageHeader, EmptyState, ErrorBanner } from "@/components/ui/Page";
import type { Lead } from "@/types";
import { mergeLeads } from "@/lib/leads-merge";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [radarLoading, setRadarLoading] = useState(false);
  const [radarNote, setRadarNote] = useState("");
  const [error, setError] = useState("");

  // Feeds come back in seconds and show at once. The AI radars can take most of a minute, so
  // they load alongside and fill in when ready, without holding up the page.
  async function load() {
    setLoading(true);
    setRadarLoading(true);
    setRadarNote("");
    setError("");
    setLeads([]);

    const radar = fetch("/api/leads?part=radar")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "The AI radar didn't respond.");
        setLeads((current) => mergeLeads(current, data.leads || []));
        if (Array.isArray(data.notes) && data.notes.length) setRadarNote(data.notes.join(" "));
      })
      .catch((err: any) => setRadarNote(`AI radar skipped this time: ${err.message}`))
      .finally(() => setRadarLoading(false));

    try {
      const res = await fetch("/api/leads?part=feeds");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads((current) => mergeLeads(data.leads || [], current));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    await radar;
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Page>
      <PageHeader
        title="Leads"
        description="Fresh stories from your sources and the market radar. Discovery only: nothing is written until you choose to."
        action={
          <button onClick={load} disabled={loading || radarLoading} className="btn-secondary">
            {loading || radarLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading && leads.length === 0 && !error && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading leads">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
          <p className="text-center text-xs text-gray-600">Polling your sources…</p>
        </div>
      )}

      {!loading && (radarLoading || radarNote) && (
        <p className="mb-3 flex items-center gap-2 text-xs text-gray-500" aria-live="polite">
          {radarLoading && <Loader2 size={12} className="animate-spin" />}
          {radarLoading ? "Scanning the AI radar for the last 48 hours. Its leads will appear here when ready." : radarNote}
        </p>
      )}

      {!loading && !radarLoading && !error && leads.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title="No leads yet"
          body="Nothing new from your active sources in the last 48 hours. Check that your feeds are active, or add more."
          action={
            <Link href="/sources" className="btn-primary">
              Manage sources
            </Link>
          }
        />
      )}

      <div className="flex flex-col gap-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </Page>
  );
}
