"use client";

import { useState, useRef } from "react";
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
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-gray-50 mb-6">New Draft</h1>

      <div className="flex items-center gap-1 mb-5 bg-gray-900/50 border border-gray-800 rounded-lg p-1 w-fit">
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
          className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold resize-none"
        />
      )}

      {mode === "youtube" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
            />
            <button
              onClick={fetchYoutubeTranscript}
              disabled={transcribing || !youtubeUrl.trim()}
              className="flex items-center gap-2 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-medium text-sm rounded-lg px-4 transition-colors shrink-0"
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
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-bas-gold resize-none"
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
              className="flex-1 flex items-center gap-2 justify-center bg-gray-900/50 border border-dashed border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400 hover:border-bas-gold/50 hover:text-gray-200 transition-colors"
            >
              <Upload size={15} />
              {audioFile ? audioFile.name : "Choose an audio or video file"}
            </button>
            <button
              onClick={transcribeAudioFile}
              disabled={transcribing || !audioFile}
              className="flex items-center gap-2 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-medium text-sm rounded-lg px-4 transition-colors shrink-0"
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
                className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-bas-gold resize-none"
              />
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

      <button
        onClick={generate}
        disabled={generating || !sourceMaterial.trim()}
        className="mt-5 w-full flex items-center gap-2 justify-center bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-40 text-black font-semibold rounded-lg py-3 transition-colors"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        Generate draft in my voice
      </button>

      {draft && (
        <div className="mt-6 bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
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
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-800">Saved locally.</p>
          <a
            href="/edit"
            className="flex items-center justify-center gap-2 bg-bas-gold hover:bg-bas-gold-hover text-black font-semibold rounded-lg py-2.5 transition-colors"
          >
            Open in Editor
          </a>
        </div>
      )}
    </div>
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
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-bas-gold text-black" : "text-gray-400 hover:text-gray-100"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
