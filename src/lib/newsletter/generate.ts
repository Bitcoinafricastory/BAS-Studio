import { getAnthropic, DEFAULT_MODEL } from "../anthropic";
import { loadArticle } from "../distribution/article";
import {
  BAS_IDENTITY,
  VOICE_RULES,
  DESLOP_RULES,
  ACCURACY_RULES,
  PRIVACY_RULES,
  examplesBlock,
  lintWording,
  fixPassPrompt,
} from "../voice";
import type { NewsletterIssue } from "./types";
import { formatRange } from "./week";

const BODY_CHARS = 3200;

function system(): string {
  return `${BAS_IDENTITY}

You write the BAS weekly newsletter: a short email that tells readers what BAS published this week and sends them to the full stories. It is written by the BAS editor, in the BAS voice, speaking as "we" for the publication.

STRUCTURE
- subjects: three subject line options, each under 60 characters, specific to this week's stories. No clickbait, no questions, no all caps.
- preheader: one line under 100 characters that adds to the subject.
- intro: two to four short sentences. Say what the week was about, naming the real stories. No greeting like "Welcome" or "Hope you're well". Start with substance.
- items: one per article, in the order given. Each blurb is two or three sentences that give the reader the key fact and why it matters, then stop. Do not repeat the headline. Do not tease with questions.
- closing: one or two sentences. Point to what BAS is watching next only if the articles say so. Otherwise a plain thanks for reading and a reminder that tips and stories can be sent to the BAS team.

RULES FOR THIS EMAIL
- Use only facts that appear in the articles provided. Never add facts, numbers, names, quotes or links.
- Do not put any URL in the intro, blurbs or closing. The links are added for you.
- Do not use the headline's exact words as the blurb's opening.
- Plain text only: no markdown, no bullets, no HTML, no emoji.

${VOICE_RULES}

${DESLOP_RULES}

${ACCURACY_RULES}

${PRIVACY_RULES}

<approved_examples>
${examplesBlock(2)}
</approved_examples>

Return JSON in <result></result> tags and nothing else:
<result>{"subjects":["","",""],"preheader":"","intro":"","blurbs":[{"id":"article id","blurb":""}],"closing":""}</result>`;
}

function textOf(r: any): string {
  return r.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

function parse(text: string): any {
  const m = text.match(/<result>([\s\S]*?)<\/result>/);
  if (!m) throw new Error("The newsletter came back in an unexpected format. Try again.");
  try {
    return JSON.parse(m[1]);
  } catch {
    throw new Error("The newsletter came back in an unexpected format. Try again.");
  }
}

const URL_RE = /https?:\/\/\S+|www\.\S+/gi;
const clean = (s: unknown) => String(s ?? "").replace(URL_RE, "").replace(/[ \t]{2,}/g, " ").trim();

function collectText(p: any): string {
  return [...(p.subjects || []), p.preheader, p.intro, ...(p.blurbs || []).map((b: any) => b.blurb), p.closing].join("\n");
}

export async function generateNewsletter(ids: string[], weekStart: string, weekEnd: string, note = ""): Promise<NewsletterIssue> {
  const articles = [];
  for (const id of ids) articles.push(await loadArticle(id));
  if (!articles.length) throw new Error("Pick at least one article.");

  const material = articles
    .map(
      (a) =>
        `<article id="${a.id}">\nTitle: ${a.title}\nAuthor: ${a.author}\nCategory: ${a.category}\nPublished: ${a.date}\n\n${a.bodyText.slice(0, BODY_CHARS)}\n</article>`
    )
    .join("\n\n");

  const userMessage = `Week: ${formatRange(weekStart, weekEnd)}\n${note.trim() ? `Editor's note for this issue (treat as a steer, not as a source of facts): ${note.trim().slice(0, 600)}\n` : ""}\nArticles published this week:\n\n${material}`;

  const client = await getAnthropic();
  const sys = system();
  const first = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 3000,
    temperature: 0.5,
    system: sys,
    messages: [{ role: "user", content: userMessage }],
  });
  const firstText = textOf(first);
  let parsed = parse(firstText);

  const hard = () => lintWording(collectText(parsed)).filter((i) => i.level === "error");
  const issues = hard();
  if (issues.length) {
    try {
      const second = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 3000,
        temperature: 0.3,
        system: sys,
        messages: [
          { role: "user", content: userMessage },
          { role: "assistant", content: firstText },
          { role: "user", content: fixPassPrompt(issues.map((i) => i.message)) },
        ],
      });
      parsed = parse(textOf(second));
    } catch (err) {
      console.error("Newsletter fix pass failed:", err);
    }
  }

  const blurbs = new Map<string, string>((parsed.blurbs || []).map((b: any) => [String(b.id), clean(b.blurb)]));
  const subjects = (Array.isArray(parsed.subjects) ? parsed.subjects : []).map(clean).filter(Boolean).slice(0, 3);

  return {
    subjects,
    subject: subjects[0] || `BAS this week: ${formatRange(weekStart, weekEnd)}`,
    preheader: clean(parsed.preheader),
    intro: clean(parsed.intro),
    // Title, link, author and image always come from the article record, never from the model.
    items: articles.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.url,
      author: a.author,
      category: a.category,
      image: a.image,
      blurb: blurbs.get(a.id) || "",
    })),
    closing: clean(parsed.closing),
    weekStart,
    weekEnd,
  };
}
