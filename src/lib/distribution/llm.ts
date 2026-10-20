import { getAnthropic, DEFAULT_MODEL } from "../anthropic";

export async function ask(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const anthropic = await getAnthropic();
  const res = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.5,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[\[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start === -1 || end === -1) throw new Error("The model did not return valid JSON");
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
}
