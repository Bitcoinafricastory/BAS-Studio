"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CATEGORIES } from "@/lib/constants";
import { slugify } from "@/lib/slugify";
import type { Draft } from "@/types";
import { Loader2, Send, Sparkles, CheckCircle2, ExternalLink, Users, Link2, AlertTriangle, FileEdit, ShieldCheck, X, Plus } from "lucide-react";
import { readTimeFor } from "@/lib/read-time";
import { lintDraft } from "@/lib/voice";
import Link from "next/link";
import { Page, EmptyState, ErrorBanner } from "@/components/ui/Page";
import DictationButton from "@/components/editor/DictationButton";

// next/dynamic drops refs, so the editor handle is passed as an ordinary prop (editorRef) and
// attached to the real editor inside this wrapper. Without this the handle was always empty and
// Improve and dictation did nothing.
const StoryEditor = dynamic(
  () =>
    import("@/components/editor/StoryEditor").then((mod) => {
      const Editor = mod.default;
      return function StoryEditorWithHandle({ editorRef, ...props }: any) {
        return <Editor ref={editorRef} {...props} />;
      };
    }),
  { ssr: false }
) as any;
const ImageUploader = dynamic(() => import("@/components/editor/ImageUploader"), { ssr: false });

const PENDING_KEY = "bas-studio-pending-draft";

interface AuthorOption {
  id: string;
  name: string;
  slug: string;
}

// The house byline. Used as the default when the draft has no author yet.
const DEFAULT_AUTHOR_SLUG = "destiny-smart";

export default function EditSendPage() {
  const [form, setForm] = useState<Draft | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [sentSlug, setSentSlug] = useState("");
  const [error, setError] = useState("");
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [claimsChecked, setClaimsChecked] = useState(false);

  const [selection, setSelection] = useState<{ index: number; length: number } | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [improving, setImproving] = useState(false);

  const editorRef = useRef<any>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  // Live BAS style check: the same rules New Draft and Distribute use, run as you edit.
  const deferredForm = useDeferredValue(form);
  const styleIssues = useMemo(
    () =>
      deferredForm
        ? lintDraft({
            title: deferredForm.title,
            content: deferredForm.content,
            excerpt: deferredForm.excerpt,
            seoTitle: deferredForm.seoTitle,
            metaDescription: deferredForm.metaDescription,
            focusKeywords: deferredForm.focusKeywords,
          })
        : [],
    [deferredForm]
  );

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

  // Byline picker: the site's authors list. A draft with no author gets the house byline.
  useEffect(() => {
    fetch("/api/authors")
      .then((r) => r.json())
      .then((d) => {
        const list: AuthorOption[] = Array.isArray(d.authors) ? d.authors : [];
        setAuthors(list);
        const house = list.find((a) => a.slug === DEFAULT_AUTHOR_SLUG);
        if (house) setForm((f) => (f && !f.authorId ? { ...f, authorId: house.id } : f));
      })
      .catch(() => setAuthors([]));
  }, []);

  function update(patch: Partial<Draft>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
  }

  const faqs = form?.faqs || [];
  const setFaq = (i: number, patch: Partial<{ question: string; answer: string }>) =>
    update({ faqs: faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });

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
    if (form.claimsToVerify?.length && !claimsChecked) {
      setError("Check the claims listed on the right, or cut them, then tick the box before sending.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Only the article itself goes to the site. Studio's notes (claims, style notes, source
      // material) stay here: the site's articles can be read by anyone.
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        category: form.category,
        image: form.image,
        imageAlt: form.imageAlt,
        authorId: form.authorId || "",
        date: form.date,
        youtubeUrl: form.youtubeUrl,
        seoTitle: form.seoTitle,
        metaDescription: form.metaDescription,
        focusKeywords: form.focusKeywords,
        tags: form.tags || [],
        keyTakeaways: form.keyTakeaways || [],
        faqs,
        linkedEntityIds: (form.linkedEntities || []).map((e) => e.slug),
      };
      const res = await fetch("/api/draft/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save draft");
      setSentId(data.id);
      setSentSlug(data.slug && data.slug !== form.slug ? data.slug : "");
      localStorage.removeItem(PENDING_KEY);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!form) {
    return (
      <Page width="max-w-xl">
        <EmptyState
          icon={FileEdit}
          title="No draft is open"
          body="Generate a draft from New Draft, or from a lead or a Home chat, and it will open here for review."
          action={
            <Link href="/draft" className="btn-primary">
              Start a draft
            </Link>
          }
        />
      </Page>
    );
  }

  if (sentId) {
    return (
      <Page width="max-w-md">
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bas-gold/10 text-gold-fg">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="text-xl font-semibold text-gray-50">Sent to your dashboard</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Saved as a draft. Publish it from your BAS dashboard when you're ready.
          </p>
          {sentSlug && (
            <p className="text-xs text-gray-500">
              Another article already used that URL, so this one was saved as <code>{sentSlug}</code>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Link href="/draft" className="btn-primary">
              Start another draft
            </Link>
            <Link href="/distribute" className="btn-secondary">
              Distribute a story
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <div className="page-enter mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:px-8 lg:grid-cols-3">
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
          className="input resize-none"
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
                className="flex items-center gap-1.5 bg-bas-gold hover:bg-bas-gold-hover disabled:opacity-60 text-on-gold text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg transition-colors"
              >
                {improving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Improve
              </button>
            </div>
          )}
          <StoryEditor
            editorRef={editorRef}
            value={form.content}
            onChange={(content: string) => update({ content })}
            onSelectionChange={handleSelectionChange}
            dark
          />
        </div>

        {error && (
          <ErrorBanner message={error} />
        )}

        <button
          onClick={sendToFirebase}
          disabled={sending || (!!form.claimsToVerify?.length && !claimsChecked)}
          className="btn-primary py-3"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Sending…" : "Send to dashboard (as draft)"}
        </button>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4">
        <div className="card p-4 flex flex-col gap-3">
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
            placeholder="Alt text: name the project and say what the image shows"
            className="input"
          />
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-200">Article details</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Author</label>
            <select value={form.authorId || ""} onChange={(e) => update({ authorId: e.target.value })} className="input">
              <option value="">No byline yet</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
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
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Read time</label>
              <p className="input text-gray-400">{readTimeFor(form.content)}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tags, comma separated</label>
            <input
              value={(form.tags || []).join(", ")}
              onChange={(e) => update({ tags: e.target.value.split(",").map((t) => t.trimStart()) })}
              onBlur={() => update({ tags: (form.tags || []).map((t) => t.trim()).filter(Boolean) })}
              placeholder="Names, places, topics"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">YouTube URL (optional)</label>
            <input
              value={form.youtubeUrl}
              onChange={(e) => update({ youtubeUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=…"
              className="input"
            />
          </div>
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-200">SEO</h3>
          <input
            value={form.seoTitle}
            onChange={(e) => update({ seoTitle: e.target.value })}
            placeholder="SEO title"
            className="input"
          />
          <textarea
            value={form.metaDescription}
            onChange={(e) => update({ metaDescription: e.target.value })}
            placeholder="Meta description"
            rows={2}
            className="input resize-none"
          />
          <input
            value={form.focusKeywords}
            onChange={(e) => update({ focusKeywords: e.target.value })}
            placeholder="Focus keywords, comma separated"
            className="input"
          />
        </div>

        <div className="card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-200">Key Takeaways and FAQ</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Key Takeaways, one per line</label>
            <textarea
              value={(form.keyTakeaways || []).join("\n")}
              onChange={(e) => update({ keyTakeaways: e.target.value.split("\n") })}
              onBlur={() => update({ keyTakeaways: (form.keyTakeaways || []).map((t) => t.trim()).filter(Boolean) })}
              rows={4}
              className="input resize-y"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500">FAQ (shown on the article when it has at least one entry)</p>
            {faqs.map((f, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-gray-800 p-2">
                <div className="flex items-start gap-1.5">
                  <input
                    value={f.question}
                    onChange={(e) => setFaq(i, { question: e.target.value })}
                    placeholder="Question"
                    className="input flex-1"
                  />
                  <button
                    onClick={() => update({ faqs: faqs.filter((_, idx) => idx !== i) })}
                    aria-label="Remove this question"
                    className="mt-2 text-gray-500 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
                <textarea
                  value={f.answer}
                  onChange={(e) => setFaq(i, { answer: e.target.value })}
                  placeholder="Answer, using only facts in the article"
                  rows={2}
                  className="input resize-y"
                />
              </div>
            ))}
            <button
              onClick={() => update({ faqs: [...faqs, { question: "", answer: "" }] })}
              className="flex items-center gap-1 self-start text-xs text-gray-400 hover:text-gold-fg"
            >
              <Plus size={12} /> Add a question
            </button>
          </div>
        </div>

        <div className="card p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
            <ShieldCheck size={14} /> BAS style check
          </h3>
          {styleIssues.length === 0 ? (
            <p className="text-xs text-gray-500">No style issues found.</p>
          ) : (
            <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
              {styleIssues.map((s, i) => (
                <li key={i} className={s.level === "error" ? "text-gold-fg" : undefined}>
                  {s.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        {(form.linkedEntities?.length ?? 0) > 0 && (
          <div className="card p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Users size={14} /> Linked directory profiles
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(form.linkedEntities || []).map((e) => (
                <span
                  key={e.slug}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300"
                >
                  {e.name}
                  <button
                    onClick={() => update({ linkedEntities: (form.linkedEntities || []).filter((x) => x.slug !== e.slug) })}
                    aria-label={`Unlink ${e.name}`}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600">These fill Related Coverage on each profile. Remove any that don’t belong.</p>
          </div>
        )}

        {form.suggestedEntities?.length > 0 && (
          <div className="card p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Users size={14} /> Named, but not in the directory
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
              No directory profile matched these names. Link or add them from the dashboard after sending.
            </p>
          </div>
        )}

        {form.suggestedInternalLinks?.length > 0 && (
          <div className="card p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-1.5">
              <Link2 size={14} /> Suggested internal links
            </h3>
            <ul className="flex flex-col gap-1">
              {form.suggestedInternalLinks.map((l, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-center gap-1">
                  <ExternalLink size={10} className="shrink-0" />
                  {l.url ? (
                    <a href={l.url} target="_blank" rel="noreferrer" className="hover:text-gold-fg">
                      {l.title}
                    </a>
                  ) : (
                    l.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {form.claimsToVerify?.length > 0 && (
          <div className="bg-black/40 border border-bas-gold/20 rounded-xl p-4 flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gold-fg flex items-center gap-1.5">
              <AlertTriangle size={14} /> Claims to verify
            </h3>
            <ul className="text-xs text-gray-300 list-disc list-inside space-y-1">
              {form.claimsToVerify.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <label className="mt-1 flex items-start gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={claimsChecked}
                onChange={(e) => setClaimsChecked(e.target.checked)}
                className="mt-0.5 accent-yellow-500"
              />
              I checked each of these against a source I opened, or cut it from the draft. These notes stay in Studio and
              are not sent to the site.
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
