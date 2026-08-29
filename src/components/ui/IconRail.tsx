"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Image as ImageIcon, SquarePen, FileSearch, PanelLeft, Settings } from "lucide-react";

const RAIL_LINKS = [
  { href: "/leads", label: "Leads", icon: ImageIcon },
  { href: "/draft", label: "New Draft", icon: SquarePen },
  { href: "/sources", label: "Sources", icon: FileSearch },
];

export default function IconRail() {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`shrink-0 bg-black border-r border-gray-800 flex flex-col transition-all ${
        expanded ? "w-48" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-900">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 relative shrink-0">
            <Image src="/bas-logo-icon.png" alt="Bitcoin Africa Story" fill className="object-contain" priority />
          </div>
          {expanded && <span className="text-xs font-semibold text-gray-100 leading-tight">BAS Studio</span>}
        </Link>
        {/* The lone non-functional search icon that lived here before is gone — a
            clickable-looking element that did nothing was part of what made this feel
            unfinished. The toggle is the only control that actually belongs in the header. */}
        <button
          aria-label="Toggle sidebar"
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-500 hover:text-gray-200 transition-colors p-1 shrink-0"
        >
          <PanelLeft size={16} />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2 py-3">
        {RAIL_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-bas-gold/15 text-bas-gold" : "text-gray-400 hover:text-gray-100 hover:bg-gray-900/50"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-1 h-4 rounded-full bg-bas-gold" />
              )}
              <Icon size={18} className="shrink-0" />
              {expanded && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Spacer pushes Settings to the bottom intentionally, not as leftover empty space —
          the visible border above it now makes that grouping clear instead of ambiguous. */}
      <div className="flex-1" />

      <Link
        href="/settings"
        title="Settings"
        className={`flex items-center gap-3 px-2.5 py-2 mx-2 mb-3 rounded-lg text-sm transition-colors border-t border-gray-900 pt-3 ${
          pathname?.startsWith("/settings")
            ? "bg-bas-gold/15 text-bas-gold"
            : "text-gray-500 hover:text-gray-100 hover:bg-gray-900/50"
        }`}
      >
        <Settings size={18} className="shrink-0" />
        {expanded && <span className="whitespace-nowrap">Settings</span>}
      </Link>
    </aside>
  );
}
