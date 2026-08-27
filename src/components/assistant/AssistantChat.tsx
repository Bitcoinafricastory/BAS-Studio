"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import ResearchCard from "./ResearchCard";
import type { ResearchResult } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  research?: ResearchResult;
}

export default function AssistantChat({
  draftContext,
}: {
  draftContext?: { title: string; content: string } | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, draftContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant failed");

      if (data.type === "research") {
        setMessages((m) => [...m, { role: "assistant", content: "", research: data.research }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.text }]);
      }
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Something went wrong: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">
            Ask anything about your draft, or type a bare name or project (e.g. "Machankura") for
            a quick research brief. For a thorough sweep, use the Research tab instead.
          </p>
        )}
        {messages.map((m, i) =>
          m.research ? (
            <div key={i} className="max-w-[90%]">
              <ResearchCard result={m.research} />
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-bas-gold text-black self-end ml-auto"
                  : "bg-gray-900/50 border border-gray-800 text-gray-100"
              }`}
            >
              {m.content}
            </div>
          )
        )}
        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 pt-3 border-t border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message, or a name/project for quick research…"
          className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black rounded-lg px-4 flex items-center justify-center transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
