import { COVERAGE, DIRECTORY, SEED_ORGS } from "./orgs";
import { followUp, message, reviewMessage } from "./messages";
import type { History, Org, OutreachAction, OutreachMode, Progress, ProgressMap, StatusValue } from "./types";

// Pure logic, shared by the page and the API route so both agree on what a change does.

export const WEEKLY_GOAL = 7;
export const FU_GAPS = [5, 7, 10, 14, 21];
export const FU_MAX = FU_GAPS.length;
export const CLOSE_AFTER = 30;
const DAY = 864e5;

export interface StatusDef {
  v: StatusValue;
  label: string;
  short: string;
}

const TODO: StatusDef = { v: "todo", label: "Not contacted", short: "To do" };
const SENT: StatusDef = { v: "sent", label: "Sent", short: "Sent" };
const REPLIED: StatusDef = { v: "replied", label: "Replied", short: "Replied" };

export interface ListConfig {
  label: string;
  sub: string;
  hint: string;
  statuses: StatusDef[];
  win: StatusValue;
  ringTitle: string;
  ringText: string;
  winShort: string;
  funnel: [string, StatusValue[]][];
  funnelHint: string;
  orgs: Org[];
}

export const LISTS: Record<OutreachMode, ListConfig> = {
  coverage: {
    label: "Article coverage",
    sub: "Get the organisations you’ve written about to link back to Bitcoin Africa Story.",
    hint: "Every organisation you’ve written about, placed in its country. Lines run to Bitcoin Africa Story in Lagos; green ones already link to you.",
    statuses: [
      TODO,
      SENT,
      REPLIED,
      { v: "linked", label: "Linked to us", short: "Linked" },
      { v: "declined", label: "Declined", short: "Declined" },
    ],
    win: "linked",
    ringTitle: "Backlinks won",
    ringText: "sites link to you",
    winShort: "linked",
    funnel: [
      ["Replied", ["replied", "linked"]],
      ["Linked", ["linked"]],
    ],
    funnelHint: "Percentages are of organisations contacted. A 20–30% link rate is a good result for cold outreach.",
    orgs: COVERAGE,
  },
  directory: {
    label: "Story leads",
    sub: "Get directory organisations to update their profile and send you news worth a story.",
    hint: "Directory organisations you haven’t written a story about yet, placed in their country. Lines run to Bitcoin Africa Story in Lagos; green ones have a story published.",
    statuses: [
      TODO,
      SENT,
      REPLIED,
      { v: "updated", label: "Profile updated", short: "Updated" },
      { v: "story", label: "Story published", short: "Story" },
      { v: "noreply", label: "No reply", short: "No reply" },
    ],
    win: "story",
    ringTitle: "Stories published",
    ringText: "leads turned into stories",
    winShort: "stories",
    funnel: [
      ["Replied", ["replied", "updated", "story"]],
      ["Updated", ["updated", "story"]],
      ["Story", ["story"]],
    ],
    funnelHint:
      "Percentages are of organisations contacted. When a story goes live, the organisation moves to Article coverage, where you ask for the link.",
    orgs: DIRECTORY,
  },
};

/** Statuses that mean "this one is closed without a win". */
export const QUIET = new Set<StatusValue>(["declined", "noreply"]);

const ALL_STATUSES = new Set<StatusValue>(["todo", "sent", "replied", "linked", "declined", "updated", "story", "noreply"]);
export const isStatus = (v: unknown): v is StatusValue => typeof v === "string" && ALL_STATUSES.has(v as StatusValue);

export const STATUS_DEF = Object.fromEntries(
  [...LISTS.coverage.statuses, ...LISTS.directory.statuses].map((s) => [s.v, s]),
) as Record<StatusValue, StatusDef>;

/** Progress that already existed in the standalone tracker, so nothing is lost on the move. */
export const SEED_PROGRESS: ProgressMap = {
  molobtc: {
    status: "linked",
    note: "molobtc.africa already links to bitcoinafricastory.com (checked Oct 2026)",
    history: { linked: "2026-10-17T16:40:00.000Z" },
    updatedAt: "2026-10-17T16:40:00.000Z",
  },
  rurbit: {
    status: "sent",
    note: "",
    history: { sent: "2026-10-19T02:26:53.818Z" },
    updatedAt: "2026-10-19T02:26:57.442Z",
  },
};

/** CSS colour for a status; Story shares the "linked" green and No reply the "declined" red. */
export const statusColor = (s: StatusValue, alpha?: number) => {
  const k = s === "story" ? "linked" : s === "noreply" ? "declined" : s;
  return alpha === undefined ? `rgb(var(--s-${k}))` : `rgb(var(--s-${k}) / ${alpha})`;
};

export const PRI = { high: 0, medium: 1, low: 2 } as const;
export const sortOrgs = (orgs: Org[]) => orgs.slice().sort((a, b) => PRI[a.priority] - PRI[b.priority]);
export const findOrg = (slug: string) => SEED_ORGS.find((o) => o.slug === slug);

/**
 * Applies one action to a slug's progress and returns the new document.
 */
export function applyAction(prev: Progress | undefined, action: OutreachAction, nowIso: string): Progress {
  const base: Progress = {
    status: prev?.status ?? "todo",
    note: prev?.note ?? "",
    history: { ...(prev?.history ?? {}) },
  };
  if (action.type === "status") {
    base.status = action.status;
    if (action.status !== "todo" && !base.history[action.status as keyof History]) {
      (base.history as Record<string, string>)[action.status] = nowIso;
    }
  } else if (action.type === "note") {
    base.note = action.note.slice(0, 1000);
  } else {
    base.history.followups = [...(base.history.followups ?? []), nowIso].slice(0, FU_MAX);
  }
  base.updatedAt = nowIso;
  return base;
}

export interface FollowState {
  done: number;
  next: number | null;
  days: number;
  due: boolean;
  inDays?: number;
  close?: boolean;
}

export function followState(p: Progress | undefined, now = Date.now()): FollowState | null {
  if (!p || p.status !== "sent" || !p.history?.sent) return null;
  const fus = p.history.followups ?? [];
  const last = new Date(fus.length ? fus[fus.length - 1] : p.history.sent).getTime();
  const days = Math.floor((now - last) / DAY);
  if (fus.length < FU_MAX) {
    const gap = FU_GAPS[fus.length];
    return { done: fus.length, next: fus.length + 1, days, due: days >= gap, inDays: gap - days };
  }
  return { done: FU_MAX, next: null, days, due: false, close: days >= CLOSE_AFTER };
}

/** Story leads who replied but haven't updated their profile yet: send the profile check. */
export const needsReview = (o: Org, p: Progress | undefined) => o.kind === "directory" && p?.status === "replied";

export type Variant = "first" | "review" | "fu1" | "fu2" | "fu3" | "fu4" | "fu5";

export function defaultVariant(o: Org, p: Progress | undefined): Variant {
  const f = followState(p);
  if (f?.due && f.next) return `fu${f.next}` as Variant;
  return needsReview(o, p) ? "review" : "first";
}

export function textFor(o: Org, v: Variant): string {
  if (v.startsWith("fu")) return followUp(o, Number(v.slice(2)));
  return v === "review" ? reviewMessage(o) : message(o);
}

export const variantLabel = (v: Variant) => (v === "first" ? "message" : v === "review" ? "profile check" : `follow-up ${v.slice(2)}`);

export const ago = (d: number) => (d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);

export function weekStart(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

/** A message counts as sent when first marked Sent; if someone jumped ahead, use that time. */
export function sentTimes(progress: ProgressMap): Date[] {
  const out: Date[] = [];
  for (const o of SEED_ORGS) {
    const h = progress[o.slug]?.history;
    const t = h && (h.sent || h.replied || h.linked || h.declined || h.updated || h.story);
    if (t) out.push(new Date(t));
  }
  return out;
}

export const initials = (n: string) =>
  n
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
