"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/slugify";
import type { Draft } from "@/types";
import {
  Loader2,
  Send,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Users,
  Link2,
  AlertTriangle,
} from "lucide-react";
import DictationButton from "@/components/editor/DictationButton";

const StoryEditor = dynamic(() => import("@/components/editor/StoryEditor"), { ssr: false });
const ImageUploader = dynamic(() => import("@/components/editor/ImageUploader"), { ssr: false });

const PENDING_KEY = "bas-studio-pending-draft";

export default function EditSendPage() {
  const [form, setForm] = useState<Draft | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [selection, setSelection] = useState<{ index: number; length: number } | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [improving, setImproving] = useState(false);

  const editorRef = useRef<any>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PENDING_KEY);
      if (saved) {
        const parsed: Draft = JSON.parse(saved);
        setForm(parsed);
        setImagePreview(parsed.image || "");
      }
    } catch {
      // ignore malformed localStorage content
    }
  }, []);

  function update(patch: Partial<Draft>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
  }

  function handleTitleChange(title: string) {
    update({ title, slug: slugify(title) });
  }

  async function handleImageChange(fileOrUrl: File | string, previewUrl: string) {
    setImagePreview(previewUrl);
    if (fileOrUrl instanceof File) {
      setUploadingImage(true);
      setError("");
      try {
        const formData = new FormData();
        formData.append("file", fileOrUrl);
        const res = await fetch("/api/draft/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        update({ image: data.url });
      } catch (err: any) {
        setError(`Cover image upload failed: ${err.message}`);
      } finally {
        setUploadingImage(false);
      }
    } else {
      update({ image: fileOrUrl });
    }
  }

  function handleSelectionChange(range: { index: number; length: number } | null) {
    if (!range || range.length === 0) {
      setSelection(null);
      setBubblePos(null);
      return;
    }
    const quill = editorRef.current?.getQuill?.();
    if (!quill) return;
    const bounds = quill.getBounds(range.index, range.length);
    setSelection(range);
    setBubblePos({ top: bounds.top - 44, left: Math.max(0, bounds.left) });
  }

  async function handleImprove() {
    if (!selection) return;
    const quill = editorRef.current?.getQuill?.();
    if (!quill) return;
    const selectedText = quill.getText(selection.index, selection.length);
    setImproving(true);
    setError("");
    try {
      const res = await fetch("/api/draft/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedText, context: quill.getText() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Improve failed");
      quill.deleteText(selection.index, selection.length);
      quill.insertText(selection.index, data.improved);
      update({ content: quill.root.innerHTML });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImproving(false);
      setSelection(null);
      setBubblePos(null);
    }
  }

  function handleDictation(text: string) {
    const quill = editorRef.current?.getQuill?.();
    if (!quill) return;
    const index = quill.getSelection()?.index ?? quill.getLength();
    quill.insertText(index, (index > 0 ? " " : "") + text + " ");
    update({ content: quill.root.innerHTML });
  }

  async function sendToFirebase() {
    if (!form) return;
    if (!form.title || !form.excerpt || !form.category || !form.content) {
      setError("Title, excerpt, category, and body are all required before sending.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/draft/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");
      setSentId(data.id);
      localStorage.removeItem(PENDING_KEY);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!form) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-sm text-gray-500">
        No draft is open. Generate one from{" "}
        <a href="/draft" className="text-bas-gold hover:underline">
          New Draft
        </a>{" "}
        first.
      </div>
    );
  }

  if (sentId) {
    return (
      <div className="max-w-md mx-auto p-6 mt-16 text-center flex flex-col items-center gap-3">
        <CheckCircle2 size={32} className="text-bas-gold" />
        <h1 className="text-lg font-semibold text-gray-50">Sent to your dashboard</h1>
        <p className="text-sm text-gray-500">
          Saved as a draft in your `news` collection. Publish it from your existing dashboard when
          you're ready.
        </p>
        <a href="/draft" className="text-sm text-bas-gold hover:underline mt-2">
          Start another draft
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main column */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <input
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Headline"
          className="w-full bg-transparent border-b border-gray-800 pb-3 text-2xl font-semibold text-gray-50 placeholder-gray-700 focus:outline-none focus:border-bas-gold"
        />

        <textarea
          value={form.excerpt}
          onChange={(e) => update({ excerpt: e.target.value })}
          placeholder="Excerpt — 1-2 sentence teaser shown in article lists"
          rows={2}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold resize-none"
        />

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Highlight any text to improve it in place.</p>
          <DictationButton onTranscript={handleDictation} />
        </div>

        <div ref={editorWrapperRef} className="relative">
          {bubblePos && selection && (
            <div
              className="absolute z-20"
              style={{ top: bubblePos.top, left: bubblePos.left }}
            >
              <button
                onClick={handleImprove}
                disabled={improving}
                className="flex items-center gap-1.5 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-60 text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-colors"
              >
                {improving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Improve
              </button>
            </div>
          )}
          <StoryEditor
            ref={editorRef}
            value={form.content}
            onChange={(content: string) => update({ content })}
            onSelectionChange={handleSelectionChange}
            dark
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" /> {error}
          </p>
        )}

        <button
          onClick={sendToFirebase}
          disabled={sending}
          className="flex items-center gap-2 justify-center bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-50 text-black font-semibold rounded-lg py-3 transition-colors"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send to dashboard (as draft)
        </button>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <ImageUploader
            value={form.image}
            preview={imagePreview}
            onChange={handleImageChange}
            label="Cover image"
          />
          {uploadingImage && (
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Uploading…
            </p>
          )}
          <input
            value={form.imageAlt}
            onChange={(e) => update({ imageAlt: e.target.value })}
            placeholder="Image alt text"
            className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-200">Article details</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-bas-gold"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update({ date: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-bas-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Read time</label>
              <input
                value={form.readTime}
                onChange={(e) => update({ readTime: e.target.value })}
                placeholder="4 min read"
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">YouTube URL (optional)</label>
            <input
              value={form.youtubeUrl}
              onChange={(e) => update({ youtubeUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=…"
              className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
            />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-200">SEO</h3>
          <input
            value={form.seoTitle}
            onChange={(e) => update({ seoTitle: e.target.value })}
            placeholder="SEO title"
            className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
          <textarea
            value={form.metaDescription}
            onChange={(e) => update({ metaDescription: e.target.value })}
            placeholder="Meta description"
            rows={2}
            className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold resize-none"
          />
          <input
            value={form.focusKeywords}
            onChange={(e) => update({ focusKeywords: e.target.value })}
            placeholder="Focus keywords, comma separated"
            className="bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-bas-gold"
          />
        </div>

        {form.suggestedEntities?.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Users size={14} /> Suggested directory links
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {form.suggestedEntities.map((e, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300"
                >
                  {e}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600">
              Link these from your dashboard's directory-linking step after sending.
            </p>
          </div>
        )}

        {form.suggestedInternalLinks?.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Link2 size={14} /> Suggested internal links
            </h3>
            <ul className="flex flex-col gap-1">
              {form.suggestedInternalLinks.map((l, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                  <ExternalLink size={10} className="shrink-0" /> {l.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {form.claimsToVerify?.length > 0 && (
          <div className="bg-black/40 border border-bas-gold/20 rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-bas-gold flex items-center gap-1.5">
              <AlertTriangle size={14} /> Claims to verify
            </h3>
            <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
              {form.claimsToVerify.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
