import type { Source } from "@/types";

export const DEFAULT_SOURCES: Omit<Source, "id">[] = [
  {
    label: "Africa Bitcoin News",
    url: "https://bitcoinnews.africa/feed/",
    type: "rss",
    active: true,
  },
  {
    label: "MoneyBadger",
    url: "https://www.moneybadger.co.za/blog?format=rss",
    type: "rss",
    active: true,
  },
  {
    label: "Bitcoin Magazine",
    url: "https://bitcoinmagazine.com/feed",
    type: "rss",
    active: true,
  },
  {
    label: "Google News: Bitcoin Nigeria",
    url: "https://news.google.com/rss/search?q=Bitcoin+Nigeria&hl=en-NG&gl=NG&ceid=NG:en",
    type: "google-news",
    active: true,
  },
  {
    label: "Google News: Bitcoin Kenya",
    url: "https://news.google.com/rss/search?q=Bitcoin+Kenya&hl=en-KE&gl=KE&ceid=KE:en",
    type: "google-news",
    active: true,
  },
  {
    label: "Google News: Bitcoin South Africa",
    url: "https://news.google.com/rss/search?q=Bitcoin+South+Africa&hl=en-ZA&gl=ZA&ceid=ZA:en",
    type: "google-news",
    active: true,
  },
  {
    label: "Google News: Bitcoin Africa",
    url: "https://news.google.com/rss/search?q=Bitcoin+Africa&hl=en-US&gl=US&ceid=US:en",
    type: "google-news",
    active: true,
  },
];
