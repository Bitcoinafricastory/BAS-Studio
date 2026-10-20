"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Search, ArrowLeft, Sparkles, ImageIcon, ChevronDown } from "lucide-react";
import OutputCard, { CardState } from "@/components/distribute/OutputCard";
import { Page, PageHeader, EmptyState, ErrorBanner } from "@/components/ui/Page";
import { OUTPUT_SPECS, CORE_OUTPUTS, OPTIONAL_OUTPUTS } from "@/lib/distribution/outputs";
import type { ArticleListItem, ArticleRecord, AuthorRecord, FactSheet, OutputId } from "@/lib/distribution/types";

type Meta = Omit<ArticleRecord, "bodyText">;

const EMPTY_AUTHOR: AuthorRecord = { name: "", xHandle: "", linkedinName: "", premium: false };

export default function DistributePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [query, setQuery] = useState("");

  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectError, setSelectError] = useState("");
  const [article, setArticle] = useState<Meta | null>(null);
  const [factSheet, setFactSheet] = useState<FactSheet | null>(null);
  const [knownAuthors, setKnownAuthors] = useState<AuthorRecord[]>([]);

  const [author, setAuthor] = useState<AuthorRecord>(EMPTY_AUTHOR);
  const [angle, setAngle] = useState("");
  const [selected, setSelected] = useState<OutputId[]>(CORE_OUTPUTS);
  const [cards, setCards] = useState<Partial<Record<OutputId, CardState>>>({});
  const [posted, setPosted] = useState<Record<string, { postedText: string; postUrl: string }>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/distribution/articles");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load articles");
        setArticles(data.articles);
      } catch (e: any) {
        setListError(e.message);
      } finally {
        setListLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? articles.filter((a) => a.title.toLowerCase().includes(q) || a.author.toLowerCase().includes(q)) : articles;
  }, [articles, query]);

  async function pick(id: string) {
    setSelecting(id);
    setSelectError("");
    try {
      const res = await fetch("/api/distribution/factsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to read the article");
      setArticle(data.article);
      setFactSheet(data.factSheet);
      setKnownAuthors(data.authors || []);
      setAuthor(data.author || { ...EMPTY_AUTHOR, name: data.article.author, linkedinName: data.article.author });
      setCards({});
      setAngle("");
      setSelected(CORE_OUTPUTS);
      fetch(`/api/distribution/posted?articleId=${id}`)
        .then((r) => r.json())
        .then((d) => setPosted(d.posted || {}))
        .catch(() => {});
    } catch (e: any) {
      setSelectError(e.message);
    } finally {
      setSelecting(null);
    }
  }

  const runOne = useCallback(
    async (output: OutputId) => {
      if (!article || !factSheet) return;
      setCards((c) => ({ ...c, [output]: { status: "loading", variants: c[output]?.variants ?? [] } }));
      try {
        const res = await fetch("/api/distribution/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId: article.id, output, factSheet, author, angle }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        setCards((c) => ({ ...c, [output]: { status: "done", variants: data.variants } }));
      } catch (e: any) {
        setCards((c) => ({ ...c, [output]: { status: "error", variants: [], error: e.message } }));
      }
    },
    [article, factSheet, author, angle]
  );

  function generateAll() {
    selected.forEach((o) => runOne(o));
  }

  async function markPosted(outputId: OutputId, draftText: string, postedText: string, postUrl: string) {
    if (!article) return;
    const res = await fetch("/api/distribution/posted", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: article.id, outputId, draftText, postedText, postUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not save");
    setPosted((p) => ({ ...p, [outputId]: { postedText, postUrl } }));
  }

  function toggle(id: OutputId) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const authorReady = author.name.trim() && author.xHandle.trim();
  const anyLoading = Object.values(cards).some((c) => c?.status === "loading");
  const order: OutputId[] = [...CORE_OUTPUTS, ...OPTIONAL_OUTPUTS].filter((o) => cards[o]);

  // ---------- Step 1: choose an article
  if (!article || !factSheet) {
    return (
      <Page>
        <PageHeader
          title="Distribute"
          description="Pick a published article. Studio drafts the X and LinkedIn posts, checks them against the article, and you review. Nothing posts automatically."
        />

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search published articles"
            className="input rounded-full pl-10 pr-4"
          />
        </div>

        {listLoading && (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[82px]" />
            ))}
          </div>
        )}
        {listError && <ErrorBanner message={listError} />}
        {selectError && <ErrorBanner message={selectError} />}
        {!listLoading && !listError && filtered.length === 0 && (
          <EmptyState
            icon={Search}
            title={query ? "No matches" : "No published articles"}
            body={query ? "Try a different title or author." : "Articles marked as published in your dashboard will appear here."}
          />
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => pick(a.id)}
                disabled={!!selecting}
                className="card flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-bas-gold/40 hover:bg-gray-900/70 disabled:opacity-60 focus-ring"
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 bg-gray-800" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-800 shrink-0 flex items-center justify-center text-gray-600">
                    <ImageIcon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-100 line-clamp-2">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[a.author, a.category, a.date].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {selecting === a.id && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                    <Loader2 size={13} className="animate-spin" /> Reading…
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Page>
    );
  }

  // ---------- Step 2: set up and review
  return (
    <Page width="max-w-4xl">
      <button
        onClick={() => {
          setArticle(null);
          setFactSheet(null);
          setCards({});
        }}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-50 mb-4 focus-ring rounded"
      >
        <ArrowLeft size={14} /> All articles
      </button>

      <h1 className="text-xl font-semibold text-gray-50 leading-snug">{article.title}</h1>
      <p className="text-xs text-gray-500 mt-1 break-all">{article.url}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_260px]">
        <div className="card flex flex-col gap-4 p-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Author</p>
            {knownAuthors.length > 0 && (
              <select
                value={knownAuthors.some((a) => a.name === author.name) ? author.name : ""}
                onChange={(e) => {
                  const a = knownAuthors.find((x) => x.name === e.target.value);
                  if (a) setAuthor(a);
                }}
                className="w-full rounded-lg bg-black/50 border border-gray-800 px-3 py-2 text-sm mb-2 focus:outline-none focus:border-bas-gold/40"
              >
                <option value="">Other author…</option>
                {knownAuthors.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.name} (@{a.xHandle})
                  </option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name" value={author.name} onChange={(v) => setAuthor({ ...author, name: v })} />
              <Field label="X handle" prefix="@" value={author.xHandle} onChange={(v) => setAuthor({ ...author, xHandle: v.replace(/^@/, "") })} />
              <Field label="LinkedIn name" value={author.linkedinName} onChange={(v) => setAuthor({ ...author, linkedinName: v })} />
              <label className="flex items-center gap-2 text-xs text-gray-400 mt-5">
                <input
                  type="checkbox"
                  checked={author.premium}
                  onChange={(e) => setAuthor({ ...author, premium: e.target.checked })}
                  className="accent-yellow-500"
                />
                Author has X Premium
              </label>
            </div>
            {!authorReady && <p className="text-xs text-amber-300 mt-2">Add the author's name and X handle to continue.</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400">Angle to lead with (optional)</label>
            <input
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="e.g. lead with the new Dev Con name"
              className="input mt-2"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 mb-2">Posts to write</p>
            <div className="flex flex-wrap gap-2">
              {[...CORE_OUTPUTS, ...OPTIONAL_OUTPUTS].map((id) => {
                const on = selected.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-ring ${
                      on ? "bg-bas-gold/15 border-bas-gold/50 text-bas-gold" : "border-gray-800 text-gray-400 hover:text-gray-100"
                    }`}
                  >
                    {OUTPUT_SPECS[id].label}
                    {OUTPUT_SPECS[id].optional && <span className="opacity-60"> · optional</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={generateAll}
            disabled={!authorReady || selected.length === 0 || anyLoading}
            className="btn-primary self-start"
          >
            {anyLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {order.length ? "Generate again" : "Generate posts"}
          </button>
        </div>

        <aside className="card flex h-fit flex-col gap-3 p-4">
          <p className="text-xs font-semibold text-gray-400">Media</p>
          {article.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.image} alt={article.imageAlt} className="w-full rounded-xl object-cover" />
          ) : (
            <p className="text-xs text-gray-500">No featured image on this article.</p>
          )}
          <p className="text-xs text-gray-400">
            <span className="text-gray-500">Alt text: </span>
            {article.imageAlt || "none saved. Select Image alt text to draft one."}
          </p>
          <p className="text-xs text-gray-500">
            Attach the featured image to the X post. If the story has a video clip, attach that instead: video travels further than a link card.
          </p>
        </aside>
      </div>

      <FactSheetPanel factSheet={factSheet} />

      <div className="mt-6 grid gap-4">
        {order.map((id) => (
          <OutputCard
            key={id}
            spec={OUTPUT_SPECS[id]}
            state={cards[id] as CardState}
            author={author}
            posted={posted[id]}
            onRegenerate={() => runOne(id)}
            onMarkPosted={(d, p, u) => markPosted(id, d, p, u)}
          />
        ))}
      </div>
    </Page>
  );
}

function Field({ label, value, onChange, prefix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="mt-1 flex items-center rounded-lg bg-black/50 border border-gray-800 focus-within:border-bas-gold/40 px-3">
        {prefix && <span className="text-gray-500 text-sm mr-0.5">{prefix}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-2 text-sm focus:outline-none" />
      </div>
    </label>
  );
}

// The fact sheet is what every draft is written from, so the editor can see it and spot
// a wrong fact before it spreads into five posts.
function FactSheetPanel({ factSheet }: { factSheet: FactSheet }) {
  return (
    <details className="mt-4 group rounded-2xl border border-gray-800 bg-gray-900/30">
      <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3 text-sm text-gray-300">
        <span>
          Fact sheet <span className="text-gray-500">· every post is written from this</span>
        </span>
        <ChevronDown size={15} className="text-gray-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 text-sm text-gray-300 flex flex-col gap-3">
        <Row label="What" value={factSheet.what} />
        <Row label="When" value={factSheet.when} />
        <Row label="Where" value={factSheet.where} />
        <Row label="Why it matters" value={factSheet.whyItMatters} />
        <Row label="What's next" value={factSheet.whatsNext} />
        {factSheet.who.length > 0 && (
          <Row label="People and projects" value={factSheet.who.map((w) => `${w.name}${w.role ? ` (${w.role})` : ""}${w.handle ? ` @${w.handle.replace(/^@/, "")}` : ""}`).join("; ")} />
        )}
        {factSheet.numbers.length > 0 && <Row label="Numbers" value={factSheet.numbers.map((n) => `${n.value} ${n.context}`).join("; ")} />}
        {factSheet.quotes.length > 0 && <Row label="Quotes" value={factSheet.quotes.map((q) => `"${q.text}" (${q.speaker})`).join(" · ")} />}
        {factSheet.hedged.length > 0 && <Row label="Hedged claims" value={factSheet.hedged.map((h) => `${h.claim} [${h.hedge}]`).join("; ")} />}
      </div>
    </details>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p>
      <span className="text-xs font-semibold text-gray-500 mr-2">{label}</span>
      {value}
    </p>
  );
}
