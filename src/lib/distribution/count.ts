import { parseTweet } from "twitter-text";

// X's own counting rules: a link is 23, an emoji is 2, most CJK is 2.
// Used on the server for the checks and in the browser for the live counter.
export function xLength(text: string): number {
  return parseTweet(text).weightedLength;
}

export function plainLength(text: string): number {
  return Array.from(text).length;
}
