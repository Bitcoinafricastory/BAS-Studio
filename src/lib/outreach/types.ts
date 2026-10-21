export type Priority = "high" | "medium" | "low";
export type OutreachMode = "coverage" | "directory";

export interface Org {
  name: string;
  slug: string;
  site: string;
  priority: Priority;
  why: string;
  /** [title, path on bitcoinafricastory.com]; empty for directory leads. */
  stories: [string, string][];
  kind: OutreachMode;
  /** Country, or "pan" for pan-African and global organisations. */
  where?: string;
}

export type StatusValue = "todo" | "sent" | "replied" | "linked" | "declined" | "updated" | "story" | "noreply";

export interface History {
  sent?: string;
  replied?: string;
  linked?: string;
  declined?: string;
  updated?: string;
  story?: string;
  noreply?: string;
  followups?: string[];
}

export interface Progress {
  status: StatusValue;
  note: string;
  history: History;
  updatedAt?: string;
}

export type ProgressMap = Record<string, Progress>;

export type OutreachAction =
  | { slug: string; type: "status"; status: StatusValue }
  | { slug: string; type: "note"; note: string }
  | { slug: string; type: "followup" };
