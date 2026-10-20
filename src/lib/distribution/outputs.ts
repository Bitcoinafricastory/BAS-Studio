import type { OutputId } from "./types";

export interface OutputSpec {
  id: OutputId;
  label: string;
  account: string; // who posts it
  platform: "x" | "linkedin" | "image";
  optional: boolean;
  template: string;
  note: string; // shown to the model alongside the template
}

export const OUTPUT_SPECS: Record<OutputId, OutputSpec> = {
  x_bas_post: {
    id: "x_bas_post",
    label: "X post",
    account: "BAS on X",
    platform: "x",
    optional: false,
    note:
      "Posted from @btcafricastory, which has X Premium, so long posts are fine (aim for 400 to 1,000 characters). The link never goes in the post body; it goes in the first comment.",
    template: `{Hook: the news or the human moment, one or two short sentences}

{Context: who, where, when, with the key numbers. Tag people and projects on first mention as Name (@handle).}

{Why it matters: one sentence}

{What's next: a date, a place or the open question}

Check the first comment to read the full story. 👇`,
  },
  x_bas_comment: {
    id: "x_bas_comment",
    label: "X first comment",
    account: "BAS on X",
    platform: "x",
    optional: false,
    note:
      "The first comment under the BAS post. It carries the author credit and the link. When the article follows earlier coverage of the same subject, use the 'Read our latest story on {subject}' form.",
    template: `Read the full story by @{author_x_handle} 👇
{url}

(When the article follows earlier coverage of the same subject: Read our latest story on {subject} by @{author_x_handle} 👇)`,
  },
  x_author_post: {
    id: "x_author_post",
    label: "X post (author)",
    account: "Author's own X account",
    platform: "x",
    optional: false,
    note:
      "At most 280 characters, counted the way X counts them (a link is 23), unless the author record says the account has Premium.",
    template: `In my latest for @btcafricastory, I covered {the story in one line, with the key @handles}.

{url}`,
  },
  li_bas_post: {
    id: "li_bas_post",
    label: "LinkedIn post",
    account: "BAS LinkedIn page",
    platform: "linkedin",
    optional: false,
    note:
      "Up to 3,000 characters. The link goes inside the post, not in a comment. Fuller context than X: who co-hosted, one line of background on the organization, what came before. Names written in full, no @handles.",
    template: `{Hook sentence}

{Context paragraph: who, what, where, when, numbers}

{Background or why it matters: one or two sentences}

{What's next}

Read the full story by {author_name}: {url}

#Bitcoin #Africa #{Topic} #{Topic}`,
  },
  li_author_post: {
    id: "li_author_post",
    label: "LinkedIn post (author)",
    account: "Author's LinkedIn profile",
    platform: "linkedin",
    optional: false,
    note: "Up to 3,000 characters. First person. The link goes inside the post. No @handles.",
    template: `In my latest for Bitcoin Africa Story, I covered {what the story is about}.

{Two or three short lines with the strongest facts}

{What's next}

Read the full story: {url}

#Bitcoin #Africa #{Topic}`,
  },
  x_thread: {
    id: "x_thread",
    label: "Two-post X thread",
    account: "BAS on X",
    platform: "x",
    optional: true,
    note:
      "Write two posts separated by a line containing only ---. Post 1 is the story in the BAS post format with no link. Post 2 is one line on what readers will find, then 'Read the full story by @{author_x_handle} 👇' and the link.",
    template: `{Post 1: the BAS post format, no link}

---

{Post 2: one line on what readers will find}
Read the full story by @{author_x_handle} 👇
{url}`,
  },
  x_archive: {
    id: "x_archive",
    label: "Archive post",
    account: "BAS on X",
    platform: "x",
    optional: true,
    note:
      "An evergreen post built from an older article, aimed at reach rather than news. Open on a person and a turning point. Short declarative sentences; fragments are fine for lists. Show growth with real numbers. Self-contained: the post tells the story and the link sits in the first comment. Close on a plain, motivating line, never a comparison. Do not include the link.",
    template: `{Person and turning point}

{Short declarative sentences with real numbers}

{Plain, motivating closing line}`,
  },
  alt_text: {
    id: "alt_text",
    label: "Image alt text",
    account: "Featured image",
    platform: "image",
    optional: true,
    note:
      "Describe what is in the picture, then any words on it in quotes. You can only describe what the fact sheet and the existing alt text support; if there is no existing alt text, flag that you cannot see the image and write alt text only from the article's own caption or subject.",
    template: `{What is in the picture. Any words on it: "quoted".}`,
  },
};

export const CORE_OUTPUTS: OutputId[] = [
  "x_bas_post",
  "x_bas_comment",
  "x_author_post",
  "li_bas_post",
  "li_author_post",
];
export const OPTIONAL_OUTPUTS: OutputId[] = ["x_thread", "x_archive", "alt_text"];
