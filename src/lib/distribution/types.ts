export type OutputId =
  | "x_bas_post"
  | "x_bas_comment"
  | "x_author_post"
  | "li_bas_post"
  | "li_author_post"
  | "x_thread"
  | "x_archive"
  | "alt_text";

export interface AuthorRecord {
  name: string;
  xHandle: string; // without @
  linkedinName: string;
  premium: boolean; // X Premium on the author's own account
}

export interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  url: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
  imageAlt: string;
  bodyText: string;
  links: { text: string; url: string }[]; // links found in the article body, used as the Sources list
}

export interface ArticleListItem {
  id: string;
  title: string;
  slug: string;
  author: string;
  category: string;
  date: string;
  image: string;
}

export interface FactSheet {
  subject: string; // short name of the subject, e.g. "The Core"
  followsEarlierCoverage: boolean; // true when the article follows earlier BAS coverage of the same subject
  what: string;
  who: { name: string; role: string; handle: string | null }[];
  when: string;
  where: string;
  numbers: { value: string; context: string }[];
  quotes: { speaker: string; text: string }[];
  whyItMatters: string;
  whatsNext: string;
  hedged: { claim: string; hedge: string }[]; // claims the source states with uncertainty
  facts: { text: string; sourceSentence: string }[];
}

export interface CheckResult {
  level: "error" | "warn";
  rule: string;
  message: string;
}

export interface Variant {
  text: string;
  flags: string[]; // what the generator said it could not support
  checks: CheckResult[];
  unsupportedClaims: string[]; // from the reviewer model
}
