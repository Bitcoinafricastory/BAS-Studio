/** BAS reads at about 230 words a minute. The site stores the result as text, e.g. "4 min read". */
export const WORDS_PER_MINUTE = 230;

export function wordCountOfHtml(html: string): number {
  const text = (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

export function readTimeFor(html: string): string {
  return `${Math.max(1, Math.round(wordCountOfHtml(html) / WORDS_PER_MINUTE))} min read`;
}
