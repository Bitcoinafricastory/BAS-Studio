import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import { passageSystemPrompt, lintWording } from "@/lib/voice";

// Every route here reads request-time secrets (Firebase, Anthropic, xAI) or
// request data — never build-time static content. Without this, Next.js
// attempts to statically pre-render GET routes at build time and fails
// noisily (harmlessly) since those secrets are not available then.
export const dynamic = "force-dynamic";

function textOf(response: any): string {
  return response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim()
    .replace(/^["“]([\s\S]*)["”]$/, "$1");
}

export async function POST(req: NextRequest) {
  try {
    const { selectedText, context } = await req.json();
    if (!selectedText || !selectedText.trim()) {
      return NextResponse.json({ error: "selectedText is required" }, { status: 400 });
    }

    const client = await getAnthropic();
    const system = passageSystemPrompt();
    const user = `Surrounding article context (for tone and continuity only; don't repeat it back):\n${(context || "").slice(0, 3000)}\n\nImprove this passage:\n${selectedText}`;

    const first = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content: user }],
    });
    let improved = textOf(first);

    // One retry if the rewrite itself slipped into slop or dashes.
    const issues = lintWording(improved);
    if (issues.length) {
      const retry = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1000,
        temperature: 0.2,
        system,
        messages: [
          { role: "user", content: user },
          { role: "assistant", content: improved },
          {
            role: "user",
            content: `That breaks the BAS style: ${issues.map((i) => i.message).join(" ")} Fix it and return only the passage.`,
          },
        ],
      });
      improved = textOf(retry);
    }

    return NextResponse.json({ improved });
  } catch (err: any) {
    console.error("Improve error:", err);
    return NextResponse.json({ error: err.message || "Improve failed" }, { status: 500 });
  }
}
