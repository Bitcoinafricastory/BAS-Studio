"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Rss, Newspaper, Loader2 } from "lucide-react";
import { Page, PageHeader, EmptyState, ErrorBanner } from "@/components/ui/Page";
import type { Source } from "@/types";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"rss" | "google-news">("rss");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sources");
      setSources(data.sources);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim() || adding) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), url: url.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add source");
      setSources((s) => [...s, data]);
      setLabel("");
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(source: Source) {
    // Optimistic, but rolled back if the save fails so the screen never lies.
    setSources((s) => s.map((x) => (x.id === source.id ? { ...x, active: !x.active } : x)));
    try {
      const res = await fetch("/api/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source.id, active: !source.active }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSources((s) => s.map((x) => (x.id === source.id ? { ...x, active: source.active } : x)));
      setError("Couldn't update that source. Try again.");
    }
  }

  async function removeSource(id: string) {
    const prev = sources;
    setSources((s) => s.filter((x) => x.id !== id));
    setConfirming(null);
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setSources(prev);
      setError("Couldn't remove that source. Try again.");
    }
  }

  const activeCount = sources.filter((s) => s.active).length;

  return (
    <Page width="max-w-2xl">
      <PageHeader
        title="Sources"
        description={
          sources.length
            ? `${activeCount} of ${sources.length} active. These feeds power your Leads.`
            : "The feeds that power your Leads."
        }
      />

      <form onSubmit={addSource} className="card mb-6 flex flex-col gap-3 p-4">
        <p className="text-xs font-semibold text-gray-400">Add a source</p>
        <div className="flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name, e.g. Moneybadger" className="input flex-1" />
          <select value={type} onChange={(e) => setType(e.target.value as "rss" | "google-news")} className="input w-auto" aria-label="Source type">
            <option value="rss">RSS</option>
            <option value="google-news">Google News</option>
          </select>
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Feed URL, e.g. https://example.com/feed/" className="input" inputMode="url" />
        <button type="submit" disabled={adding || !label.trim() || !url.trim()} className="btn-primary self-start">
          {adding ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add source
        </button>
      </form>

      {error && <ErrorBanner message={error} onRetry={sources.length === 0 ? load : undefined} />}

      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[62px]" />
          ))}
        </div>
      ) : sources.length === 0 && !error ? (
        <EmptyState icon={Rss} title="No sources yet" body="Add an RSS feed above, such as bitcoinnews.africa/feed, and its stories will show up in Leads." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <li key={source.id} className="card flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${source.active ? "bg-bas-gold/10 text-bas-gold" : "bg-gray-800/60 text-gray-500"}`}>
                  {source.type === "rss" ? <Rss size={15} /> : <Newspaper size={15} />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${source.active ? "text-gray-100" : "text-gray-500"}`}>{source.label}</p>
                  <p className="truncate text-xs text-gray-600">{source.url}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* A real switch: it reads as an on/off control and is announced as one. */}
                <button
                  role="switch"
                  aria-checked={source.active}
                  aria-label={`${source.active ? "Pause" : "Activate"} ${source.label}`}
                  onClick={() => toggleActive(source)}
                  className={`relative h-6 w-10 rounded-full transition-colors focus-ring ${source.active ? "bg-bas-gold" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${source.active ? "left-[18px]" : "left-0.5"}`} />
                </button>

                {confirming === source.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <button onClick={() => removeSource(source.id)} className="font-semibold text-red-400 hover:text-red-300">
                      Remove
                    </button>
                    <button onClick={() => setConfirming(null)} className="text-gray-500 hover:text-gray-300">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button onClick={() => setConfirming(source.id)} className="rounded p-1.5 text-gray-600 transition-colors hover:text-red-400 focus-ring" aria-label={`Remove ${source.label}`}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
