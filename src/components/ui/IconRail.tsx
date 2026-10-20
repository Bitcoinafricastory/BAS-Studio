"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { applyTheme, readStoredMode, storeMode, type ThemeMode } from "@/lib/theme";
import {
  Sparkles,
  Newspaper,
  SquarePen,
  Rss,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Moon,
  Monitor,
  type LucideIcon,
} from "lucide-react";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/leads", label: "Leads", icon: Newspaper },
  { href: "/draft", label: "New Draft", icon: SquarePen },
  { href: "/distribute", label: "Distribute", icon: Share2 },
  { href: "/sources", label: "Sources", icon: Rss },
];

const STORAGE_KEY = "bas-studio-rail-expanded";

const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];
const THEME_META: Record<ThemeMode, { label: string; icon: LucideIcon }> = {
  system: { label: "System theme", icon: Monitor },
  light: { label: "Light theme", icon: Sun },
  dark: { label: "Dark theme", icon: Moon },
};

export default function IconRail() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname() || "/";
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  // In System mode, follow the device live (e.g. when it switches to dark at sunset).
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length];
    setMode(next);
    storeMode(next);
    applyTheme(next);
  }
  const ThemeIcon = THEME_META[mode].icon;

  // Remember the choice between visits. Wrapped in try/catch because storage can be
  // blocked (private windows) and the rail must still work without it.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setExpanded(true);
    } catch {}
  }, []);

  function toggle() {
    setExpanded((e) => {
      const next = !e;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 bg-black border-r border-gray-800 flex flex-col py-3 transition-[width] duration-200 ${
        expanded ? "w-52 px-3" : "w-[68px] px-2.5"
      }`}
    >
      {/* Brand: logo always has its own row, so nothing can be squeezed or clipped
          when the rail is collapsed. */}
      <Link
        href="/"
        aria-label="Bitcoin Africa Story, home"
        className={`flex items-center gap-3 rounded-xl h-11 ${expanded ? "px-2" : "justify-center"} focus-ring`}
      >
        <span className="relative w-7 h-7 shrink-0">
          <Image src="/bas-logo-icon.png" alt="" fill sizes="28px" className="object-contain" priority />
        </span>
        {expanded && (
          <span className="text-sm font-semibold tracking-tight text-gray-50 whitespace-nowrap">BAS Studio</span>
        )}
      </Link>

      <nav className="flex flex-col gap-1 mt-5" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 h-10 rounded-xl text-sm font-medium transition-colors focus-ring ${
                expanded ? "px-3" : "justify-center"
              } ${
                active
                  ? "bg-bas-gold/15 text-gold-fg"
                  : "text-gray-400 hover:text-gray-50 hover:bg-gray-900"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
              {expanded && <span className="whitespace-nowrap">{label}</span>}
              {!expanded && <Tooltip label={label} />}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-1 pt-3 border-t border-gray-800">
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={isActive("/settings") ? "page" : undefined}
          className={`group relative flex items-center gap-3 h-10 rounded-xl text-sm font-medium transition-colors focus-ring ${
            expanded ? "px-3" : "justify-center"
          } ${
            isActive("/settings")
              ? "bg-bas-gold/15 text-gold-fg"
              : "text-gray-400 hover:text-gray-50 hover:bg-gray-900"
          }`}
        >
          <Settings size={18} strokeWidth={1.75} className="shrink-0" />
          {expanded && <span className="whitespace-nowrap">Settings</span>}
          {!expanded && <Tooltip label="Settings" />}
        </Link>

        <button
          type="button"
          onClick={cycleTheme}
          aria-label={`${THEME_META[mode].label}. Click to change.`}
          className={`group relative flex items-center gap-3 h-10 rounded-xl text-sm text-gray-500 hover:text-gray-50 hover:bg-gray-900 transition-colors focus-ring ${
            expanded ? "px-3" : "justify-center"
          }`}
        >
          <ThemeIcon size={18} strokeWidth={1.75} className="shrink-0" />
          {expanded && <span className="whitespace-nowrap">{THEME_META[mode].label}</span>}
          {!expanded && <Tooltip label={THEME_META[mode].label} />}
        </button>

        {/* The collapse control lives at the bottom, away from the logo, like most
            app shells — and it swaps icon so it always shows what a click will do. */}
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={`group relative flex items-center gap-3 h-10 rounded-xl text-sm text-gray-500 hover:text-gray-50 hover:bg-gray-900 transition-colors focus-ring ${
            expanded ? "px-3" : "justify-center"
          }`}
        >
          {expanded ? (
            <PanelLeftClose size={18} strokeWidth={1.75} className="shrink-0" />
          ) : (
            <PanelLeftOpen size={18} strokeWidth={1.75} className="shrink-0" />
          )}
          {expanded && <span className="whitespace-nowrap">Collapse</span>}
          {!expanded && <Tooltip label="Expand" />}
        </button>
      </div>
    </aside>
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 border border-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-100 opacity-0 translate-x-[-4px] shadow-lg shadow-black/50 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
    >
      {label}
    </span>
  );
}
