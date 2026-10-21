import * as twitterTextModule from "twitter-text";

// twitter-text ships two builds. Its CommonJS build exposes parseTweet directly, but the
// ES module build that Next's bundler picks up has only a default export, so a named
// import (`import { parseTweet }`) comes back undefined at runtime. Taking the default
// when it exists works with both builds.
const twitterText = ((twitterTextModule as any).default ?? twitterTextModule) as typeof twitterTextModule;

// X's own counting rules: a link is 23, an emoji is 2, most CJK is 2.
// Used on the server for the checks and in the browser for the live counter.
export function xLength(text: string): number {
  return twitterText.parseTweet(text).weightedLength;
}

export function plainLength(text: string): number {
  return Array.from(text).length;
}
