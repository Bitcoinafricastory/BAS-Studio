"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Rss, Newspaper } from "lucide-react";
import type { Source } from "@/types";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"rss" | "google-news">("rss");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/sources");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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
    if (!label.trim() || !url.trim()) return;
    setError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), url: url.trim(), type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSources((s) => [...s, data]);
      setLabel("");
      setUrl("");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleActive(source: Source) {
    setSources((s) => s.map((x) => (x.id === source.id ? { ...x, active: !x.active } : x)));
    await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, active: !source.active }),
    });
  }

  async function removeSource(id: string) {
    setSources((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/sources?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-gray-50 mb-6">Manage Sources</h1>

      <form
        onSubmit={addSource}
        className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 mb-6"
      >
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Source name"
            className="flex-1 bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "rss" | "google-news")}
            className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          >
            <option value="rss">RSS</option>
            <option value="google-news">Google News</option>
          </select>
        </div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Feed URL"
          className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
        />
        <button
          type="submit"
          className="self-start flex items-center gap-2 bg-bas-gold hover:bg-bas-gold-hover text-black font-medium text-sm rounded-lg px-4 py-2 transition-colors"
        >
          <Plus size={15} /> Add source
        </button>
      </form>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Loading sources…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between gap-3 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {source.type === "rss" ? (
                  <Rss size={15} className="text-gray-500 shrink-0" />
                ) : (
                  <Newspaper size={15} className="text-gray-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-gray-100 truncate">{source.label}</p>
                  <p className="text-xs text-gray-600 truncate">{source.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => toggleActive(source)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    source.active
                      ? "bg-bas-gold/15 text-bas-gold border-bas-gold/30"
                      : "bg-gray-800/50 text-gray-500 border-gray-700"
                  }`}
                >
                  {source.active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => removeSource(source.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${source.label}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
