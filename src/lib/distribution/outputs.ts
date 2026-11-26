import type { OutputId } from "./types";
import { THREAD_LINES } from "./registry";

export interface OutputSpec {
  id: OutputId;
  label: string;
  account: string; // who posts it
  platform: "x" | "linkedin" | "image";
  optional: boolean;
  template: string;
  note: string; // shown to the model alongside the template
  howToPost?: string; // shown to the editor on the card
}

export const OUTPUT_SPECS: Record<OutputId, OutputSpec> = {
  x_bas_post: {
    id: "x_bas_post",
    label: "Main post",
    account: "@btcafricastory",
    platform: "x",
    optional: false,
    note:
      "The first post of the BAS thread, in the third person. At most 280 characters, counted the way X counts them, unless you are told the account has Premium. Tell the story with every named person and project tagged on first mention as Name (@handle), using only handles from the registry or the fact sheet. No link: it goes in Reply 1. Never put a price, deadline pressure, a teaser header or every point of the article in the main post.",
    template: `{The story in two or three connected sentences: who, what, where, with the key number. Tag people and projects on first mention.}

${THREAD_LINES.mainPostEnd}`,
    howToPost: "Post from @btcafricastory with the featured image or video attached.",
  },
  x_bas_comment: {
    id: "x_bas_comment",
    label: "Reply 1: the link",
    account: "@btcafricastory",
    platform: "x",
    optional: false,
    note: "Written by Studio from the fixed BAS wording, not by the model.",
    template: `${THREAD_LINES.replyLatest("{author_x_handle}")}
{url}`,
    howToPost: "Reply to the main post with this.",
  },
  x_bas_action: {
    id: "x_bas_action",
    label: "Reply 2: one action",
    account: "@btcafricastory",
    platform: "x",
    optional: false,
    note:
      "A reply under Reply 1, in the third person. One thing the reader can do (book, apply, donate, buy tickets, watch, read the source) or one related link, from the LINKS IN THE ARTICLE list only. One link, no more. At most 280 characters. If the list has nothing a reader can act on, write only: SKIP",
    template: `{One plain sentence on the action, tagging the organiser if the registry or fact sheet has their handle}
{one link from the article's link list}`,
    howToPost: "Reply under Reply 1.",
  },
  x_bas_extra: {
    id: "x_bas_extra",
    label: "Reply 3: partners or apply link",
    account: "@btcafricastory",
    platform: "x",
    optional: true,
    note:
      "An optional last reply: partners worth crediting, or a second apply or registration link, from the LINKS IN THE ARTICLE list only. At most 280 characters. If there is nothing to add beyond Reply 2, write only: SKIP",
    template: `{Partners or a second link, in one or two plain sentences}`,
    howToPost: "Reply under Reply 2, only if it adds something.",
  },
  x_author_post: {
    id: "x_author_post",
    label: "Requote from the author",
    account: "Author's own X account",
    platform: "x",
    optional: false,
    note:
      "The author quote-posts the BAS main post from their own account, in the first person. Take a different angle from the MAIN POST you are given: never repeat its sentences or lead with the same fact. Say plainly what the reader gets, keep jargon out, tag the subject and the projects. Make only personal claims the fact sheet supports. No link: it quotes the main post. At most 280 characters unless the author has Premium.",
    template: `{One angle the main post did not use, in plain words, with what the reader gets and the key @handles}

${THREAD_LINES.requoteEnd}`,
    howToPost: "Quote the BAS main post from your own account and paste this.",
  },
  li_bas_post: {
    id: "li_bas_post",
    label: "LinkedIn post",
    account: "BAS LinkedIn page",
    platform: "linkedin",
    optional: true,
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
    optional: true,
    note: "Up to 3,000 characters. First person. The link goes inside the post. No @handles.",
    template: `In my latest for Bitcoin Africa Story, I covered {what the story is about}.

{Two or three short lines with the strongest facts}

{What's next}

Read the full story: {url}

#Bitcoin #Africa #{Topic}`,
  },
  x_archive: {
    id: "x_archive",
    label: "Archive post",
    account: "@btcafricastory",
    platform: "x",
    optional: true,
    note:
      "A main post that brings back an older article, aimed at reach rather than news. Open on a person and a turning point, with one real number. At most 280 characters unless the account has Premium. No link: Reply 1 carries it, using the older-piece wording. Close on a plain line, never a comparison.",
    template: `{Person and turning point, with one real number}

${THREAD_LINES.mainPostEnd}`,
    howToPost: "Post from @btcafricastory, then add Reply 1 with “Older piece” ticked.",
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

// The BAS thread and the requote are on by default; everything else is optional.
export const CORE_OUTPUTS: OutputId[] = ["x_bas_post", "x_bas_comment", "x_bas_action", "x_author_post"];
export const OPTIONAL_OUTPUTS: OutputId[] = ["x_bas_extra", "x_archive", "alt_text", "li_bas_post", "li_author_post"];

/** Outputs Studio writes itself from fixed wording, with no model call. */
export const FIXED_OUTPUTS: OutputId[] = ["x_bas_comment"];

/** X outputs posted from @btcafricastory, held to the BAS account's limit. */
export const BAS_X_OUTPUTS: OutputId[] = ["x_bas_post", "x_bas_comment", "x_bas_action", "x_bas_extra", "x_archive"];
