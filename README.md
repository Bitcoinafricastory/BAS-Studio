# BAS Studio

Internal drafting tool for Bitcoin Africa Story. Separate app from the main site — own repo, own deploy, own secrets.

## Status

Built so far, real and working:
- Project scaffolding, passcode gate, Firebase (client + admin) wiring, Anthropic client
- **Home screen (`/`)**: replaces the old top nav + separate Assistant screen. AI-first search/chat interface matching your mockup — empty state with the logo, a pill search bar, and two quick-start chips; once you send a message it becomes a conversation thread. The "Deep Search" toggle maps directly onto the Research engine already built (explicit deep multi-query sweep vs. the auto-detecting quick chat/research heuristic). Dictation is wired into the search bar itself via the Web Speech API. `/assistant` now just redirects here.
- **Left icon rail**: collapsible sidebar (click the panel icon to expand/collapse) replacing the old top nav — Leads, New Draft, and Sources are one click away. Edit & Send isn't in the rail since you only reach it after generating a draft.
- **Manage Sources**: add/pause/remove RSS + Google News feeds, backed by a Firestore `sources` collection. Auto-seeds 7 starter sources on first load — Bitcoin Africa News, MoneyBadger, Bitcoin Magazine, and Google News topic feeds for Nigeria/Kenya/South Africa/Africa — which you can edit freely from the UI.
- **Leads screen**: polls all active sources in parallel (a dead feed doesn't take down the page), plus an AI "market radar" that uses Anthropic's web search tool to surface African Bitcoin news from the last 48 hours beyond your RSS list — clearly marked Unverified. Everything merges into one feed sorted by recency. "Draft from this" on a feed item passes its summary and link to New Draft. On an Unverified AI item it passes only a marked pointer (title and link, no AI summary); New Draft strips that block before the model sees anything and won't draft until you paste the original source.
- **New Draft screen**: three input modes — typed notes, YouTube URL, or an audio/video file. YouTube tries captions first (instant, via `youtube-transcript`) and only falls back to downloading + locally transcribing audio if a video has none. "Generate draft in my voice" pulls your last 5 published articles from Firestore as style samples and drafts strictly from the source material you provided — never inventing facts or rewriting other outlets. Output includes title, excerpt, SEO fields, category, read time, suggested entities/internal links, and a claims-to-verify list.
- **Edit & Send screen**: your real `StoryEditor` (Quill), copied directly from `BAS-Website-nextjs` — same fonts, toolbar, and formats, not rebuilt. Plus: cover image upload (drag/drop or URL), all metadata fields, a highlight-to-improve bubble (select text → AI tightens it in place), dictation via the browser's Web Speech API, an author picker from the site's `authors` list, tags, Key Takeaways, an FAQ editor, linked directory profiles, a read time computed from the word count, and a "Send to dashboard" button that writes a new `news` document with `status: "draft"`, ready to publish from your existing dashboard. Send writes only the dashboard's own fields, type-checked; Studio's claims list, style notes and source material never reach the public article. A slug already in use gets a number added. If the draft lists claims to verify, Send stays off until you tick that you checked them.

BAS Studio is functionally complete. Every screen does what it says — nothing here is a mock or placeholder.

### BAS voice: how every feature writes like us

All of BAS Studio's writing follows one shared style guide in `src/lib/voice/`, built from the edits made on real BAS articles, so the tool doesn't have to be taught our style again:

- `rules.ts`: the voice, the 12 slop patterns and banned words, the accuracy and privacy rules, article structure (hook, intro, read-through line, descriptive H2s, Sources, no tables, bold project names), heading rules, and title and SEO limits.
- `exemplars.ts`: approved ledes, headings and paragraphs from the CBAF, Susan Githaiga, Btrust and Mauritius articles, plus the editor's past corrections and the rule behind each. Add new approved material here and every prompt picks it up.
- `prompts.ts`: builds the system prompts for New Draft, Improve, the Home assistant, research and Grok from those rules.
- `lint.ts`: the BAS style check. It runs on generated drafts (with one automatic fix pass for slop, dashes, tables and contrast framing) and live in the Edit screen's "BAS style check" card.
- `archive.ts`: loads published BAS articles so drafts backlink real BAS stories. Any link a draft adds that isn't in your source material or the archive is removed and flagged under Claims to verify.

Distribute uses the same banned-word list and checks, so articles and posts stay consistent.

### Distribute: the BAS thread

Distribute drafts the thread exactly as BAS posts it on X. Each post is checked at 280 characters, unless `BAS_X_PREMIUM` in `src/lib/distribution/registry.ts` (for @btcafricastory) or the author's Premium box (for the requote) says otherwise.

- **Main post** from @btcafricastory: the story with every named account tagged, no link, ending "Full story in the comments 👇". Prices and deadline pressure are flagged.
- **Reply 1**: "Read more about it in our latest article, by @Destinysmart_ 👇" and the link, written by Studio with no model. Tick "Older piece" for "on Bitcoin Africa Story" instead.
- **Reply 2**: one action or cross-link, using only links found in the article. Reply 3 is optional.
- **Requote** from the author's account: first person, generated after the main post and rejected if it repeats the main post, ending "Full story on @btcafricastory 👇".
- LinkedIn posts, the archive post and alt text are optional.

The fixed lines live in `THREAD_LINES` in the same file.

### Important compatibility fix

Your actual `news` schema (checked directly against `ArticleEditor.jsx` in the site repo) uses a `status` field (`draft` / `review` / `scheduled` / `published` / `archived`), **not** a `published: true/false` boolean like the original spec assumed. BAS Studio is built against the real schema — drafts land with `status: "draft"` and will show up correctly in your existing dashboard.

### Reused from the site repo (not rebuilt)

- `src/components/editor/StoryEditor.jsx` — copied from `BAS-Website-nextjs`. One small, clearly-commented addition: it now forwards a ref to the Quill instance and a selection-change callback, which is what powers the improve-bubble and dictation. Toolbar, fonts, and formatting are untouched.
- `src/components/editor/ImageUploader.jsx` — copied as-is.
- The category list (`src/lib/constants.ts`) and slug logic (`src/lib/slugify.ts`) match the site exactly.

### Cover image uploads

These go through a server route (`/api/draft/upload-image`) using the Firebase Admin SDK, not the client Storage SDK. BAS Studio only has the passcode gate, not real Firebase Auth — a client-side upload would very likely get rejected by your site's Storage security rules (which almost certainly require `request.auth != null`). Routing through the server sidesteps that. If your bucket has "uniform bucket-level access" enabled, the route automatically falls back to a long-lived signed URL instead of a public one.

### Local Whisper setup (required for YouTube-without-captions and audio/video uploads)

No API key — transcription runs on your machine:
```
pip install -U openai-whisper
pip install yt-dlp   # only needed for the YouTube fallback path
brew install ffmpeg  # if you don't already have it
```
Verify `whisper` and (optionally) `yt-dlp` are on your PATH before testing New Draft — errors from this screen will tell you which one is missing.

### Grok (xAI) integration — optional

Two additive features, both off/silent if no key is set:

- **X radar on Leads** — Grok's real differentiator here is live X (Twitter) access, which often surfaces breaking Bitcoin-Africa news before it reaches any article or RSS feed. Runs in parallel with the RSS feeds and Claude's market radar; tagged Unverified same as the rest of that lane.
- **Model toggle on the Home chat screen** — pick Claude or Grok per message. Grok always has X + web search on (there's no separate deep-search step for it, since it's already live by default); Claude keeps the existing quick/deep split.

**Two ways to set the key**, in priority order:
1. `XAI_API_KEY` in `.env.local` — never leaves your machine, the more secure option
2. The in-app **Settings** screen (bottom of the icon rail) — pastes the key through a form, validates it against xAI's API before saving, and stores it in a Firestore `settings` collection (server-only reads, never sent to the browser). Simpler if you don't want to touch a `.env` file, but worth knowing the key then lives in your database rather than only on your machine.

If both are set, `.env.local` wins.

This is built against xAI's current Responses API (`x_search` / `web_search` tools). Their older Live Search API (`search_parameters`) was retired January 12 2026 — if xAI's SDK shape has changed since, `src/lib/grok.ts` and `src/lib/x-radar.ts` are the two files to check first.

### One-time Firestore index

The style-samples query (`news` where `status == "published"` order by `createdAt`) needs a composite index. Firestore will throw an error with a direct "create index" link the first time you generate a draft — click it once and you're done.

Notes:
- The Chat tab's "is this a research query" detection is a heuristic (short, no ending punctuation, no conversational lead-in word). It'll misfire occasionally — anything it gets wrong just falls through to a normal chat reply, and the Deep Search toggle always works as an explicit fallback.
- MoneyBadger's feed URL (`?format=rss`) is Squarespace's standard pattern — if it 404s for any reason, swap it from Manage Sources.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `NEXT_PUBLIC_FIREBASE_*` — from Firebase Console > Project Settings > General (same values your main site uses)
   - `FIREBASE_SERVICE_ACCOUNT_KEY` — Firebase Console > Project Settings > Service Accounts > Generate new private key. Paste the whole JSON as one line.
   - `BAS_STUDIO_PASSCODE` — the passcode that gates the tool. Required on Vercel: a hosted copy with no passcode stays locked. On your own computer you can leave it out and create one from the lock screen the first time (it is saved in Firestore). New passcodes need at least 10 characters, and the passcode can be changed in Settings but never removed.
   - `SESSION_SECRET` — optional; a long random string that signs sign-in cookies. Without it they're signed with a key derived from the Firebase service account.
   - `OPENAI_API_KEY` — only if using OpenAI's hosted Whisper for transcription (tell me if you'd rather self-host)
3. `npm run dev` and open `http://localhost:3000`

## Structure

```
src/
  app/
    leads/         Leads screen
    draft/         New Draft screen
    edit/          Edit & Send screen
    assistant/      Assistant chat
    sources/        Manage Sources
    api/            Route handlers (leads, draft, transcribe, assistant, sources, auth)
  components/
    ui/             Shared UI (passcode gate, buttons, cards)
    editor/         StoryEditor (ported from main site)
    leads/          Leads-screen components
    draft/          Draft-screen components
    assistant/       Assistant chat components
  lib/              Firebase client/admin, Anthropic client
  types/            Shared TypeScript types
```

## Notes

- Drafts write to the `news` Firestore collection with `status: "draft"`. Publishing still happens from your existing dashboard.
- Transcription (audio and video files, X Spaces, recordings, and YouTube videos without captions) runs Whisper on the computer Studio runs on, so it only works locally. A hosted copy says so instead of failing.
- Studio stores keys, the passcode, chats, newsletters, outreach and distribution notes in Firestore (`settings`, `chats`, `newsletters`, `outreach`, `distribution`, `sources`). The site's Firestore rules must keep those collections private.
- No secrets are ever committed — `.env.local` is gitignored.
