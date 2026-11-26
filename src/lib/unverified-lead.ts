/**
 * AI radar leads (Claude web search, Grok on X) are pointers, not sources. When one is handed to
 * New Draft it travels as a clearly marked block: the editor sees what to go and check, and the
 * draft generator strips the block before the model sees anything, so the lead's wording and its
 * link can never be drafted as fact.
 */
const START = "[Unverified lead from AI radar: a pointer, not a source]";
const END = "[End of unverified lead. Paste the original post, page or email below, then generate.]";

const BLOCK = /\[Unverified lead from AI radar[^\]]*\][\s\S]*?\[End of unverified lead[^\]]*\]/g;

/** The notes New Draft opens with when the editor drafts from an unverified lead. */
export function unverifiedLeadNotes(title: string, url: string): string {
  return `${START}\nLead: ${title}\nLink to check: ${url}\n${END}\n\n`;
}

/** True when the text holds at least one unverified lead block. */
export function hasUnverifiedLead(text: string): boolean {
  return new RegExp(BLOCK.source).test(text);
}

/** The material with every unverified lead block removed. This is all the model is given. */
export function stripUnverifiedLeads(text: string): string {
  return text.replace(BLOCK, "").trim();
}
