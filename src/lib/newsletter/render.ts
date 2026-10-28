import type { NewsletterIssue } from "./types";
import { formatRange } from "./week";

const SITE = "https://www.bitcoinafricastory.com";
const GOLD = "#F7931A";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const paras = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

function safeUrl(u: string): string {
  return /^https?:\/\//i.test(u) ? u : "#";
}

/** Email-safe HTML: tables, inline styles, no scripts. Pastes into Mailchimp, Substack, Beehiiv, Gmail. */
export function renderHtml(issue: NewsletterIssue): string {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const p = (t: string) => `<p style="margin:0 0 16px;font:16px/1.65 ${font};color:#222222;">${esc(t)}</p>`;

  const items = issue.items
    .map((it) => {
      const img = it.image && /^https?:\/\//i.test(it.image)
        ? `<tr><td style="padding:0 0 12px;"><a href="${esc(safeUrl(it.url))}"><img src="${esc(it.image)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:6px;"></a></td></tr>`
        : "";
      const meta = [it.category, it.author && `By ${it.author}`].filter(Boolean).join(" · ");
      return `<tr><td style="padding:0 0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${img}
${meta ? `<tr><td style="padding:0 0 4px;font:600 12px/1.4 ${font};letter-spacing:.04em;text-transform:uppercase;color:#8a5a00;">${esc(meta)}</td></tr>` : ""}
<tr><td style="padding:0 0 8px;font:700 20px/1.3 ${font};"><a href="${esc(safeUrl(it.url))}" style="color:#111111;text-decoration:none;">${esc(it.title)}</a></td></tr>
<tr><td style="padding:0 0 8px;font:16px/1.65 ${font};color:#222222;">${esc(it.blurb)}</td></tr>
<tr><td style="font:600 15px/1.4 ${font};"><a href="${esc(safeUrl(it.url))}" style="color:#b86e00;text-decoration:underline;">Read the full story</a></td></tr>
</table></td></tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(issue.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f1;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(issue.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f1;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:10px;">
<tr><td style="padding:24px 32px;border-bottom:4px solid ${GOLD};font:700 18px/1.3 ${font};color:#111111;">Bitcoin Africa Story<br><span style="font:400 13px/1.6 ${font};color:#666666;">Week of ${esc(formatRange(issue.weekStart, issue.weekEnd))}</span></td></tr>
<tr><td style="padding:28px 32px 4px;">${paras(issue.intro).map(p).join("")}</td></tr>
<tr><td style="padding:8px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${items}
</table></td></tr>
<tr><td style="padding:0 32px 28px;">${paras(issue.closing).map(p).join("")}</td></tr>
<tr><td style="padding:20px 32px;background:#fafaf7;border-top:1px solid #eeeeea;border-radius:0 0 10px 10px;font:13px/1.6 ${font};color:#777777;">Bitcoin Africa Story · <a href="${SITE}" style="color:#777777;">bitcoinafricastory.com</a> · <a href="https://x.com/btcafricastory" style="color:#777777;">@btcafricastory</a></td></tr>
</table></td></tr></table></body></html>`;
}

export function renderText(issue: NewsletterIssue): string {
  const parts = [issue.subject, "", issue.intro.trim(), ""];
  for (const it of issue.items) {
    parts.push(it.title.toUpperCase(), it.blurb.trim(), `Read the full story: ${it.url}`, "");
  }
  parts.push(issue.closing.trim(), "", "Bitcoin Africa Story", SITE);
  return parts.join("\n");
}
