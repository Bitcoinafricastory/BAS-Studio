import type { ResearchResult } from "./index";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  research?: ResearchResult;
  error?: boolean;
}

export type ChatProvider = "claude" | "grok";

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: string; // ISO
  count: number; // messages in the chat
}

export interface StoredChat {
  id: string;
  title: string;
  provider: ChatProvider;
  messages: ChatMessage[];
  updatedAt: string;
}
