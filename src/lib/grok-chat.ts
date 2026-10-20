import { getGrok, extractGrokText, DEFAULT_GROK_MODEL } from "./grok";
import { grokStyleBlock } from "./voice";

/**
 * Plain conversational Grok, with X and web search always on — that live-data access is
 * Grok's whole reason for being in this app, so unlike the Claude path there's no separate
 * "deep" toggle here; it's always searching.
 */
export async function grokChat(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const client = await getGrok();
  // The system message carries the BAS voice, so copy Grok drafts already follows it.
  const input = [
    { role: "system", content: grokStyleBlock() },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const response = await (client as any).responses.create({
    model: DEFAULT_GROK_MODEL,
    input,
    tools: [{ type: "x_search" }, { type: "web_search" }],
  });

  return extractGrokText(response);
}
