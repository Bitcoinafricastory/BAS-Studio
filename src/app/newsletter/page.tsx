"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Copy, Download, Save, Trash2, Mail, Check, Smartphone, Monitor } from "lucide-react";
import { Page, PageHeader, EmptyState, ErrorBanner } from "@/components/ui/Page";
import { renderHtml, renderText } from "@/lib/newsletter/render";
import { addDays, formatRange, todayLocal, weekOf } from "@/lib/newsletter/week";
import type { NewsletterIssue, SavedIssue } from "@/lib/newsletter/types";
import type { ArticleListItem } from "@/lib/distribution/types";

async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function NewsletterPage() {
  const [week, setWeek] = useState(() => weekOf(todayLocal()));
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);
  const [issueId, setIssueId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState("");
  const [phone, setPhone] = useState(false);
  const [history, setHistory] = useState<SavedIssue[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory((await api("/api/newsletter")).issues || []);
    } catch {
      /* history is optional */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { articles } = await api<{ articles: ArticleListItem[] }>(`/api/newsletter/articles?start=${week.start}&end=${week.end}`);
      setArticles(articles);
      setPicked(new Set(articles.map((a) => a.id)));
    } catch (e: any) {
      setArticles([]);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [week.start, week.end]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  function shift(n: number) {
    setWeek(weekOf(addDays(week.start, n * 7)));
  }

  function toggle(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function write() {
    setWriting(true);
    setError("");
    try {
      const ids = articles.filter((a) => picked.has(a.id)).map((a) => a.id);
      const { issue } = await api<{ issue: NewsletterIssue }>("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, start: week.start, end: week.end, note }),
      });
      setIssue(issue);
      setIssueId(null);
      setSaved(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWriting(false);
    }
  }

  function patch(p: Partial<NewsletterIssue>) {
    setIssue((i) => (i ? { ...i, ...p } : i));
    setSaved(false);
  }

  function patchItem(idx: number, blurb: string) {
    setIssue((i) => (i ? { ...i, items: i.items.map((it, n) => (n === idx ? { ...it, blurb } : it)) } : i));
    setSaved(false);
  }

  function removeItem(idx: number) {
    setIssue((i) => (i ? { ...i, items: i.items.filter((_, n) => n !== idx) } : i));
    setSaved(false);
  }

  async function save() {
    if (!issue) return;
    setSaving(true);
    setError("");
    try {
      const { id } = await api<{ id: string }>("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issueId, issue }),
      });
      setIssueId(id);
      setSaved(true);
      loadHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this saved issue?")) return;
    try {
      await api(`/api/newsletter?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (issueId === id) setIssueId(null);
      loadHistory();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function open(s: SavedIssue) {
    const { id, createdAt, updatedAt, ...rest } = s;
    setIssue({ ...rest, subjects: rest.subjects || [], items: rest.items || [] });
    setIssueId(id);
    setSaved(true);
    if (rest.weekStart) setWeek(weekOf(rest.weekStart));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copy(kind: "html" | "text") {
    if (!issue) return;
    try {
      await navigator.clipboard.writeText(kind === "html" ? renderHtml(issue) : renderText(issue));
      setCopied(kind);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("Copy was blocked by the browser. Use Download instead.");
    }
  }

  function download() {
    if (!issue) return;
    const blob = new Blob([renderHtml(issue)], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bas-newsletter-${issue.weekStart || "issue"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const html = useMemo(() => (issue ? renderHtml(issue) : ""), [issue]);
  const isCurrent = week.start === weekOf(todayLocal()).start;
  const count = picked.size;

  return (
    <Page width="max-w-5xl">
      <PageHeader
        title="Newsletter"
        description="Pick a week and Studio writes the issue from the articles BAS published, in the BAS voice. Edit it, then copy it into your email tool."
      />
      {error && <ErrorBanner message={error} />}

      <section className="card mb-6 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button className="btn-ghost" onClick={() => shift(-1)} aria-label="Previous week">
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-100">{formatRange(week.start, week.end)}</div>
            <div className="text-xs text-gray-500">{isCurrent ? "This week" : "Monday to Sunday"}</div>
          </div>
          <button className="btn-ghost" onClick={() => shift(1)} aria-label="Next week" disabled={isCurrent}>
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-11 rounded-xl" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No published articles in this week.</p>
        ) : (
          <ul className="space-y-1.5">
            {articles.map((a) => (
              <li key={a.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-900">
                  <input type="checkbox" checked={picked.has(a.id)} onChange={() => toggle(a.id)} className="mt-1 h-4 w-4 accent-[#F7931A]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-100">{a.title}</span>
                    <span className="block text-xs text-gray-500">
                      {[a.date, a.category, a.author].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-gray-400" htmlFor="nl-note">
            Anything to steer this issue? (optional)
          </label>
          <input
            id="nl-note"
            className="input w-full"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. lead with the Kenya story"
            maxLength={600}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">{count} selected</span>
          <button className="btn-primary" onClick={write} disabled={writing || count === 0}>
            {writing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {writing ? "Writing…" : issue ? "Write again" : "Write newsletter"}
          </button>
        </div>
      </section>

      {issue && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card space-y-4 p-4 sm:p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400" htmlFor="nl-subject">
                Subject
              </label>
              <input id="nl-subject" className="input w-full" value={issue.subject} onChange={(e) => patch({ subject: e.target.value })} />
              {issue.subjects.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {issue.subjects.map((s) => (
                    <button
                      key={s}
                      onClick={() => patch({ subject: s })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        s === issue.subject ? "border-bas-gold text-gold-fg" : "border-gray-800 text-gray-400 hover:text-gray-100"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label="Preview text" value={issue.preheader} rows={1} onChange={(v) => patch({ preheader: v })} />
            <Field label="Intro" value={issue.intro} rows={4} onChange={(v) => patch({ intro: v })} />
            {issue.items.map((it, idx) => (
              <div key={it.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-gray-400">{it.title}</span>
                  <button className="shrink-0 text-xs text-gray-500 hover:text-red-400" onClick={() => removeItem(idx)}>
                    Remove
                  </button>
                </div>
                <textarea className="input w-full" rows={3} value={it.blurb} onChange={(e) => patchItem(idx, e.target.value)} />
              </div>
            ))}
            <Field label="Closing" value={issue.closing} rows={3} onChange={(v) => patch({ closing: v })} />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-primary" onClick={() => copy("html")}>
                {copied === "html" ? <Check size={15} /> : <Copy size={15} />} Copy HTML
              </button>
              <button className="btn-secondary" onClick={() => copy("text")}>
                {copied === "text" ? <Check size={15} /> : <Copy size={15} />} Copy text
              </button>
              <button className="btn-secondary" onClick={download}>
                <Download size={15} /> .html
              </button>
              <button className="btn-secondary" onClick={save} disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />} {saved ? "Saved" : "Save"}
              </button>
              <button className="btn-ghost ml-auto" onClick={() => setPhone((p) => !p)} aria-label={phone ? "Desktop preview" : "Phone preview"}>
                {phone ? <Monitor size={16} /> : <Smartphone size={16} />}
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#f4f4f1]">
              <iframe
                title="Newsletter preview"
                sandbox=""
                srcDoc={html}
                className={`mx-auto block h-[720px] border-0 ${phone ? "w-[375px] max-w-full" : "w-full"}`}
              />
            </div>
          </section>
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-gray-100">Saved issues</h2>
        {history.length === 0 ? (
          <EmptyState icon={Mail} title="No saved issues yet" body="Save an issue and it shows up here so you can reopen it." />
        ) : (
          <ul className="card divide-y divide-gray-800">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => open(h)}>
                  <span className="block truncate text-sm font-medium text-gray-100">{h.subject || "Untitled issue"}</span>
                  <span className="block text-xs text-gray-500">
                    {h.weekStart && h.weekEnd ? formatRange(h.weekStart, h.weekEnd) : ""} · {h.items?.length || 0} {h.items?.length === 1 ? "story" : "stories"}
                  </span>
                </button>
                <button className="btn-ghost" onClick={() => remove(h.id)} aria-label="Delete issue">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function Field({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>
      <textarea className="input w-full" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
