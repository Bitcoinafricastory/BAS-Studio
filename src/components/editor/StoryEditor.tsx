'use client';

// Converted to .tsx from the original StoryEditor.jsx so TypeScript can see real prop
// types through the forwardRef call (an untyped forwardRef in a plain .jsx file infers
// as {} and breaks type-checking on every prop passed to it — this is what fixes that).
// No behavior, styling, or logic changed from the .jsx version.

// NOTE: This is BAS Studio's copy of the site's StoryEditor.jsx (kept in sync manually).
// The only functional change from the original: it forwards a ref exposing the underlying
// Quill instance, and an onSelectionChange callback. Both are additive — visuals, toolbar,
// fonts, and formats are byte-for-byte the same as the site version. This is what powers
// the highlight-to-improve bubble and dictation on this screen.

import { forwardRef, useImperativeHandle, useRef } from 'react';
import ReactQuillBase, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// next/dynamic does not pass refs through, so a dynamic ReactQuill would leave the ref empty and
// getQuill() would return null (which silently broke Improve and dictation). This file is only
// ever loaded in the browser (the Edit page imports it with ssr: false), so a plain import is safe.
const ReactQuill = ReactQuillBase as any;

const fontSizeArr = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px'];

// Named fonts writers can pick from the toolbar dropdown.
// Slugs must be lowercase, no spaces (Quill's Parchment requirement).
// `family` uses next/font CSS variables where possible so browsers use the
// fonts we've actually loaded rather than a random system fallback.
const FONT_CHOICES = [
  { value: 'montserrat', label: 'Montserrat', family: 'var(--font-montserrat), system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins', family: 'var(--font-poppins), system-ui, sans-serif' },
  { value: 'inter', label: 'Inter', family: 'var(--font-inter), system-ui, sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
  { value: 'merriweather', label: 'Merriweather', family: 'var(--font-merriweather), Georgia, serif' },
  { value: 'courier', label: 'Courier', family: '"Courier New", Courier, monospace' },
];

const FONT_WHITELIST = FONT_CHOICES.map((f) => f.value);

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: FONT_WHITELIST }],
    [{ size: fontSizeArr }],
    [{ align: [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    ['blockquote', 'code-block'],
    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
    ['link', 'image', 'video'],
    ['clean'],
  ],
};

const formats = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'script',
  'blockquote', 'code-block',
  'list', 'indent',
  'align',
  'link', 'image', 'video',
];

// CSS that must apply BOTH inside the Quill editor AND on the public article
// page (since Quill emits e.g. <span class="ql-font-poppins"> into stored HTML).
// Loaded once on client mount below AND injected into globals for public reads.
const fontCss = FONT_CHOICES
  .map((f) => `
    .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${f.value}"]::before,
    .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${f.value}"]::before {
      content: "${f.label}";
      font-family: ${f.family};
    }
    .ql-font-${f.value} { font-family: ${f.family}; }
  `)
  .join('\n');

// Light-mode baseline — without this, the page's own (often white, on a
// dark-themed site) text color inherits straight into Quill's white canvas,
// making typed text invisible. Always applied; darkStyles below layers on
// top of this when dark=true.
const lightStyles = `
.bas-quill-light .ql-editor {
  color: #1f2937;
}
.bas-quill-light .ql-editor.ql-blank::before {
  color: #9ca3af;
  font-style: normal;
}
`;

// Dark-theme overrides for use inside the dashboard (Quill's default "snow"
// theme is light). Scoped to .bas-quill-dark so the public light editor is
// unaffected.
const darkStyles = `
.bas-quill-dark .ql-toolbar {
  background: var(--q-toolbar-bg);
  border-color: var(--q-border);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}
.bas-quill-dark .ql-container {
  background: var(--q-canvas);
  border-color: var(--q-border);
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  color: var(--q-text);
  font-size: 16px;
  min-height: 320px;
}
.bas-quill-dark .ql-editor {
  min-height: 320px;
}
.bas-quill-dark .ql-editor.ql-blank::before {
  color: var(--q-placeholder);
  font-style: normal;
}
.bas-quill-dark .ql-editor a { color: var(--q-accent); }
.bas-quill-dark .ql-editor blockquote {
  border-left-color: var(--q-accent);
  color: var(--q-quote);
}
/* Toolbar icons */
.bas-quill-dark .ql-toolbar .ql-stroke { stroke: var(--q-muted); }
.bas-quill-dark .ql-toolbar .ql-fill { fill: var(--q-muted); }
.bas-quill-dark .ql-toolbar .ql-picker { color: var(--q-muted); }
.bas-quill-dark .ql-toolbar button:hover .ql-stroke,
.bas-quill-dark .ql-toolbar button.ql-active .ql-stroke { stroke: var(--q-accent); }
.bas-quill-dark .ql-toolbar button:hover .ql-fill,
.bas-quill-dark .ql-toolbar button.ql-active .ql-fill { fill: var(--q-accent); }
.bas-quill-dark .ql-toolbar .ql-picker-label:hover,
.bas-quill-dark .ql-toolbar .ql-picker-item:hover,
.bas-quill-dark .ql-toolbar .ql-picker-label.ql-active { color: var(--q-accent); }
/* Dropdown menus */
.bas-quill-dark .ql-picker-options {
  background: var(--q-popup);
  border-color: var(--q-border);
  color: var(--q-text);
}
.bas-quill-dark .ql-toolbar .ql-picker-label { border-color: transparent; }
`;

// Register the named fonts with Quill's Parchment, once per page load.
try {
  const Font = Quill.import('attributors/class/font') as any;
  Font.whitelist = FONT_WHITELIST;
  Quill.register(Font, true);
} catch {
  // Registration is safe to skip on hot reload.
}

export interface StoryEditorHandle {
  getQuill: () => any;
}

export interface StoryEditorProps {
  value: string;
  onChange: (content: string) => void;
  dark?: boolean;
  onSelectionChange?: (range: { index: number; length: number } | null) => void;
}

const StoryEditor = forwardRef<StoryEditorHandle, StoryEditorProps>(function StoryEditor(
  { value, onChange, dark = false, onSelectionChange },
  ref
) {
  const quillRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    getQuill: () => quillRef.current?.getEditor?.() || null,
  }));

  return (
    <div className={dark ? 'bas-quill-dark' : 'bas-quill-light'}>
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />
      <style dangerouslySetInnerHTML={{ __html: lightStyles }} />
      {dark && <style dangerouslySetInnerHTML={{ __html: darkStyles }} />}
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        onChangeSelection={(range: { index: number; length: number } | null) => onSelectionChange?.(range)}
        modules={modules}
        formats={formats}
      />
    </div>
  );
});

export default StoryEditor;
