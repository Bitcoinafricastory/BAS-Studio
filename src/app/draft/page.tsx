"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Page, PageHeader, ErrorBanner } from "@/components/ui/Page";
import { FileText, Youtube, Mic, Loader2, Sparkles, Upload } from "lucide-react";
import type { Draft } from "@/types";

type Mode = "notes" | "youtube" | "audio";

export default function NewDraftPage() {
  const [mode, setMode] = useState<Mode>("notes");

  const [notes, setNotes] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeMethod, setTranscribeMethod] = useState<"captions" | "whisper" | null>(null);

  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  const sourceMaterial = mode === "notes" ? notes : transcript;

  // "Draft from this" on a lead arrives with the lead's details as ?notes=.
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("notes");
    if (n) {
      setNotes(n);
      window.history.replaceState(null, "", "/draft");
    }
  }, []);

  async function fetchYoutubeTranscript() {
    if (!youtubeUrl.trim()) return;
    setTranscribing(true);
    setError("");
    setTranscript("");
    setTranscribeMethod(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text);
      setTranscribeMethod(data.method);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function transcribeAudioFile() {
    if (!audioFile) return;
    setTranscribing(true);
    setError("");
    setTranscript("");
    setTranscribeMethod(null);
    try {
      const formData = new FormData();
      formData.append("file", audioFile);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setTranscript(data.text);
      setTranscribeMethod(data.method);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function generate() {
    if (!sourceMaterial.trim()) return;
    setGenerating(true);
    setError("");
    setDraft(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMaterial: sourceMaterial.trim(),
          kind: mode,
          sourceUrl: mode === "youtube" ? youtubeUrl.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draft generation failed");
      setDraft(data);
      // Hand off to Edit & Send once that screen exists — stored locally for now.
      localStorage.setItem("bas-studio-pending-draft", JSON.stringify(data));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Page width="max-w-2xl">
      <PageHeader
        title="New Draft"
        description="Turn notes, a YouTube video or a recording into a draft in the BAS voice. You review it before anything is saved to the dashboard."
      />

      <div className="mb-5 flex w-fit items-center gap-1 rounded-full border border-gray-800 bg-gray-900/50 p-1">
        <ModeTab icon={FileText} label="Notes" active={mode === "notes"} onClick={() => setMode("notes")} />
        <ModeTab icon={Youtube} label="YouTube" active={mode === "youtube"} onClick={() => setMode("youtube")} />
        <ModeTab icon={Mic} label="Audio/Video" active={mode === "audio"} onClick={() => setMode("audio")} />
      </div>

      {mode === "notes" && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type your notes — facts, quotes, context. The draft will be built only from what you write here."
          rows={10}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
          }}
          className="input resize-y rounded-2xl px-4 py-3 leading-relaxed"
        />
      )}
      {mode === "notes" && (
        <p className="mt-2 text-xs text-gray-600">
          {notes.trim() ? `${notes.trim().split(/\s+/).length} words · ` : ""}Press ⌘/Ctrl + Enter to generate
        </p>
      )}

      {mode === "youtube" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="input flex-1"
            />
            <button
              onClick={fetchYoutubeTranscript}
              disabled={transcribing || !youtubeUrl.trim()}
              className="btn-primary shrink-0"
            >
              {transcribing ? <Loader2 size={15} className="animate-spin" /> : "Fetch transcript"}
            </button>
          </div>
          {transcribing && (
            <p className="text-sm text-gray-500">
              Checking for captions first — falls back to a local audio transcription if there aren't
              any. This can take a few minutes for the fallback.
            </p>
          )}
          {transcript && (
            <>
              <p className="text-xs text-gray-500">
                Transcript pulled via {transcribeMethod === "captions" ? "YouTube captions" : "local Whisper"} — edit
                if needed:
              </p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className="input resize-y rounded-2xl px-4 py-3 leading-relaxed"
              />
            </>
          )}
        </div>
      )}

      {mode === "audio" && (
        <div className="flex flex-col gap-3">
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-bas-gold/50 hover:text-gray-200 focus-ring"
            >
              <Upload size={15} />
              {audioFile ? audioFile.name : "Choose an audio or video file"}
            </button>
            <button
              onClick={transcribeAudioFile}
              disabled={transcribing || !audioFile}
              className="btn-primary shrink-0"
            >
              {transcribing ? <Loader2 size={15} className="animate-spin" /> : "Transcribe"}
            </button>
          </div>
          {transcribing && (
            <p className="text-sm text-gray-500">
              Transcribing locally with Whisper — this runs on your machine and can take a few minutes
              depending on length.
            </p>
          )}
          {transcript && (
            <>
              <p className="text-xs text-gray-500">Transcript — edit if needed:</p>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={10}
                className="input resize-y rounded-2xl px-4 py-3 leading-relaxed"
              />
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <button
        onClick={generate}
        disabled={generating || !sourceMaterial.trim()}
        className="btn-primary mt-5 w-full py-3"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {generating ? "Writing your draft…" : "Generate draft in my voice"}
      </button>

      {draft && (
        <div className="card page-enter mt-6 flex flex-col gap-3 p-5">
          <h2 className="font-semibold text-gray-50 text-lg">{draft.title}</h2>
          <p className="text-sm text-gray-400">{draft.excerpt}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700">
              {draft.category}
            </span>
            <span>{draft.readTime}</span>
          </div>
          {draft.claimsToVerify?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-bas-gold mb-1">Claims to verify</p>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-0.5">
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
}

function ModeTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring ${
        active ? "bg-bas-gold text-black" : "text-gray-400 hover:text-gray-100"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
