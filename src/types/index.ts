export interface Source {
  id: string;
  label: string;
  url: string;
  type: "rss" | "google-news";
  active: boolean;
}

export interface Lead {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceLabel: string;
  publishedAt: string; // ISO
  fetchedAt: string; // ISO
  origin: "feed" | "market-radar"; // market-radar = AI-summarized, unverified
  unverified?: boolean;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchResult {
  query: string;
  overview: string;
  recentActivity: string;
  existingCoverage: string;
  writeworthy: "yes" | "maybe" | "no";
  recommendation: string;
  suggestedAngle: string;
  sources: ResearchSource[];
  raw?: string; // present only if structured parsing failed — fallback display
}

export interface Draft {
  id?: string;
  title: string;
  slug: string;
  content: string; // Quill HTML
  excerpt: string;
  category: string; // one of CATEGORIES in lib/constants.ts
  image: string; // cover image URL
  imageAlt: string;
  author: string;
  date: string; // YYYY-MM-DD
  readTime: string; // e.g. "4 min read" — matches the site's string format, not a number
  youtubeUrl: string;
  status: "draft"; // BAS Studio always writes as draft; publishing happens in the existing dashboard
  seoTitle: string;
  metaDescription: string;
  focusKeywords: string;
  authorId?: string; // an `authors` doc id; the server fills the byline fields from it
  tags?: string[];
  keyTakeaways?: string[];
  faqs?: { question: string; answer: string }[];
  linkedEntities?: { slug: string; name: string }[]; // directory profiles; sent as linkedEntityIds
  suggestedEntities: string[]; // names with no directory profile, shown to the editor only
  suggestedInternalLinks: { title: string; url: string }[];
  claimsToVerify: string[];
  styleNotes?: string[]; // BAS style check results at generation time; BAS Studio only, never sent to the site
  createdAt: string;
  updatedAt: string;
  sourceMaterial: {
    kind: "notes" | "youtube" | "audio" | "xspace";
    raw: string;
  };
}
