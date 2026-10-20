import { ask, parseJson } from "./llm";
import { SYSTEM_PROMPT, REVIEWER_PROMPT, registryText } from "./prompts";
import { OUTPUT_SPECS } from "./outputs";
import { EXAMPLES } from "./examples";
import { runChecks } from "./checks";
import { CATEGORY_HASHTAGS } from "./registry";
import type { ArticleRecord, AuthorRecord, FactSheet, OutputId, Variant } from "./types";

interface Input {
  outputId: OutputId;
  article: ArticleRecord;
  author: AuthorRecord;
  factSheet: FactSheet;
  angle?: string;
}

function buildUserMessage({ outputId, article, author, factSheet, angle }: Input): string {
  const spec = OUTPUT_SPECS[outputId];
  const examples = (EXAMPLES[outputId] || [])
    .map((e, i) => `EXAMPLE ${i + 1} (article: ${e.article})\n${e.text}`)
    .join("\n\n");
  const tags = CATEGORY_HASHTAGS[article.category] || [];

  // Note what is NOT sent: no internal notes, no private fields, no raw article text.
  // The generator sees the fact sheet only.
  return `OUTPUT TYPE: ${spec.label} (${spec.account})
${spec.note}

TEMPLATE:
${spec.template}

ARTICLE URL (use exactly): ${article.url}
ARTICLE TITLE: ${article.title}
CATEGORY: ${article.category}
${tags.length && spec.platform === "linkedin" ? `DEFAULT HASHTAGS FOR THIS CATEGORY (use with Bitcoin and Africa, three or four in total): ${tags.join(" ")}\n` : ""}${angle?.trim() ? `EDITOR'S ANGLE TO LEAD WITH: ${angle.trim()}\n` : ""}
AUTHOR:
name: ${author.name}
X handle: @${author.xHandle.replace(/^@/, "")}
LinkedIn name: ${author.linkedinName || author.name}

FACT SHEET:
${JSON.stringify(factSheet, null, 2)}

HANDLE REGISTRY:
${registryText()}

${examples ? `APPROVED EXAMPLES (match their shape and voice, never their facts):\n\n${examples}` : "No approved examples exist for this output yet. Follow the template and the rules."}`;
}

function parseOutput(raw: string): { text: string; flags: string[] } {
  const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const m = cleaned.match(/\n\s*FLAGS:\s*([\s\S]*)$/i);
  const text = (m ? cleaned.slice(0, m.index) : cleaned).trim();
  const flagText = m ? m[1].trim() : "";
  const flags = !flagText || /^none\.?$/i.test(flagText) ? [] : flagText.split(/\n|;\s*/).map((f) => f.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  return { text, flags };
}

async function review(text: string, factSheet: FactSheet): Promise<string[]> {
  try {
    const raw = await ask({
      system: REVIEWER_PROMPT,
      user: `FACT SHEET:\n${JSON.stringify(factSheet, null, 2)}\n\nDRAFT:\n${text}`,
      maxTokens: 800,
      temperature: 0,
    });
    const arr = parseJson<unknown>(raw);
    return Array.isArray(arr) ? arr.map(String).slice(0, 8) : [];
  } catch {
    return [];
  }
}

// One variant: generate, run the checks, retry once with the reasons if a hard check
// failed, then ask a reviewer model what the fact sheet does not support.
export async function generateVariant(input: Input, variantIndex: number): Promise<Variant> {
  const user = buildUserMessage(input);
  const nudge = variantIndex > 0 ? "\n\nWrite a genuinely different alternative: a different hook and a different order of details, with the same facts." : "";

  let parsed = parseOutput(
    await ask({ system: SYSTEM_PROMPT, user: user + nudge, maxTokens: 1800, temperature: variantIndex > 0 ? 0.9 : 0.5 })
  );
  let checks = runChecks(parsed.text, input);

  const hard = checks.filter((c) => c.level === "error");
  if (hard.length) {
    const retryUser = `${user}${nudge}

Your previous draft failed these checks:
${hard.map((c) => `- ${c.message}`).join("\n")}

Previous draft:
${parsed.text}

Rewrite it and fix every issue. Return the post text, then FLAGS: as before.`;
    parsed = parseOutput(await ask({ system: SYSTEM_PROMPT, user: retryUser, maxTokens: 1800, temperature: 0.4 }));
    checks = runChecks(parsed.text, input);
  }

  const unsupportedClaims = input.outputId === "alt_text" ? [] : await review(parsed.text, input.factSheet);
  return { text: parsed.text, flags: parsed.flags, checks, unsupportedClaims };
}
