"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react";
import { SITE, isSocial } from "@/lib/outreach/messages";
import {
  FU_MAX,
  QUIET,
  ago,
  defaultVariant,
  followState,
  initials,
  needsReview,
  statusColor,
  textFor,
  variantLabel,
  type ListConfig,
  type Variant,
} from "@/lib/outreach/state";
import type { Org, Progress, StatusValue } from "@/lib/outreach/types";

export function StatusDot({ status, size = 10 }: { status: StatusValue; size?: number }) {
  const style =
    status === "todo"
      ? { border: "2px solid rgb(var(--s-todo))" }
      : QUIET.has(status)
        ? { border: `2px dashed ${statusColor(status)}` }
        : { background: statusColor(status) };
  return <i className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, ...style }} />;
}

export function CopyButton({ text, label, primary = true }: { text: string; label: string; primary?: boolean }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <button type="button" onClick={copy} className={primary ? "btn-primary" : "btn-secondary"}>
      {state === "done" ? <Check size={14} /> : <Copy size={14} />}
      {state === "done" ? "Copied" : state === "failed" ? "Select and copy by hand" : label}
    </button>
  );
}

function NoteInput({ value, placeholder, onSave }: { value: string; placeholder: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  // Pick up changes made by a teammate, but never overwrite what is being typed.
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        if (text.trim() !== value) onSave(text.trim());
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="input min-w-[12rem] flex-1"
    />
  );
}

export default function OrgRow({
  org,
  progress,
  config,
  open,
  onToggle,
  variant,
  onVariant,
  onStatus,
  onNote,
  onFollowUp,
}: {
  org: Org;
  progress: Progress | undefined;
  config: ListConfig;
  open: boolean;
  onToggle: (open: boolean) => void;
  variant: Variant | undefined;
  onVariant: (v: Variant) => void;
  onStatus: (s: StatusValue) => void;
  onNote: (n: string) => void;
  onFollowUp: () => void;
}) {
  const status = progress?.status ?? "todo";
  const def = config.statuses.find((s) => s.v === status);
  const f = followState(progress);
  const review = needsReview(org, progress);
  const nudge = !!(f?.due || review);
  const v = variant ?? defaultVariant(org, progress);

  const pickBtn = (k: Variant, label: string, aria?: string) => (
    <button
      key={k}
      type="button"
      aria-pressed={k === v}
      aria-label={aria}
      onClick={() => onVariant(k)}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
        k === v ? "bg-bas-gold text-on-gold" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
      }`}
    >
      {label}
    </button>
  );

  let line: React.ReactNode = null;
  if (f?.next) {
    line = f.due ? (
      <span>
        {f.done ? `Follow-up ${f.done} sent ${ago(f.days)}` : `Sent ${ago(f.days)}`}, no reply.{" "}
        <b className="text-gold-fg">Follow-up {f.next} is due.</b>
      </span>
    ) : (
      <span>
        {f.done ? `Follow-up ${f.done} sent ${ago(f.days)}` : `Sent ${ago(f.days)}`}. Follow-up {f.next} in {f.inDays} day
        {f.inDays === 1 ? "" : "s"}.
      </span>
    );
  } else if (review) {
    line = (
      <span>
        They replied. <b className="text-gold-fg">Send the profile check</b>, then mark Updated once their profile is fixed.
      </span>
    );
  } else if (f) {
    line = (
      <span>
        All {FU_MAX} follow-ups sent, the last {ago(f.days)}.
        {f.close && (
          <b className="text-gold-fg"> No reply: mark it {org.kind === "directory" ? "No reply" : "Declined"}.</b>
        )}
      </span>
    );
  }

  return (
    <div
      id={`org-${org.slug}`}
      className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 transition-colors"
      style={{ boxShadow: `inset 3px 0 0 ${statusColor(status)}` }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(!open)}
        className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-900/60"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-gray-300"
        >
          {initials(org.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-100">{org.name}</span>
          <span className="block truncate text-xs text-gray-500">{org.why}</span>
        </span>
        {org.priority === "high" && (
          <span className="hidden shrink-0 rounded-full bg-bas-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-fg sm:inline">
            High
          </span>
        )}
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            nudge ? "border-bas-gold/50 text-gold-fg" : "border-gray-800 text-gray-300"
          }`}
        >
          <StatusDot status={status} size={9} />
          {def?.short}
          {nudge && <span className="hidden sm:inline">· Follow up</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-3.5 border-t border-gray-800 px-4 py-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
            {org.site ? (
              <span>
                Site{" "}
                <a href={org.site} target="_blank" rel="noopener noreferrer" className="text-gold-fg hover:underline">
                  {org.site.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              </span>
            ) : (
              <span>No website listed. Try a DM on X.</span>
            )}
            <span>
              Profile{" "}
              <a href={`${SITE}/directory/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-gold-fg hover:underline">
                /directory/{org.slug}
              </a>
            </span>
            {org.stories.map(([t, p]) => (
              <span key={p}>
                Story{" "}
                <a href={`${SITE}${p}`} target="_blank" rel="noopener noreferrer" className="text-gold-fg hover:underline">
                  {t.length > 50 ? t.slice(0, 48) + "…" : t}
                </a>
              </span>
            ))}
          </div>

          {status !== "todo" && (
            <div className={`rounded-xl border px-3 py-2.5 ${nudge ? "border-bas-gold/40 bg-bas-gold/5" : "border-gray-800"}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <div className="flex items-center gap-0.5 rounded-lg bg-gray-950/60 p-0.5" role="group" aria-label="Which message">
                  {pickBtn("first", "Message")}
                  {org.kind === "directory" && pickBtn("review", "Profile check")}
                </div>
                <span className="text-[11px] uppercase tracking-wide text-gray-600">Follow-up</span>
                <div className="flex items-center gap-0.5 rounded-lg bg-gray-950/60 p-0.5" role="group" aria-label="Follow-ups">
                  {Array.from({ length: FU_MAX }, (_, i) => pickBtn(`fu${i + 1}` as Variant, String(i + 1), `Follow-up ${i + 1}`))}
                </div>
              </div>
              {line && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                  {line}
                  {f?.next && (
                    <button type="button" onClick={onFollowUp} className="btn-secondary">
                      Mark follow-up {f.next} sent
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-gray-800 bg-gray-950/50 p-3.5 font-sans text-[13px] leading-relaxed text-gray-300">
            {textFor(org, v)}
          </pre>

          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={textFor(org, v)} label={`Copy ${variantLabel(v)}`} />
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-gray-950/60 p-0.5" role="group" aria-label={`Status for ${org.name}`}>
              {config.statuses.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  aria-pressed={s.v === status}
                  onClick={() => onStatus(s.v)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-ring ${
                    s.v === status ? "bg-gray-800 text-gray-50" : "text-gray-400 hover:bg-gray-800/70 hover:text-gray-100"
                  }`}
                >
                  <StatusDot status={s.v} size={8} />
                  {s.short}
                </button>
              ))}
            </div>
            {org.site && (
              <a href={org.site} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <ExternalLink size={13} /> {isSocial(org.site) ? "Open their X" : "Open their site"}
              </a>
            )}
          </div>

          <NoteInput
            value={progress?.note ?? ""}
            placeholder={
              org.kind === "directory" ? "Note: who you spoke to, what their news is…" : "Note: who you contacted, where they linked…"
            }
            onSave={onNote}
          />
        </div>
      )}
    </div>
  );
}
