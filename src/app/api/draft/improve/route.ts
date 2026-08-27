import { NextRequest, NextResponse } from "next/server";
import { getAnthropic, DEFAULT_MODEL } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const { selectedText, context } = await req.json();
    if (!selectedText || !selectedText.trim()) {
      return NextResponse.json({ error: "selectedText is required" }, { status: 400 });
    }

    const client = getAnthropic();
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      system:
        "You improve a highlighted passage from a Bitcoin Africa Story article draft — tighter, " +
        "clearer, same meaning and facts, same voice. Return ONLY the improved passage as plain " +
        "text (or minimal inline HTML if the original had it) — no preamble, no surrounding quotes, " +
        "no explanation of what you changed.",
      messages: [
        {
          role: "user",
          content: `Surrounding article context (for tone/continuity only — don't repeat it back):\n${(
            context || ""
          ).slice(0, 2000)}\n\nImprove this passage:\n${selectedText}`,
        },
      ],
    });

    const improved = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ improved });
  } catch (err: any) {
    console.error("Improve error:", err);
    return NextResponse.json({ error: err.message || "Improve failed" }, { status: 500 });
  }
}



export const dynamic = "force-dynamic";
