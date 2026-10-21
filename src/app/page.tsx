"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback, Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Mic, MicOff, ScanLine, Search, Loader2, ArrowUp, PenSquare, SquarePlus, AlertCircle, History } from "lucide-react";
import ChatHistory from "@/components/chat/ChatHistory";
import ResearchCard from "@/components/assistant/ResearchCard";
import type { ChatMessage, ChatProvider } from "@/types/chat";

const HISTORY_KEY = "bas-studio-history-open";

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
  const [provider, setProvider] = useState<ChatProvider>("claude");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Chat history: every conversation is saved under an id that also lives in the URL (?c=…),
  // so a refresh, a bookmark or a shared link reopens the same chat.
  const [chatId, setChatId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [loadingChat, setLoadingChat] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savedCount = useRef(0); // how many messages the server already has for this chat
  const openedFromUrl = useRef(false);

  const started = messages.length > 0 || loadingChat;
  const handedOver = useRef(false);

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
        setMessages((m) => [...m, { role: "assistant", content: err.message || "Something went wrong", error: true }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, deepSearch, provider]
  );

  // Save after every finished reply. The chat id is created in the browser on the first
  // message, so quick successive saves always update one document.
  useEffect(() => {
    if (loading || messages.length === 0) return;
    if (messages[messages.length - 1].role !== "assistant") return;
    if (messages.length === savedCount.current) return;

    let id = chatId;
    if (!id) {
      id = crypto.randomUUID();
      setChatId(id);
      window.history.replaceState(null, "", `/?c=${id}`);
    }
    const count = messages.length;
    savedCount.current = count;
    fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, messages, provider }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save this chat");
        setSaveError("");
        setHistoryVersion((v) => v + 1);
      })
      .catch((e) => {
        savedCount.current = 0; // try again after the next reply
        setSaveError(e.message || "Could not save this chat");
      });
  }, [messages, loading, chatId, provider]);

  const loadChat = useCallback(async (id: string) => {
    setLoadingChat(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/chats?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open that chat");
      setMessages(data.chat.messages);
      setProvider(data.chat.provider);
      setChatId(id);
      savedCount.current = data.chat.messages.length;
      window.history.replaceState(null, "", `/?c=${id}`);
    } catch (e: any) {
      setMessages([{ role: "assistant", content: e.message || "Could not open that chat", error: true }]);
      savedCount.current = 1; // an error note is not a conversation worth saving
      setChatId(null);
      window.history.replaceState(null, "", "/");
    } finally {
      setLoadingChat(false);
    }
  }, []);

  // Reopen the chat named in the URL, and restore the panel the way it was left.
  useEffect(() => {
    if (openedFromUrl.current) return;
    openedFromUrl.current = true;
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) loadChat(c);
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      setHistoryOpen(stored === null ? window.innerWidth >= 1024 : stored === "1");
    } catch {}
  }, [loadChat]);

  function toggleHistory() {
    setHistoryOpen((o) => {
      try {
        localStorage.setItem(HISTORY_KEY, o ? "0" : "1");
      } catch {}
      return !o;
    });
  }

  function selectChat(id: string) {
    if (loading || id === chatId) return;
    if (window.innerWidth < 1024) setHistoryOpen(false);
    loadChat(id);
  }

  // A lead on the Leads screen can hand a question straight to the chat via ?q=.
  useEffect(() => {
    if (handedOver.current) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      handedOver.current = true;
      window.history.replaceState(null, "", "/");
      send(q);
    }
  }, [send]);

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
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Couldn't generate a draft: ${err.message}`, error: true },
      ]);
    } finally {
      setDraftingFromChat(false);
    }
  }

  const lastAssistantIsText =
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    !messages[messages.length - 1].research &&
    !messages[messages.length - 1].error;

  function newChat() {
    if (loading) return;
    setMessages([]);
    setInput("");
    setChatId(null);
    setSaveError("");
    savedCount.current = 0;
    window.history.replaceState(null, "", "/");
  }

  const topBar = (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-1">
        <button
          onClick={toggleHistory}
          aria-pressed={historyOpen}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors focus-ring ${
            historyOpen ? "bg-gray-900 text-gray-50" : "text-gray-400 hover:bg-gray-900 hover:text-gray-50"
          }`}
        >
          <History size={14} /> History
        </button>
        {(messages.length > 0 || chatId) && (
          <button
            onClick={newChat}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-50 disabled:opacity-40 focus-ring"
          >
            <SquarePlus size={14} /> New chat
          </button>
        )}
        {saveError && (
          <span className="ml-2 text-xs text-amber-300" role="status">
            Couldn't save this chat. It will retry after your next message.
          </span>
        )}
      </div>
      {messages.length > 0 && !loadingChat && (
        <button
          onClick={draftFromChat}
          disabled={draftingFromChat}
          className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-on-gold font-semibold transition-colors focus-ring"
        >
          {draftingFromChat ? <Loader2 size={12} className="animate-spin" /> : <PenSquare size={12} />}
          Draft this
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-black">
      <ChatHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={chatId}
        busy={loading}
        version={historyVersion}
        onSelect={selectChat}
        onNew={() => {
          if (window.innerWidth < 1024) setHistoryOpen(false);
          newChat();
        }}
        onDeleted={(id) => {
          if (id === chatId) newChat();
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
      {topBar}
      {!started ? (
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-16">
          {/* Soft radial glow behind the mark — the one bit of visual flourish */}
          <div
            className="absolute w-[520px] h-[520px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, #eab308 0%, transparent 70%)" }}
          />

          <div className="relative w-[220px] h-[106px] mb-12">
            <Image src="/bas-logo-full.png" alt="Bitcoin Africa Story" fill className="logo-on-dark object-contain" priority />
            <Image src="/bas-logo-full-light.png" alt="Bitcoin Africa Story" fill className="logo-on-light object-contain" priority />
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

          <div className="flex items-center gap-2.5 mt-5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => send(chip.prompt)}
                className="text-sm px-4 py-2 rounded-full bg-gray-900/70 border border-gray-800 hover:border-bas-gold/40 hover:text-gold-fg text-gray-300 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-600 mt-12">
            Est. 2024 · <span className="text-gold-fg/90">Reporting from the ground</span>
          </p>
        </div>

      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 max-w-3xl w-full mx-auto flex flex-col gap-6">
            {loadingChat && (
              <div className="flex items-center gap-2 text-gray-500 text-sm" aria-busy="true">
                <Loader2 size={14} className="animate-spin" /> Opening chat…
              </div>
            )}
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
              ) : m.error ? (
                <ErrorNote key={i} message={m.content} />
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
  setDeepSearch: Dispatch<SetStateAction<boolean>>;
  provider: ChatProvider;
  setProvider: (v: ChatProvider) => void;
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
      className={`relative flex items-center gap-2 bg-gray-900/70 border border-gray-800 rounded-full pl-4 pr-2 py-2 shadow-lg shadow-black/40 focus-within:border-bas-gold/40 focus-within:shadow-bas-gold/5 transition-all ${
        empty ? "w-full max-w-xl" : "w-full"
      }`}
    >
      <Plus size={18} className="text-gray-400 shrink-0" />
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything Bitcoin in Africa"
        aria-label="Ask anything Bitcoin in Africa"
        autoFocus={empty}
        className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none min-w-0"
      />
      <button
        type="button"
        onClick={() => setProvider(provider === "claude" ? "grok" : "claude")}
        title="Switch between Claude and Grok"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0 bg-gray-700/60 text-gray-300 hover:text-gray-100 transition-colors focus-ring"
      >
        {provider === "claude" ? "Claude" : "Grok"}
      </button>
      {provider === "claude" ? (
        <button
          type="button"
          onClick={() => setDeepSearch((d: boolean) => !d)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full shrink-0 transition-colors ${
            deepSearch ? "bg-bas-gold text-on-gold font-medium" : "bg-gray-700/60 text-gray-300 hover:text-gray-100"
          }`}
        >
          <Search size={13} /> Deep Search
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
      <button
        type="submit"
        disabled={loading || !input.trim()}
        aria-label="Send"
        className="shrink-0 bg-bas-gold hover:bg-bas-gold-hover disabled:bg-gray-800 disabled:text-gray-600 text-on-gold rounded-full p-2 transition-colors focus-ring"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
      </button>
      {!speechSupported && (
        <span className="text-[10px] text-gray-600 absolute -bottom-5">Dictation needs Chrome</span>
      )}
    </form>
  );
}

// Errors get their own treatment instead of reading like an AI answer. Missing-key errors
// get a direct link to Settings, since that's the one thing the editor can do about them.
function ErrorNote({ message }: { message: string }) {
  const keyIssue = /api key|settings/i.test(message);
  return (
    <div className="max-w-[85%] self-start flex gap-3 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3">
      <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
      <div className="text-sm text-gray-300 leading-relaxed">
        <p>{message}</p>
        {keyIssue && (
          <Link
            href="/settings"
            className="inline-block mt-2 text-xs font-semibold text-gold-fg hover:text-gold-fg-hover"
          >
            Open Settings →
          </Link>
        )}
      </div>
    </div>
  );
}
