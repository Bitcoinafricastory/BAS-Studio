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

/**
 * Asks for a JSON object through a forced tool call. The API returns the tool's input already
 * parsed, so an unescaped quote in the model's output can no longer break the result the way
 * free-text JSON did.
 */
export async function askJson<T>(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = await getAnthropic();
  const res = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: 0,
    system: opts.system,
    tools: [{ name: "record", description: "Record the result.", input_schema: opts.schema as any }],
    tool_choice: { type: "tool", name: "record" },
    messages: [{ role: "user", content: opts.user }],
  });
  const block = res.content.find((b: any) => b.type === "tool_use") as any;
  if (!block?.input || typeof block.input !== "object") {
    throw new Error(res.stop_reason === "max_tokens" ? "The fact sheet was too long to finish. Try again." : "The model did not return a fact sheet.");
  }
  return block.input as T;
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
