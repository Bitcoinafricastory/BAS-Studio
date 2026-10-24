"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Page, PageHeader, ErrorBanner } from "@/components/ui/Page";
import { FileText, Youtube, Mic, Radio, CircleDot, Loader2, Sparkles, Upload, Copy, Check, X } from "lucide-react";
import Recorder from "@/components/draft/Recorder";
import type { Draft } from "@/types";

type Mode = "notes" | "youtube" | "xspace" | "record" | "audio";

const MODES: { id: Mode; label: string; icon: typeof FileText }[] = [
  { id: "notes", label: "Notes", icon: FileText },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "xspace", label: "X Space", icon: Radio },
  { id: "record", label: "Record", icon: CircleDot },
  { id: "audio", label: "Audio/Video", icon: Mic },
];

// What the draft generator is told the material is.
const KIND: Record<Mode, "notes" | "youtube" | "xspace" | "audio"> = {
  notes: "notes",
  youtube: "youtube",
  xspace: "xspace",
  record: "audio",
  audio: "audio",
};

const EMPTY: Record<Mode, string> = { notes: "", youtube: "", xspace: "", record: "", audio: "" };
const METHOD_LABEL: Record<string, string> = {
  captions: "YouTube captions",
  whisper: "Whisper, on this computer",
};

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export default function NewDraftPage() {
  const [mode, setMode] = useState<Mode>("notes");

  // Every tab keeps its own text, so a transcript from one source never shows up in another.
  const [texts, setTexts] = useState<Record<Mode, string>>(EMPTY);
  const [methods, setMethods] = useState<Partial<Record<Mode, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<Mode, string>>>({});
  const [busy, setBusy] = useState<Mode | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [spaceUrl, setSpaceUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const setText = (m: Mode, v: string) => setTexts((t) => ({ ...t, [m]: v }));
  const setError = (m: Mode, v: string) => setErrors((e) => ({ ...e, [m]: v }));

  const text = texts[mode];
  const error = errors[mode] || "";
  const sourceUrl = mode === "youtube" ? youtubeUrl.trim() : mode === "xspace" ? spaceUrl.trim() : undefined;

  // "Draft from this" on a lead arrives with the lead's details as ?notes=.
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("notes");
    if (n) {
      setText("notes", n);
      window.history.replaceState(null, "", "/draft");
    }
  }, []);

  async function transcribe(m: Mode, request: () => Promise<Response>) {
    setBusy(m);
    setError(m, "");
    try {
      const res = await request();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setText(m, data.text);
      setMethods((x) => ({ ...x, [m]: data.method }));
    } catch (err: any) {
      setError(m, err.message);
    } finally {
      setBusy(null);
    }
  }

  const postJson = (body: object) =>
    fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const fetchYoutube = () => transcribe("youtube", () => postJson({ youtubeUrl: youtubeUrl.trim() }));
  const fetchSpace = () => transcribe("xspace", () => postJson({ xSpaceUrl: spaceUrl.trim() }));
  const transcribeFile = () => {
    const form = new FormData();
    form.append("file", audioFile as File);
    return transcribe("audio", () => fetch("/api/transcribe", { method: "POST", body: form }));
  };

  async function generate() {
    if (!text.trim()) return;
    setGenerating(true);
    setError(mode, "");
    setDraft(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceMaterial: text.trim(), kind: KIND[mode], sourceUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft generation failed");
      setDraft(data);
      // Hand off to Edit & Send once that screen exists — stored locally for now.
      localStorage.setItem("bas-studio-pending-draft", JSON.stringify(data));
    } catch (err: any) {
      setError(mode, err.message);
    } finally {
      setGenerating(false);
    }
  }

  const working = busy === mode;

  return (
    <Page width="max-w-2xl">
      <PageHeader
        title="New Draft"
        description="Turn notes, a YouTube video, an X Space, a live recording or an uploaded file into a draft in the BAS voice. You review it before anything is saved to the dashboard."
      />

      {/* Source picker */}
      <div
        role="tablist"
        aria-label="Source"
        className="mb-6 flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-gray-800 bg-gray-900/50 p-1 sm:w-fit"
      >
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring ${
              mode === id ? "bg-bas-gold text-on-gold" : "text-gray-400 hover:text-gray-100"
            }`}
          >
            <Icon size={15} />
            {label}
            {busy === id && mode !== id && <Loader2 size={12} className="animate-spin" aria-label="Working" />}
          </button>
        ))}
      </div>

      {/* ---- Notes ---- */}
      {mode === "notes" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={texts.notes}
            onChange={(e) => setText("notes", e.target.value)}
            placeholder="Type your notes: facts, quotes, context. The draft will be built only from what you write here."
            rows={10}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
            }}
            className="input resize-y rounded-2xl px-4 py-3 leading-relaxed"
          />
          <p className="text-xs text-gray-600">
            {texts.notes.trim() ? `${wordCount(texts.notes)} words · ` : ""}Press ⌘/Ctrl + Enter to generate
          </p>
        </div>
      )}

      {/* ---- YouTube ---- */}
      {mode === "youtube" && (
        <div className="flex flex-col gap-4">
          <UrlRow
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            placeholder="https://youtube.com/watch?v=…"
            action="Fetch transcript"
            busyLabel="Fetching…"
            busy={working}
            disabled={busy !== null}
            onSubmit={fetchYoutube}
          />
          {working ? (
            <Progress>
              Checking for captions first. If there aren’t any, Studio falls back to downloading the audio and transcribing it with
              Whisper, which can take a few minutes.
            </Progress>
          ) : (
            !texts.youtube && <Hint>Most videos have captions, so this is usually quick.</Hint>
          )}
          <TranscriptBox value={texts.youtube} onChange={(v) => setText("youtube", v)} method={methods.youtube} onClear={() => clearSource("youtube")} />
        </div>
      )}

      {/* ---- X Space ---- */}
      {mode === "xspace" && (
        <div className="flex flex-col gap-4">
          <UrlRow
            value={spaceUrl}
            onChange={setSpaceUrl}
            placeholder="https://x.com/i/spaces/…"
            action="Transcribe Space"
            busyLabel="Transcribing…"
            busy={working}
            disabled={busy !== null}
            onSubmit={fetchSpace}
          />
          {working ? (
            <Progress>Downloading the replay and transcribing it with Whisper. Long Spaces can take several minutes.</Progress>
          ) : (
            !texts.xspace && (
              <Hint>
                Works for ended Spaces whose host left the replay on. If a Space has no replay, record it and use the Audio/Video tab.
              </Hint>
            )
          )}
          <TranscriptBox
            value={texts.xspace}
            onChange={(v) => setText("xspace", v)}
            method={methods.xspace}
            note="Whisper doesn’t label speakers. Fix names and quotes before drafting."
            onClear={() => clearSource("xspace")}
          />
        </div>
      )}

      {/* ---- Record ---- */}
      {mode === "record" && (
        <div className="flex flex-col gap-4">
          <Recorder
            onTranscript={(t) => {
              setText("record", t);
              setMethods((x) => ({ ...x, record: "whisper" }));
            }}
            onError={(m) => setError("record", m)}
          />
          <TranscriptBox
            value={texts.record}
            onChange={(v) => setText("record", v)}
            method={methods.record}
            note="Add speaker names before drafting."
            onClear={() => clearSource("record")}
          />
        </div>
      )}

      {/* ---- Audio / video file ---- */}
      {mode === "audio" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-bas-gold/50 hover:text-gray-200 focus-ring"
            >
              <Upload size={15} className="shrink-0" />
              <span className="truncate">{audioFile ? audioFile.name : "Choose an audio or video file"}</span>
            </button>
            <button onClick={transcribeFile} disabled={busy !== null || !audioFile} className="btn-primary shrink-0">
              {working && <Loader2 size={15} className="animate-spin" />}
              {working ? "Transcribing…" : "Transcribe"}
            </button>
          </div>
          {working ? (
            <Progress>Transcribing with Whisper on this computer. Long files can take a few minutes.</Progress>
          ) : (
            !texts.audio && <Hint>MP3, M4A, WAV, MP4 and most other formats work.</Hint>
          )}
          <TranscriptBox value={texts.audio} onChange={(v) => setText("audio", v)} method={methods.audio} onClear={() => clearSource("audio")} />
        </div>
      )}

      {error && (
        <div className="mt-5">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* ---- Generate ---- */}
      <div className="mt-6">
        <button onClick={generate} disabled={generating || !text.trim()} className="btn-primary w-full py-3">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? "Writing your draft…" : "Generate draft in my voice"}
        </button>
        {!text.trim() && !generating && (
          <p className="mt-2 text-center text-xs text-gray-600">
            {mode === "notes" ? "Add some notes to begin." : "Add a source above, then generate."}
          </p>
        )}
      </div>

      {draft && (
        <div className="card page-enter mt-6 flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-gray-50">{draft.title}</h2>
          <p className="text-sm text-gray-400">{draft.excerpt}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5">{draft.category}</span>
            <span>{draft.readTime}</span>
          </div>
          {draft.claimsToVerify?.length > 0 && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-gold-fg">Claims to verify</p>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-gray-300">
                {draft.claimsToVerify.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="border-t border-gray-800 pt-3 text-xs text-gray-500">Not sent to the dashboard yet. Review it in the editor first.</p>
          <Link href="/edit" className="btn-primary">
            Open in Editor
          </Link>
        </div>
      )}
    </Page>
  );

  function clearSource(m: Mode) {
    setText(m, "");
    setMethods((x) => ({ ...x, [m]: undefined }));
    setError(m, "");
  }
}

function UrlRow({
  value,
  onChange,
  placeholder,
  action,
  busyLabel,
  busy,
  disabled,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  action: string;
  busyLabel: string;
  busy: boolean;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !disabled) onSubmit();
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input min-w-0 flex-1"
      />
      <button type="submit" disabled={disabled || !value.trim()} className="btn-primary shrink-0">
        {busy && <Loader2 size={15} className="animate-spin" />}
        {busy ? busyLabel : action}
      </button>
    </form>
  );
}

function Progress({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3 text-sm text-gray-400" role="status">
      <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-gold-fg" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-gray-600">{children}</p>;
}

/** The one transcript editor every source uses, so they all look and behave the same. */
function TranscriptBox({
  value,
  onChange,
  method,
  note,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  method?: string;
  note?: string;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <section className="card flex flex-col gap-2.5 p-4" aria-label="Transcript">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-100">Transcript</h3>
          <p className="text-xs text-gray-500">
            {wordCount(value).toLocaleString()} words{method && METHOD_LABEL[method] ? ` · from ${METHOD_LABEL[method]}` : ""} · edit it freely
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={copy} className="btn-ghost">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={onClear} className="btn-ghost">
            <X size={13} /> Clear
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        aria-label="Transcript text"
        className="input resize-y rounded-xl px-4 py-3 leading-relaxed"
      />
      {note && <p className="text-xs text-gray-600">{note}</p>}
    </section>
  );
}
