import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import { runResearch } from "@/lib/research";
import { grokChat } from "@/lib/grok-chat";

/**
 * Heuristic: a message that reads like a bare name/project ("Kes.Money", "Machankura",
 * "Fedi wallet Uganda") rather than a conversational instruction gets routed to quick
 * research instead of a normal chat turn. This is approximate — false negatives just fall
 * through to a normal chat reply, and the user can always get the same result explicitly
 * from the Research tab.
 */
function looksLikeResearchQuery(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return false;
  if (/[.?!]$/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  if (words.length > 6) return false;

  const conversational =
    /^(what|why|how|when|where|who|can|could|should|is|are|do|does|please|help|write|draft|edit|fix|change|make|rewrite|summarize|explain|suggest|give|tell|show)\b/i;
  if (conversational.test(trimmed)) return false;

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history, draftContext, deep, provider } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Grok path — always live-searches X and the web, so "deep" doesn't apply here the
    // way it does for Claude. Kept separate from the research-card pipeline below since
    // that relies on Claude's structured JSON output, which Grok isn't asked to produce.
    if (provider === "grok") {
      const text = await grokChat(message.trim(), Array.isArray(history) ? history : []);
      return NextResponse.json({ type: "chat", text });
    }

    if (deep === true) {
      const research = await runResearch(message.trim(), "deep");
      return NextResponse.json({ type: "research", research });
    }

    if (looksLikeResearchQuery(message)) {
      const research = await runResearch(message.trim(), "quick");
      return NextResponse.json({ type: "research", research });
    }

    const client = getAnthropic();

    const system = `You are the BAS Studio assistant for Bitcoin Africa Story, an independent Bitcoin/Africa news site.
You can see the writer's currently open draft below for context. You must NEVER edit it directly — only
suggest changes in your reply text, which the writer will paste in themselves if they want them.

${
  draftContext
    ? `CURRENT DRAFT:\nTitle: ${draftContext.title || "(untitled)"}\n\n${draftContext.content || "(empty)"}`
    : "No draft is currently open."
}`;

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1500,
      system,
      messages,
    });

    const text = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    return NextResponse.json({ type: "chat", text });
  } catch (err: any) {
    console.error("Assistant chat error:", err);
    return NextResponse.json({ error: err.message || "Assistant request failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";
