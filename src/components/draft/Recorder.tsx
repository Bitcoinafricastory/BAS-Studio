"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Loader2, Pause, Play, Square, FolderOpen } from "lucide-react";

interface Saved {
  id: string;
  title: string;
  createdAt: string;
  hasTranscript: boolean;
}

const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
};

export default function Recorder({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [withTab, setWithTab] = useState(false);
  const [phase, setPhase] = useState<"idle" | "recording" | "paused" | "recorded" | "transcribing">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [folder, setFolder] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streams = useRef<MediaStream[]>([]);
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      if (res.ok) setSaved(data.meetings);
    } catch {}
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const releaseDevices = useCallback(() => {
    streams.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streams.current = [];
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  // Never leave the microphone running if the person navigates away mid-recording.
  useEffect(() => () => releaseDevices(), [releaseDevices]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function start() {
    onError("");
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      streams.current = [mic];
      let recordStream: MediaStream = mic;

      if (withTab) {
        // Chrome/Edge only: the person picks the meeting tab and ticks "Also share tab audio".
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streams.current.push(display);
        if (display.getAudioTracks().length === 0) {
          throw new Error("No audio came from the shared tab. Share again and tick “Also share tab audio”.");
        }
        const ac = new AudioContext();
        ctx.current = ac;
        const dest = ac.createMediaStreamDestination();
        ac.createMediaStreamSource(mic).connect(dest);
        ac.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(dest);
        recordStream = dest.stream;
        // If the meeting tab is closed or sharing stopped, finish the recording cleanly.
        display.getVideoTracks()[0]?.addEventListener("ended", () => stop());
      }

      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(recordStream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setPhase("recorded");
        releaseDevices();
      };
      rec.start(10_000); // a chunk every 10s, so a crash loses little
      recorder.current = rec;
      setSeconds(0);
      setBlob(null);
      setFolder("");
      setPhase("recording");
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      releaseDevices();
      const denied = err?.name === "NotAllowedError";
      onError(
        denied
          ? "Recording was blocked. Allow microphone access (and tab sharing if you chose it) in your browser, then try again."
          : err?.message || "Couldn’t start recording.",
      );
      setPhase("idle");
    }
  }

  function pauseResume() {
    const rec = recorder.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      if (timer.current) clearInterval(timer.current);
      setPhase("paused");
    } else if (rec.state === "paused") {
      rec.resume();
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    }
  }

  function stop() {
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function transcribe() {
    if (!blob) return;
    setPhase("transcribing");
    onError("");
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? ".m4a" : ".webm";
      form.append("file", blob, `meeting${ext}`);
      form.append("title", title.trim());
      const res = await fetch("/api/meetings", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setFolder(data.folder || "");
      onTranscript(data.text);
      loadSaved();
      setPhase("recorded");
    } catch (err: any) {
      onError(err.message);
      setPhase("recorded");
    }
  }

  async function openSaved(id: string) {
    onError("");
    try {
      const res = await fetch(`/api/meetings?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn’t open that meeting");
      onTranscript(data.text);
    } catch (err: any) {
      onError(err.message);
    }
  }

  const [busyId, setBusyId] = useState("");
  async function transcribeSaved(id: string) {
    setBusyId(id);
    onError("");
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      onTranscript(data.text);
      loadSaved();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusyId("");
    }
  }

  function discard() {
    setBlob(null);
    setPreviewUrl("");
    setSeconds(0);
    setFolder("");
    setPhase("idle");
  }

  const live = phase === "recording" || phase === "paused";

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-4 p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={live || phase === "transcribing"}
          placeholder="Meeting title (optional), e.g. Blink sync"
          className="input"
          maxLength={80}
        />

        {(phase === "idle" || phase === "recorded") && (
          <label className="flex items-start gap-2.5 text-sm text-gray-400">
            <input type="checkbox" checked={withTab} onChange={(e) => setWithTab(e.target.checked)} className="mt-1 accent-yellow-500" />
            <span>
              Also capture the meeting tab’s audio (Zoom, Meet or Teams in the browser).
              <span className="block text-xs text-gray-600">Chrome or Edge on a computer. You’ll pick the tab and tick “Also share tab audio”. Your mic is mixed in.</span>
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {phase === "idle" || phase === "recorded" ? (
            <button type="button" onClick={start} className="btn-primary">
              <Circle size={14} className="fill-current" /> {phase === "recorded" ? "Record again" : "Start recording"}
            </button>
          ) : null}

          {live && (
            <>
              <button type="button" onClick={stop} className="btn-primary">
                <Square size={14} className="fill-current" /> Stop
              </button>
              <button type="button" onClick={pauseResume} className="btn-secondary">
                {phase === "paused" ? <Play size={14} /> : <Pause size={14} />} {phase === "paused" ? "Resume" : "Pause"}
              </button>
            </>
          )}

          {(live || blob) && (
            <span className="flex items-center gap-2 font-mono text-sm tabular-nums text-gray-300" aria-live="off">
              {phase === "recording" && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden />}
              {phase === "paused" && <span className="text-xs text-gray-500">Paused</span>}
              {fmtTime(seconds)}
            </span>
          )}
        </div>

        {blob && phase !== "recording" && phase !== "paused" && (
          <div className="flex flex-col gap-3 border-t border-gray-800 pt-4">
            {previewUrl && <audio src={previewUrl} controls className="w-full" />}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={transcribe} disabled={phase === "transcribing"} className="btn-primary">
                {phase === "transcribing" ? <Loader2 size={15} className="animate-spin" /> : null}
                {phase === "transcribing" ? "Transcribing…" : "Save and transcribe"}
              </button>
              <button type="button" onClick={discard} disabled={phase === "transcribing"} className="btn-ghost">
                Discard
              </button>
            </div>
            {phase === "transcribing" && (
              <p className="text-sm text-gray-500">
                Whisper is running on this computer. Nothing leaves it. Long meetings can take a few minutes.
              </p>
            )}
            {folder && (
              <p className="flex items-center gap-1.5 break-all text-xs text-gray-500">
                <FolderOpen size={13} className="shrink-0" /> Saved in {folder}
              </p>
            )}
          </div>
        )}
      </div>

      {saved.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-100">Saved meetings</h3>
          <ul className="flex flex-col divide-y divide-gray-800">
            {saved.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-200">{m.title}</span>
                  <span className="block text-xs text-gray-600">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</span>
                </span>
                {m.hasTranscript ? (
                  <button type="button" onClick={() => openSaved(m.id)} className="btn-ghost shrink-0">
                    Open transcript
                  </button>
                ) : (
                  <button type="button" disabled={busyId === m.id} onClick={() => transcribeSaved(m.id)} className="btn-secondary shrink-0">
                    {busyId === m.id ? <Loader2 size={13} className="animate-spin" /> : null}
                    {busyId === m.id ? "Transcribing…" : "Transcribe"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
