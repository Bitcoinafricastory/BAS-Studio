export interface NewsletterItem {
  id: string;
  title: string;
  url: string;
  author: string;
  category: string;
  image: string;
  blurb: string;
}

export interface NewsletterIssue {
  subjects: string[]; // subject line options
  subject: string; // the one chosen
  preheader: string;
  intro: string;
  items: NewsletterItem[];
  closing: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Sunday)
}

export interface SavedIssue extends NewsletterIssue {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_ISSUE: NewsletterIssue = {
  subjects: [],
  subject: "",
  preheader: "",
  intro: "",
  items: [],
  closing: "",
  weekStart: "",
  weekEnd: "",
};
