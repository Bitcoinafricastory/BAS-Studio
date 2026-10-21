"use client";

import { useEffect, useMemo, useState } from "react";
import { QUIET, STATUS_DEF, sortOrgs, statusColor } from "@/lib/outreach/state";
import type { ListConfig } from "@/lib/outreach/state";
import { WHERE } from "@/lib/outreach/orgs";
import type { Org, ProgressMap } from "@/lib/outreach/types";

interface Africa {
  view: [number, number, number, number];
  paths: Record<string, string>;
  anchors: Record<string, [number, number]>;
}

const LABEL_DIR: Record<string, "n" | "w"> = { Uganda: "n", Burundi: "w" };
const whereOf = (o: Org) => (o.where ? (o.where === "pan" ? null : o.where) : WHERE[o.slug] || null);

export default function OutreachMap({
  config,
  progress,
  onSelect,
}: {
  config: ListConfig;
  progress: ProgressMap;
  onSelect: (slug: string) => void;
}) {
  const [africa, setAfrica] = useState<Africa | null>(null);
  const [tip, setTip] = useState<{ slug: string; x: number; y: number } | null>(null);

  // The map data is large (every country outline), so it loads only when this screen opens.
  useEffect(() => {
    let live = true;
    import("@/lib/outreach/africa.json").then((m) => live && setAfrica((m.default || m) as unknown as Africa));
    return () => {
      live = false;
    };
  }, []);

  const orgs = useMemo(() => sortOrgs(config.orgs), [config]);
  const statusOf = (slug: string) => progress[slug]?.status ?? "todo";

  const layout = useMemo(() => {
    if (!africa) return null;
    const groups: Record<string, Org[]> = {};
    for (const o of orgs) (groups[whereOf(o) || "pan"] ||= []).push(o);
    const pos: Record<string, { x: number; y: number }> = {};
    const radius: Record<string, number> = {};
    const gap = 17;
    for (const [k, list] of Object.entries(groups)) {
      const [ax, ay] = k === "pan" ? africa.anchors.PAN : africa.anchors[k];
      list.forEach((o, i) => {
        if (i === 0 && k !== "pan") {
          pos[o.slug] = { x: ax, y: ay };
          return;
        }
        const n = k === "pan" ? i + 1 : i;
        const a = n * 2.39996;
        const r = gap * Math.sqrt(n) * 0.95;
        pos[o.slug] = { x: ax + r * Math.cos(a), y: ay + r * Math.sin(a) };
      });
      radius[k] = gap * Math.sqrt(list.length) * 0.95;
    }
    return { groups, pos, radius };
  }, [africa, orgs]);

  if (!africa || !layout) return <div className="skeleton aspect-[434/620] w-full rounded-xl" />;

  const { view, paths, anchors } = africa;
  const { groups, pos, radius } = layout;
  const hub = anchors.Lagos;
  const WIN = config.win;
  const wonCount = orgs.filter((o) => statusOf(o.slug) === WIN).length;
  const tipOrg = tip ? orgs.find((o) => o.slug === tip.slug) : null;

  return (
    <div className="relative">
      <svg
        viewBox={view.join(" ")}
        role="group"
        aria-label={`Map of Africa: ${wonCount} of ${orgs.length} organisations: ${config.ringText}`}
        className="mx-auto block max-h-[620px] w-full"
      >
        {Object.entries(paths).map(([name, d]) => (
          <path
            key={name}
            d={d}
            fill={groups[name] ? "rgb(var(--gray-700))" : "rgb(var(--gray-800))"}
            fillOpacity={groups[name] ? 0.9 : 0.7}
            stroke="rgb(var(--gray-950))"
            strokeWidth={0.7}
          />
        ))}
        {groups.pan && (
          <circle
            cx={anchors.PAN[0]}
            cy={anchors.PAN[1]}
            r={radius.pan + 14}
            fill="none"
            stroke="rgb(var(--gray-600))"
            strokeWidth={1.2}
            strokeDasharray="3 4"
          />
        )}

        {orgs.map((o) => {
          const st = statusOf(o.slug);
          if (st === "todo") return null;
          const p = pos[o.slug];
          const mx = (hub[0] + p.x) / 2;
          const my = (hub[1] + p.y) / 2;
          const dx = p.x - hub[0];
          const dy = p.y - hub[1];
          const len = Math.hypot(dx, dy) || 1;
          const bend = Math.min(90, len * 0.28);
          const cx = mx - (dy / len) * bend;
          const cy = my + (dx / len) * bend;
          const d = `M${hub[0]},${hub[1]} Q${cx.toFixed(1)},${cy.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          const col = statusColor(st);
          if (st === WIN) return <path key={o.slug} d={d} fill="none" stroke={col} strokeWidth={2.5} />;
          if (QUIET.has(st)) return <path key={o.slug} d={d} fill="none" stroke={col} strokeWidth={1} strokeDasharray="2 5" opacity={0.5} />;
          return <path key={o.slug} d={d} fill="none" stroke={col} strokeWidth={1.6} strokeDasharray="4 5" opacity={0.85} />;
        })}

        <circle cx={hub[0]} cy={hub[1]} r={20} fill="rgb(var(--gold-fg) / 0.25)" />
        <circle cx={hub[0]} cy={hub[1]} r={13} fill="#eab308" stroke="rgb(var(--gray-950))" strokeWidth={2} />
        <text x={hub[0]} y={hub[1] + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#000">
          B
        </text>
        <text
          x={hub[0]}
          y={hub[1] + 30}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill="rgb(var(--gray-100))"
          stroke="rgb(var(--gray-950))"
          strokeWidth={3}
          paintOrder="stroke"
        >
          Lagos
        </text>

        {orgs.map((o) => {
          const st = statusOf(o.slug);
          const p = pos[o.slug];
          const col = statusColor(st);
          const r = o.priority === "high" ? 7 : 6;
          const quiet = QUIET.has(st);
          return (
            <g
              key={o.slug}
              tabIndex={0}
              role="button"
              aria-label={`${o.name}: ${STATUS_DEF[st].label}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setTip({ slug: o.slug, x: p.x, y: p.y - r })}
              onFocus={() => setTip({ slug: o.slug, x: p.x, y: p.y - r })}
              onMouseLeave={() => setTip(null)}
              onBlur={() => setTip(null)}
              onClick={() => onSelect(o.slug)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(o.slug)}
            >
              {st === WIN && <circle cx={p.x} cy={p.y} r={r + 7} fill={col} opacity={0.3} />}
              <circle cx={p.x} cy={p.y} r={r + 6} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={st === "todo" || quiet ? "rgb(var(--gray-900))" : col}
                stroke={st === "todo" ? "rgb(var(--gray-500))" : col}
                strokeWidth={2.2}
                strokeDasharray={quiet ? "2 2" : undefined}
              />
            </g>
          );
        })}

        {orgs.map((o) => {
          if (statusOf(o.slug) !== WIN) return null;
          const p = pos[o.slug];
          const r = o.priority === "high" ? 7 : 6;
          const right = p.x < view[0] + view[2] - 90;
          return (
            <text
              key={`l-${o.slug}`}
              x={p.x + (right ? r + 6 : -r - 6)}
              y={p.y + 4}
              textAnchor={right ? "start" : "end"}
              fontSize={11.5}
              fontWeight={700}
              fill="rgb(var(--gray-50))"
              stroke="rgb(var(--gray-950))"
              strokeWidth={3}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {o.name}
            </text>
          );
        })}

        {Object.entries(groups).map(([k, g]) => {
          if (k !== "pan" && g.length < 2) return null;
          const [ax, ay] = k === "pan" ? anchors.PAN : anchors[k];
          const dir = LABEL_DIR[k] || "s";
          let lx = ax;
          let ly = ay + radius[k] + 16;
          let anchor: "middle" | "end" = "middle";
          if (dir === "n") ly = ay - radius[k] - 10;
          if (dir === "w") {
            lx = ax - radius[k] - 10;
            ly = ay + 4;
            anchor = "end";
          }
          return (
            <text
              key={`g-${k}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              fontSize={10}
              fontWeight={700}
              letterSpacing=".08em"
              fill="rgb(var(--gray-400))"
              stroke="rgb(var(--gray-950))"
              strokeWidth={3}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {(k === "pan" ? "PAN-AFRICAN & GLOBAL" : k.toUpperCase()) + ` · ${g.length}`}
            </text>
          );
        })}
      </svg>

      {tip && tipOrg && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-gray-100 shadow-lg shadow-black/40"
          style={{
            left: `${((tip.x - view[0]) / view[2]) * 100}%`,
            top: `${(tip.y / view[3]) * 100}%`,
            marginTop: -6,
          }}
        >
          {tipOrg.name}
          <span className="block text-[11px] font-normal text-gray-500">
            {STATUS_DEF[statusOf(tipOrg.slug)].label} · {whereOf(tipOrg) || "Pan-African"}
          </span>
        </div>
      )}

      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-gray-500">
        {config.statuses.map((s) => (
          <li key={s.v} className="flex items-center gap-1.5">
            <i
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={
                s.v === "todo"
                  ? { border: "2px solid rgb(var(--gray-500))" }
                  : QUIET.has(s.v)
                    ? { border: `2px dashed ${statusColor(s.v)}` }
                    : { background: statusColor(s.v) }
              }
            />
            {s.short} {orgs.filter((o) => statusOf(o.slug) === s.v).length}
          </li>
        ))}
      </ul>
    </div>
  );
}
