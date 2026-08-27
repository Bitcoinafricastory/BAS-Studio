"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Mic, MicOff, ScanLine, Search, Loader2, ArrowUp, PenSquare } from "lucide-react";
import ResearchCard from "@/components/assistant/ResearchCard";
import type { ResearchResult } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  research?: ResearchResult;
}

const QUICK_CHIPS = [
  { label: "Bitcoin News in Africa", prompt: "What's the latest Bitcoin news across Africa right now?" },
  {
    label: "Explore Bitcoin Programs",
    prompt: "What Bitcoin education and adoption programs are active in Africa?",
  },
];

const FOLLOW_UP_CHIPS = ["Make it less redundant.", "Make it more concise.", "Give me a stronger angle."];

export default function HomePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draftingFromChat, setDraftingFromChat] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [provider, setProvider] = useState<"claude" | "grok">("claude");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const started = messages.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setInput("");
      setLoading(true);

      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, deep: deepSearch, provider }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");

        if (data.type === "research") {
          setMessages((m) => [...m, { role: "assistant", content: "", research: data.research }]);
        } else {
          setMessages((m) => [...m, { role: "assistant", content: data.text }]);
        }
      } catch (err: any) {
        setMessages((m) => [...m, { role: "assistant", content: `Something went wrong: ${err.message}` }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, deepSearch, provider]
  );

  function toggleDictation() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript;
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  // Turns everything the writer has typed in this conversation into notes and hands them
  // to the same generateDraft pipeline the New Draft screen uses (kind: "notes"). This is
  // the chat-native path for drafting — for YouTube/audio, the New Draft screen's file
  // inputs are still the right tool, since chat can't handle file uploads.
  async function draftFromChat() {
    const notes = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n\n");
    if (!notes.trim() || draftingFromChat) return;

    setDraftingFromChat(true);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceMaterial: notes, kind: "notes" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft generation failed");
      localStorage.setItem("bas-studio-pending-draft", JSON.stringify(data));
      router.push("/edit");
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Couldn't generate a draft: ${err.message}` }]);
    } finally {
      setDraftingFromChat(false);
    }
  }

  const lastAssistantIsText =
    messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].research;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-14 h-14 bg-bas-gold rounded-lg flex items-center justify-center text-black font-bold text-2xl">
              B
            </div>
            <div className="text-2xl font-bold leading-none text-gray-50 tracking-tight">
              BITCOIN
              <br />
              AFRICA
              <br />
              STORY
            </div>
          </div>

          <SearchBar
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            deepSearch={deepSearch}
            setDeepSearch={setDeepSearch}
            provider={provider}
            setProvider={setProvider}
            listening={listening}
            speechSupported={speechSupported}
            onDictate={toggleDictation}
            onScan={() => router.push("/draft")}
            loading={loading}
            empty
          />

          <div className="flex items-center gap-3 mt-5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => send(chip.prompt)}
                className="text-sm px-4 py-2 rounded-full bg-gray-800/60 hover:bg-gray-800 text-gray-200 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-10">
            Est. 2024 · <span className="text-bas-gold">Reporting from the ground</span>
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-end px-4 sm:px-8 pt-4">
            <button
              onClick={draftFromChat}
              disabled={draftingFromChat}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-medium transition-colors"
            >
              {draftingFromChat ? <Loader2 size={12} className="animate-spin" /> : <PenSquare size={12} />}
              Draft this
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 max-w-3xl w-full mx-auto flex flex-col gap-6">
            {messages.map((m, i) =>
              m.research ? (
                <div key={i} className="max-w-[90%] self-start">
                  <ResearchCard result={m.research} />
                </div>
              ) : m.role === "user" ? (
                <div
                  key={i}
                  className="max-w-[80%] self-end bg-gray-800 text-gray-100 rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
                >
                  {m.content}
                </div>
              ) : (
                <div key={i} className="max-w-[85%] self-start text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              )
            )}

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            )}

            {lastAssistantIsText && !loading && (
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_CHIPS.slice(0, 2).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => send(chip)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-800/60 hover:bg-gray-800 text-gray-300 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="px-4 sm:px-8 pb-6 max-w-3xl w-full mx-auto">
            <SearchBar
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              deepSearch={deepSearch}
              setDeepSearch={setDeepSearch}
              provider={provider}
              setProvider={setProvider}
              listening={listening}
              speechSupported={speechSupported}
              onDictate={toggleDictation}
              onScan={() => router.push("/draft")}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SearchBar({
  input,
  setInput,
  onSubmit,
  deepSearch,
  setDeepSearch,
  provider,
  setProvider,
  listening,
  speechSupported,
  onDictate,
  onScan,
  loading,
  empty = false,
}: {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  deepSearch: boolean;
  setDeepSearch: (v: boolean) => void;
  provider: "claude" | "grok";
  setProvider: (v: "claude" | "grok") => void;
  listening: boolean;
  speechSupported: boolean;
  onDictate: () => void;
  onScan: () => void;
  loading: boolean;
  empty?: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`flex items-center gap-2 bg-gray-800/60 rounded-full pl-4 pr-2 py-2 ${
        empty ? "w-full max-w-xl" : "w-full"
      }`}
    >
      <Plus size={18} className="text-gray-400 shrink-0" />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={empty ? undefined : "Ask anything Bitcoin in Africa"}
        className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none min-w-0"
      />
      <button
        type="button"
        onClick={() => setProvider(provider === "claude" ? "grok" : "claude")}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0 bg-gray-700/60 text-gray-300 hover:text-gray-100 transition-colors"
      >
        {provider === "claude" ? "Claude" : "Grok"}
      </button>
      {provider === "claude" ? (
        <button
          type="button"
          onClick={() => setDeepSearch((d: boolean) => !d)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0 transition-colors ${
            deepSearch ? "bg-bas-gold text-black font-medium" : "bg-gray-700/60 text-gray-300 hover:text-gray-100"
          }`}
        >
          <Search size={13} /> {empty ? "AI Mode" : "Deep Search"}
        </button>
      ) : (
        <span
          title="Grok always searches X and the web live"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0 bg-gray-700/30 text-gray-500"
        >
          <Search size={13} /> Live
        </span>
      )}
      <button
        type="button"
        onClick={onDictate}
        aria-label="Dictate"
        className={`shrink-0 p-1.5 rounded-full transition-colors ${
          listening ? "text-red-400" : "text-gray-400 hover:text-gray-100"
        }`}
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <button
        type="button"
        onClick={onScan}
        aria-label="Add audio, video, or a file"
        className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-100 transition-colors"
      >
        <ScanLine size={16} />
      </button>
      {!empty && (
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="shrink-0 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-40 text-black rounded-full p-2 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
        </button>
      )}
      {!speechSupported && (
        <span className="text-[10px] text-gray-600 absolute -bottom-5">Dictation needs Chrome</span>
      )}
    </form>
  );
}
