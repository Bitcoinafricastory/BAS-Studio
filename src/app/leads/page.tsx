"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Newspaper, Loader2 } from "lucide-react";
import Link from "next/link";
import LeadCard from "@/components/leads/LeadCard";
import { Page, PageHeader, EmptyState, ErrorBanner } from "@/components/ui/Page";
import type { Lead } from "@/types";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(data.leads);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <button onClick={load} disabled={loading} className="btn-secondary">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading && leads.length === 0 && !error && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading leads">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
          <p className="text-center text-xs text-gray-600">Polling your sources and scanning the last 48 hours…</p>
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
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
