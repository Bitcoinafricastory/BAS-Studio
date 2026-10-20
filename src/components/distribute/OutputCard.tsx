"use client";

import { useEffect, useState } from "react";
import { Copy, Check, RefreshCw, ExternalLink, Loader2, AlertTriangle, CircleAlert, CheckCircle2 } from "lucide-react";
import { xLength, plainLength } from "@/lib/distribution/count";
import type { OutputSpec } from "@/lib/distribution/outputs";
import type { AuthorRecord, Variant } from "@/lib/distribution/types";

export interface CardState {
  status: "idle" | "loading" | "done" | "error";
  variants: Variant[];
  error?: string;
}

interface Props {
  spec: OutputSpec;
  state: CardState;
  author: AuthorRecord;
  posted?: { postedText: string; postUrl: string };
  onRegenerate: () => void;
  onMarkPosted: (draftText: string, postedText: string, postUrl: string) => Promise<void>;
}

function limitFor(id: string, author: AuthorRecord): number | null {
  if (id === "x_author_post") return author.premium ? 4000 : 280;
  if (id === "li_bas_post" || id === "li_author_post") return 3000;
  return null;
}

export default function OutputCard({ spec, state, author, posted, onRegenerate, onMarkPosted }: Props) {
  const [active, setActive] = useState(0);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [postUrl, setPostUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // A regenerate replaces the variants, so drop edits made to the old ones.
  useEffect(() => {
    setEdits({});
    setActive(0);
  }, [state.variants]);

  const variant = state.variants[active];
  const original = variant?.text ?? "";
  const text = edits[active] ?? original;
  const edited = text !== original;

  const isX = spec.platform === "x";
  const cap = limitFor(spec.id, author);
  const count = isX ? xLength(text) : plainLength(text);
  const over = cap !== null && count > cap;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function openInX() {
    const first = spec.id === "x_thread" ? text.split(/^\s*---\s*$/m)[0].trim() : text;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(first)}`, "_blank", "noopener");
  }

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      await onMarkPosted(original, text, postUrl.trim());
      setMarkOpen(false);
    } catch (e: any) {
      setSaveError(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-50 flex items-center gap-2">
            {spec.label}
            {posted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 size={12} /> Posted
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500">{spec.account}</p>
        </div>
        {state.variants.length > 1 && (
          <div className="flex rounded-full bg-gray-900 border border-gray-800 p-0.5 text-xs">
            {state.variants.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`px-3 py-1 rounded-full transition-colors focus-ring ${
                  active === i ? "bg-bas-gold text-on-gold font-semibold" : "text-gray-400 hover:text-gray-100"
                }`}
              >
                {i === 0 ? "A" : "B"}
              </button>
            ))}
          </div>
        )}
      </header>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
          <Loader2 size={14} className="animate-spin" /> Writing and checking…
        </div>
      )}

      {state.status === "error" && (
        <div className="flex items-start gap-2 text-sm text-red-300 bg-red-950/20 border border-red-900/50 rounded-xl p-3">
          <CircleAlert size={16} className="shrink-0 mt-0.5" /> {state.error}
        </div>
      )}

      {state.status === "done" && variant && (
        <>
          <textarea
            value={text}
            onChange={(e) => setEdits((p) => ({ ...p, [active]: e.target.value }))}
            rows={Math.min(Math.max(text.split("\n").length + 2, 5), 22)}
            spellCheck
            className="w-full resize-y rounded-xl bg-black/50 border border-gray-800 focus:border-bas-gold/40 focus:outline-none p-3 text-sm leading-relaxed text-gray-100"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs tabular-nums ${over ? "text-red-400 font-semibold" : "text-gray-500"}`}>
              {count.toLocaleString()}
              {cap !== null ? ` / ${cap.toLocaleString()}` : ""} characters{edited ? " · edited" : ""}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={copy} className="btn-ghost focus-ring">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
              </button>
              {isX && (
                <button onClick={openInX} className="btn-ghost focus-ring">
                  <ExternalLink size={13} /> Open in X
                </button>
              )}
              <button onClick={onRegenerate} className="btn-ghost focus-ring">
                <RefreshCw size={13} /> Regenerate
              </button>
              <button
                onClick={() => setMarkOpen((o) => !o)}
                className="text-xs px-3 py-1.5 rounded-full bg-bas-gold hover:bg-bas-gold-hover text-on-gold font-semibold transition-colors focus-ring"
              >
                Mark as posted
              </button>
            </div>
          </div>

          {markOpen && (
            <div className="flex flex-col gap-2 rounded-xl border border-gray-800 bg-black/40 p-3">
              <label className="text-xs text-gray-400">
                Link to the live post (optional). The text above, with your edits, is saved so the generator can learn from it.
              </label>
              <div className="flex gap-2">
                <input
                  value={postUrl}
                  onChange={(e) => setPostUrl(e.target.value)}
                  placeholder="https://x.com/…"
                  className="flex-1 min-w-0 rounded-lg bg-gray-900 border border-gray-800 focus:border-bas-gold/40 focus:outline-none px-3 py-2 text-sm"
                />
                <button
                  onClick={save}
                  disabled={saving}
                  className="text-sm px-4 rounded-lg bg-bas-gold text-on-gold font-semibold disabled:opacity-50 focus-ring"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </button>
              </div>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
            </div>
          )}

          <Warnings variant={variant} />
        </>
      )}
    </section>
  );
}

function Warnings({ variant }: { variant: Variant }) {
  const errors = variant.checks.filter((c) => c.level === "error");
  const warns = variant.checks.filter((c) => c.level === "warn");
  const items = [
    ...errors.map((c) => ({ tone: "error" as const, label: c.rule, msg: c.message })),
    ...warns.map((c) => ({ tone: "warn" as const, label: c.rule, msg: c.message })),
    ...variant.unsupportedClaims.map((c) => ({ tone: "warn" as const, label: "reviewer", msg: `Not supported by the fact sheet: ${c}` })),
    ...variant.flags.map((c) => ({ tone: "warn" as const, label: "generator", msg: c })),
  ];
  if (items.length === 0) {
    return (
      <p className="text-xs text-emerald-400 flex items-center gap-1.5">
        <CheckCircle2 size={13} /> Passed every check
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((w, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 text-xs rounded-lg px-2.5 py-2 ${
            w.tone === "error" ? "bg-red-950/30 text-red-300" : "bg-amber-950/20 text-amber-200/90"
          }`}
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold uppercase tracking-wide text-[10px] mr-1.5 opacity-70">{w.label}</span>
            {w.msg}
          </span>
        </li>
      ))}
    </ul>
  );
}
