"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import ResearchCard from "./ResearchCard";
import type { ResearchResult } from "@/types";

export default function ResearchPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState("");

  async function runDeepResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/assistant/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), depth: "deep" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Research failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      <form onSubmit={runDeepResearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, project, protocol, or topic to research…"
          className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-semibold rounded-lg px-5 flex items-center gap-2 transition-colors shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Research
        </button>
      </form>

      {!result && !loading && !error && (
        <p className="text-sm text-gray-500">
          Deep mode runs a thorough sweep — recent news, funding/partnerships, social presence,
          and controversy — and takes 15-30 seconds. For a fast lookup, use Chat instead.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Digging through sources…
        </p>
      )}
      {result && <ResearchCard result={result} />}
    </div>
  );
}
