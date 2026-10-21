"use client";

import { useEffect, useMemo, useState } from "react";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { Search, SquarePlus, Pencil, Trash2, X, Check, MessagesSquare } from "lucide-react";
import type { ChatSummary } from "@/types/chat";

interface Props {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  busy: boolean; // a reply is in flight: switching chats now would put it in the wrong chat
  version: number; // bumps after each save so the list refreshes
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Earlier";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), d) <= 7) return "Previous 7 days";
  return "Earlier";
}
const ORDER = ["Today", "Yesterday", "Previous 7 days", "Earlier"];

export default function ChatHistory({ open, onClose, activeId, busy, version, onSelect, onNew, onDeleted }: Props) {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load chats");
        if (!cancelled) {
          setChats(data.chats);
          setError("");
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, version]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats;
    const map = new Map<string, ChatSummary[]>();
    list.forEach((c) => {
      const g = groupLabel(c.updatedAt);
      map.set(g, [...(map.get(g) || []), c]);
    });
    return ORDER.filter((g) => map.has(g)).map((g) => ({ label: g, items: map.get(g)! }));
  }, [chats, query]);

  async function saveRename(id: string) {
    const title = draftTitle.trim();
    setRenaming(null);
    if (!title) return;
    const prev = chats;
    setChats((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
    try {
      const res = await fetch("/api/chats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setChats(prev);
      setError("Couldn't rename that chat.");
    }
  }

  async function remove(id: string) {
    const prev = chats;
    setConfirming(null);
    setChats((c) => c.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/chats?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDeleted(id);
    } catch {
      setChats(prev);
      setError("Couldn't delete that chat.");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Narrow screens: the panel floats over the chat, so a backdrop closes it. */}
      <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} aria-hidden />
      <aside
        aria-label="Chat history"
        className="fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col border-r border-gray-800 bg-black lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shrink-0"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-sm font-semibold text-gray-100">Chats</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNew}
              disabled={busy}
              aria-label="New chat"
              title="New chat"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-50 disabled:opacity-40 focus-ring"
            >
              <SquarePlus size={16} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close history"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-50 focus-ring lg:hidden"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative px-3 pb-2">
          <Search size={13} className="absolute left-6 top-1/2 -translate-y-[60%] text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="input rounded-full py-2 pl-9 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {error && <p className="px-2 py-2 text-xs text-red-400">{error}</p>}

          {loading && (
            <div className="flex flex-col gap-1.5 px-1 pt-2" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-9" />
              ))}
            </div>
          )}

          {!loading && !error && chats.length === 0 && (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <MessagesSquare size={22} className="mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-300">No chats yet</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Your conversations are saved here automatically.</p>
            </div>
          )}

          {!loading && chats.length > 0 && groups.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-gray-500">No chats match “{query}”.</p>
          )}

          {groups.map((g) => (
            <section key={g.label} className="mt-3">
              <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">{g.label}</h3>
              <ul className="flex flex-col gap-0.5">
                {g.items.map((c) => {
                  const active = c.id === activeId;
                  return (
                    <li key={c.id} className="group relative">
                      {renaming === c.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            saveRename(c.id);
                          }}
                          className="flex items-center gap-1 px-1 py-0.5"
                        >
                          <input
                            autoFocus
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                            maxLength={100}
                            aria-label="Chat title"
                            className="input rounded-lg py-1.5 text-xs"
                          />
                          <button type="submit" aria-label="Save title" className="rounded p-1.5 text-gold-fg hover:bg-gray-900 focus-ring">
                            <Check size={14} />
                          </button>
                        </form>
                      ) : confirming === c.id ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-red-950/30 px-3 py-2 text-xs">
                          <span className="truncate text-red-300">Delete this chat?</span>
                          <span className="flex shrink-0 gap-2">
                            <button onClick={() => remove(c.id)} className="font-semibold text-red-400 hover:text-red-300">
                              Delete
                            </button>
                            <button onClick={() => setConfirming(null)} className="text-gray-400 hover:text-gray-200">
                              Cancel
                            </button>
                          </span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onSelect(c.id)}
                            disabled={busy && !active}
                            aria-current={active ? "true" : undefined}
                            className={`w-full truncate rounded-lg px-3 py-2 pr-16 text-left text-[13px] transition-colors disabled:opacity-50 focus-ring ${
                              active ? "bg-bas-gold/15 font-medium text-gold-fg" : "text-gray-300 hover:bg-gray-900 hover:text-gray-50"
                            }`}
                            title={c.title}
                          >
                            {c.title}
                          </button>
                          <span className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              onClick={() => {
                                setRenaming(c.id);
                                setDraftTitle(c.title);
                              }}
                              aria-label={`Rename ${c.title}`}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-100 focus-ring"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirming(c.id)}
                              disabled={busy && active}
                              aria-label={`Delete ${c.title}`}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-800 hover:text-red-400 disabled:opacity-40 focus-ring"
                            >
                              <Trash2 size={13} />
                            </button>
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
