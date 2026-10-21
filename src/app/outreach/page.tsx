"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Page, PageHeader, ErrorBanner } from "@/components/ui/Page";
import OutreachMap from "@/components/outreach/OutreachMap";
import OrgRow, { CopyButton } from "@/components/outreach/OrgRow";
import { SITE } from "@/lib/outreach/messages";
import {
  LISTS,
  WEEKLY_GOAL,
  ago,
  applyAction,
  followState,
  needsReview,
  sentTimes,
  sortOrgs,
  statusColor,
  textFor,
  weekStart,
  type Variant,
} from "@/lib/outreach/state";
import type { OutreachAction, OutreachMode, ProgressMap, StatusValue } from "@/lib/outreach/types";

const MODE_KEY = "bas-studio-outreach-mode";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Ring({ pct, color, size = 48, stroke = 6 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--gray-800))" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(c * Math.min(1, pct)).toFixed(1)} ${c.toFixed(1)}`}
      />
    </svg>
  );
}

export default function OutreachPage() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<OutreachMode>("coverage");
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<Record<string, Variant>>({});
  const [weekTip, setWeekTip] = useState<number | null>(null);
  const pending = useRef(0);
  const listTop = useRef<HTMLDivElement>(null);

  const config = LISTS[mode];

  useEffect(() => {
    try {
      if (localStorage.getItem(MODE_KEY) === "directory") setMode("directory");
    } catch {}
  }, []);

  const load = useCallback(async () => {
    if (pending.current > 0) return; // don't clobber a change that is still being saved
    try {
      const res = await fetch("/api/outreach");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      if (pending.current === 0) setProgress(data.progress);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Teammates share this list, so refresh every so often and whenever the tab comes back.
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  async function act(action: OutreachAction) {
    const prev = progress;
    // Optimistic: apply the same rule the server will, so the UI answers instantly.
    setProgress((p) => ({ ...p, [action.slug]: applyAction(p[action.slug], action, new Date().toISOString()) }));
    pending.current++;
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setProgress((p) => ({ ...p, [action.slug]: data.progress }));
      setError("");
    } catch (err: any) {
      setProgress(prev);
      setError(`That change could not be saved. ${err.message}`);
    } finally {
      pending.current--;
    }
  }

  const setStatus = (slug: string, status: StatusValue) => {
    setOpen((o) => new Set(o).add(slug));
    act({ slug, type: "status", status });
  };
  const logFollowUp = (slug: string) => {
    setVariants((v) => {
      const { [slug]: _gone, ...rest } = v;
      return rest;
    });
    act({ slug, type: "followup" });
  };

  const orgs = useMemo(() => sortOrgs(config.orgs), [config]);
  const statusOf = (slug: string): StatusValue => progress[slug]?.status ?? "todo";
  const count = (v: StatusValue) => orgs.filter((o) => statusOf(o.slug) === v).length;

  const dueOrgs = orgs.filter((o) => followState(progress[o.slug])?.due);
  const nudgeOrgs = orgs.filter((o) => followState(progress[o.slug])?.due || needsReview(o, progress[o.slug]));
  const nudgeSet = new Set(nudgeOrgs.map((o) => o.slug));
  const effectiveFilter = filter === "due" && !nudgeOrgs.length ? "all" : filter;

  const total = orgs.length;
  const won = count(config.win);
  const contacted = orgs.filter((o) => statusOf(o.slug) !== "todo").length;
  const replied = orgs.filter((o) => config.funnel[0][1].includes(statusOf(o.slug))).length;
  const ws = weekStart(new Date());
  const wonThisWeek = orgs.filter((o) => {
    const t = progress[o.slug]?.history?.[config.win as "linked" | "story"];
    return t && new Date(t) >= ws;
  }).length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  // Weekly momentum counts both lists together: the goal is messages sent, whatever the list.
  const times = useMemo(() => sentTimes(progress), [progress]);
  const sentThisWeek = times.filter((t) => t >= ws).length;
  const weeks = useMemo(() => {
    const N = 8;
    const now = weekStart(new Date());
    return Array.from({ length: N }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - (N - 1 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, n: times.filter((t) => t >= start && t < end).length };
    });
  }, [times]);

  const q = query.trim().toLowerCase();
  const rows = orgs.filter(
    (o) =>
      (effectiveFilter === "all" || (effectiveFilter === "due" ? nudgeSet.has(o.slug) : statusOf(o.slug) === effectiveFilter)) &&
      (!q || o.name.toLowerCase().includes(q)),
  );

  function switchMode(m: OutreachMode) {
    if (m === mode) return;
    setMode(m);
    setFilter("all");
    setOpen(new Set());
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  }

  function jumpTo(slug: string) {
    setFilter("all");
    setQuery("");
    setOpen((o) => new Set(o).add(slug));
    setTimeout(() => document.getElementById(`org-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  // ---- "Next up" card ----
  const dueFirst = dueOrgs[0];
  const reviewFirst = orgs.find((o) => needsReview(o, progress[o.slug]));
  const todoFirst = orgs.find((o) => statusOf(o.slug) === "todo");
  const siteLink = (site: string | undefined) =>
    site ? (
      <a href={site} target="_blank" rel="noopener noreferrer" className="btn-ghost">
        {/\/\/(www\.)?(x|twitter)\.com\//.test(site) ? "Open their X" : "Open their site"}
      </a>
    ) : null;

  let next: React.ReactNode;
  if (dueFirst) {
    const f = followState(progress[dueFirst.slug])!;
    next = (
      <>
        <CardHead title="Follow up" chip={`${dueOrgs.length} due`} />
        <p className="text-lg font-semibold text-gray-50">{dueFirst.name}</p>
        <p className="text-sm leading-relaxed text-gray-400">
          {f.done ? `Follow-up ${f.done} went ${ago(f.days)}` : `Your message went ${ago(f.days)}`} and they haven’t replied. Send
          follow-up {f.next}.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={textFor(dueFirst, `fu${f.next}` as Variant)} label={`Copy follow-up ${f.next}`} />
          <button type="button" className="btn-secondary" onClick={() => logFollowUp(dueFirst.slug)}>
            Mark follow-up sent
          </button>
          {siteLink(dueFirst.site)}
        </div>
      </>
    );
  } else if (reviewFirst) {
    next = (
      <>
        <CardHead title="Profile check" chip="replied" />
        <p className="text-lg font-semibold text-gray-50">{reviewFirst.name}</p>
        <p className="text-sm leading-relaxed text-gray-400">
          They got back to you. Ask them to check their profile, then mark it Updated once it’s fixed.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={textFor(reviewFirst, "review")} label="Copy profile check" />
          <a href={`${SITE}/directory/${reviewFirst.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Open their profile
          </a>
        </div>
      </>
    );
  } else if (todoFirst) {
    next = (
      <>
        <CardHead title="Next up" chip={todoFirst.priority === "high" ? "High priority" : undefined} />
        <p className="text-lg font-semibold text-gray-50">{todoFirst.name}</p>
        <p className="text-sm leading-relaxed text-gray-400">{todoFirst.why}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={textFor(todoFirst, "first")} label="Copy message" />
          <button type="button" className="btn-secondary" onClick={() => setStatus(todoFirst.slug, "sent")}>
            Mark as sent
          </button>
          {siteLink(todoFirst.site)}
        </div>
      </>
    );
  } else {
    next = (
      <>
        <CardHead title="Next up" />
        <p className="text-lg font-semibold text-gray-50">Everyone’s been contacted</p>
        <p className="text-sm text-gray-400">Follow up with anyone still on Sent after five days.</p>
      </>
    );
  }

  // ---- weekly chart geometry ----
  const W = 640;
  const H = 190;
  const pad = { l: 28, r: 8, t: 22, b: 30 };
  const maxW = Math.max(WEEKLY_GOAL + 1, ...weeks.map((w) => w.n));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / maxW);
  const bw = (W - pad.l - pad.r) / weeks.length;
  const fmt = (d: Date) => `${d.getDate()} ${MON[d.getMonth()]}`;

  const tabs: { v: string; label: string; n: number }[] = [
    { v: "all", label: "All", n: total },
    ...(nudgeOrgs.length ? [{ v: "due", label: "Needs a nudge", n: nudgeOrgs.length }] : []),
    ...config.statuses.map((s) => ({ v: s.v as string, label: s.label, n: count(s.v) })),
  ];

  return (
    <Page width="max-w-6xl">
      <PageHeader
        title="Outreach"
        description={config.sub}
        action={
          <div className="card flex items-center gap-3 px-4 py-2.5">
            <Ring pct={sentThisWeek / WEEKLY_GOAL} color="#eab308" size={40} stroke={5} />
            <div className="text-sm text-gray-300">
              <b className="text-gray-50">
                {sentThisWeek}/{WEEKLY_GOAL}
              </b>{" "}
              sent this week
              <small className="block text-xs text-gray-500">
                {sentThisWeek >= WEEKLY_GOAL ? "Goal reached. Nice work." : `${WEEKLY_GOAL - sentThisWeek} to go`}
              </small>
            </div>
          </div>
        }
      />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="mb-5 grid grid-cols-2 gap-2 sm:max-w-md" role="group" aria-label="Outreach list">
        {(Object.keys(LISTS) as OutreachMode[]).map((k) => {
          const c = LISTS[k];
          const w = c.orgs.filter((o) => progress[o.slug]?.status === c.win).length;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={k === mode}
              onClick={() => switchMode(k)}
              className={`focus-ring rounded-xl border px-4 py-2.5 text-left transition-colors ${
                k === mode ? "border-bas-gold/60 bg-bas-gold/10" : "border-gray-800 bg-gray-900/40 hover:bg-gray-900"
              }`}
            >
              <b className="block text-sm text-gray-50">{c.label}</b>
              <small className="text-xs text-gray-500">
                {w} of {c.orgs.length} {c.winShort}
              </small>
            </button>
          );
        })}
      </div>

      {!loaded ? (
        <div className="skeleton h-24 w-full rounded-2xl" />
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat ring={<Ring pct={won / total} color={statusColor("linked")} />} label={config.ringTitle} value={won} of={total} sub={wonThisWeek ? `+${wonThisWeek} this week` : config.ringText} />
            <Stat ring={<Ring pct={contacted / total} color={statusColor("sent")} />} label="Contacted" value={contacted} of={total} sub={`${total - contacted} still to reach`} />
            <Stat
              ring={<Ring pct={contacted ? replied / contacted : 0} color={statusColor("replied")} />}
              label="Replies"
              value={replied}
              sub={contacted ? `${pct(replied, contacted)}% reply rate` : "No messages yet"}
            />
            {nudgeOrgs.length ? (
              <button
                type="button"
                onClick={() => {
                  setFilter("due");
                  listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="card focus-ring flex flex-col justify-center border-bas-gold/50 px-4 py-3 text-left hover:bg-gray-900"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gold-fg">Needs a nudge</span>
                <span className="text-2xl font-semibold text-gray-50">{nudgeOrgs.length}</span>
                <span className="text-xs text-gray-500">Show who →</span>
              </button>
            ) : (
              <Stat label="Needs a nudge" value={0} sub="All caught up" />
            )}
          </div>

          <div className="mb-8 grid gap-5 lg:grid-cols-5">
            <section className="card p-4 lg:col-span-3" aria-label="Link map">
              <h2 className="mb-0.5 text-sm font-semibold text-gray-100">Link map</h2>
              <p className="mb-3 text-xs leading-relaxed text-gray-500">{config.hint}</p>
              <OutreachMap config={config} progress={progress} onSelect={jumpTo} />
            </section>

            <div className="flex flex-col gap-5 lg:col-span-2">
              <section className="card flex flex-col gap-3 p-5">{next}</section>

              <section className="card p-5" aria-label="Pipeline">
                <h2 className="mb-3 text-sm font-semibold text-gray-100">Pipeline</h2>
                <div className="flex flex-col gap-2.5">
                  {[
                    ["Contacted", contacted, total, statusColor("sent")] as const,
                    ...config.funnel.map(
                      ([lab, sts]) =>
                        [lab, sts.reduce((n, v) => n + count(v), 0), contacted, statusColor(sts[0])] as const,
                    ),
                  ].map(([lab, n, of, col]) => (
                    <div key={lab} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 text-xs">
                      <span className="text-gray-400">{lab}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-gray-800" role="img" aria-label={`${lab}: ${n} of ${total}`}>
                        <i className="block h-full rounded-full" style={{ width: `${(n / total) * 100}%`, background: col }} />
                      </span>
                      <span className="text-right font-medium text-gray-200">
                        {n}
                        {lab !== "Contacted" && of ? <small className="ml-1 text-gray-500">{Math.round((n / of) * 100)}%</small> : null}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-gray-500">{config.funnelHint}</p>
              </section>
            </div>
          </div>

          <section className="card relative mb-8 p-5" aria-label="Weekly momentum">
            <h2 className="mb-0.5 text-sm font-semibold text-gray-100">Weekly momentum</h2>
            <p className="mb-2 text-xs text-gray-500">Messages sent per week across both lists. The dashed line is the goal of {WEEKLY_GOAL}.</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Messages sent per week, last ${weeks.length} weeks: ${weeks.map((w) => w.n).join(", ")}`}>
              {[0, Math.round(maxW / 2), maxW].map((v) => (
                <g key={v}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgb(var(--gray-800))" />
                  <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="rgb(var(--gray-500))">
                    {v}
                  </text>
                </g>
              ))}
              <line x1={pad.l} x2={W - pad.r} y1={y(WEEKLY_GOAL)} y2={y(WEEKLY_GOAL)} stroke="#eab308" strokeWidth={1.5} strokeDasharray="5 5" />
              <text x={W - pad.r} y={y(WEEKLY_GOAL) - 6} textAnchor="end" fontSize={11} fontWeight={700} fill="rgb(var(--gold-fg))">
                Goal {WEEKLY_GOAL}
              </text>
              {weeks.map((w, i) => {
                const x = pad.l + i * bw + bw * 0.22;
                const bwid = bw * 0.56;
                const top = y(w.n);
                const base = y(0);
                const now = i === weeks.length - 1;
                return (
                  <g key={i}>
                    {w.n > 0 ? (
                      <>
                        <rect x={x} y={top} width={bwid} height={base - top} rx={4} fill={statusColor("sent")} opacity={now ? 1 : 0.75} />
                        <text x={x + bwid / 2} y={top - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="rgb(var(--gray-100))">
                          {w.n}
                        </text>
                      </>
                    ) : (
                      <rect x={x} y={base - 2} width={bwid} height={2} rx={1} fill="rgb(var(--gray-700))" />
                    )}
                    <text x={x + bwid / 2} y={H - 10} textAnchor="middle" fontSize={11} fontWeight={now ? 700 : 500} fill={now ? "rgb(var(--gray-100))" : "rgb(var(--gray-500))"}>
                      {now ? "Now" : fmt(w.start)}
                    </text>
                    <rect
                      x={pad.l + i * bw}
                      y={pad.t}
                      width={bw}
                      height={H - pad.t - pad.b}
                      fill="transparent"
                      onMouseEnter={() => setWeekTip(i)}
                      onMouseLeave={() => setWeekTip(null)}
                    />
                  </g>
                );
              })}
            </svg>
            {weekTip !== null && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 shadow-lg shadow-black/40"
                style={{ left: `calc(1.25rem + (100% - 2.5rem) * ${(pad.l + weekTip * bw + bw / 2) / W})`, top: `calc(4.25rem + (100% - 6.5rem) * ${(y(weeks[weekTip].n) - 8) / H})` }}
              >
                {weeks[weekTip].n} sent
                <span className="block text-[11px] font-normal text-gray-500">Week of {fmt(weeks[weekTip].start)}</span>
              </div>
            )}
          </section>

          <div ref={listTop} className="scroll-mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-100">Organisations</h2>
              <label className="relative w-full sm:w-64">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search organisations"
                  aria-label="Search organisations"
                  className="input pl-9"
                />
              </label>
            </div>
            <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {tabs.map((t) => (
                <button
                  key={t.v}
                  type="button"
                  aria-pressed={effectiveFilter === t.v}
                  onClick={() => setFilter(t.v)}
                  className={`focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    effectiveFilter === t.v
                      ? "border-bas-gold bg-bas-gold text-on-gold"
                      : "border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-gray-100"
                  }`}
                >
                  {t.label} <b className="ml-0.5">{t.n}</b>
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="card px-4 py-8 text-center text-sm text-gray-500">
                {q ? `No organisations match “${query.trim()}”.` : "Nothing here yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((o) => (
                  <OrgRow
                    key={o.slug}
                    org={o}
                    progress={progress[o.slug]}
                    config={config}
                    open={open.has(o.slug)}
                    onToggle={(isOpen) =>
                      setOpen((s) => {
                        const n = new Set(s);
                        if (isOpen) n.add(o.slug);
                        else n.delete(o.slug);
                        return n;
                      })
                    }
                    variant={variants[o.slug]}
                    onVariant={(v) => setVariants((m) => ({ ...m, [o.slug]: v }))}
                    onStatus={(s) => setStatus(o.slug, s)}
                    onNote={(note) => act({ slug: o.slug, type: "note", note })}
                    onFollowUp={() => logFollowUp(o.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  );
}

function CardHead({ title, chip }: { title: string; chip?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
      {chip && <span className="rounded-full bg-bas-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold-fg">{chip}</span>}
    </div>
  );
}

function Stat({ ring, label, value, of, sub }: { ring?: React.ReactNode; label: string; value: number; of?: number; sub: string }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      {ring}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-2xl font-semibold leading-tight text-gray-50">
          {value}
          {of !== undefined && <span className="text-base font-normal text-gray-500"> / {of}</span>}
        </div>
        <div className="truncate text-xs text-gray-500">{sub}</div>
      </div>
    </div>
  );
}
