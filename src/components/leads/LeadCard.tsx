import Link from "next/link";
import { ExternalLink, Radar, Rss, Sparkles, PenSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Lead } from "@/types";

export default function LeadCard({ lead }: { lead: Lead }) {
  const when = (() => {
    try {
      return formatDistanceToNow(new Date(lead.publishedAt), { addSuffix: true });
    } catch {
      return "";
    }
  })();

  // Both actions hand the lead to another screen, so a lead is one click from research or a draft.
  const researchHref = `/?q=${encodeURIComponent(`Research this story and tell me if BAS should cover it: ${lead.title}`)}`;
  const draftHref = `/draft?notes=${encodeURIComponent(`${lead.title}\n\n${lead.summary || ""}\n\nSource: ${lead.url}`.trim())}`;

  return (
    <article className="card group p-4 transition-colors hover:border-gray-700">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
          {lead.origin === "market-radar" ? <Radar size={12} className="shrink-0" /> : <Rss size={12} className="shrink-0" />}
          <span className="truncate">{lead.sourceLabel}</span>
          {when && (
            <>
              <span>·</span>
              <span className="shrink-0">{when}</span>
            </>
          )}
        </div>
        {lead.unverified && (
          <span className="shrink-0 rounded-full border border-bas-gold/30 bg-bas-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold-fg">
            Unverified
          </span>
        )}
      </div>

      <a href={lead.url} target="_blank" rel="noopener noreferrer" className="focus-ring rounded">
        <h3 className="font-medium leading-snug text-gray-50 transition-colors group-hover:text-gold-fg">{lead.title}</h3>
      </a>
      {lead.summary && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-400">{lead.summary}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={researchHref} className="btn-ghost focus-ring">
          <Sparkles size={13} /> Research
        </Link>
        <Link href={draftHref} className="btn-ghost focus-ring">
          <PenSquare size={13} /> Draft from this
        </Link>
        <a href={lead.url} target="_blank" rel="noopener noreferrer" className="btn-ghost focus-ring">
          <ExternalLink size={13} /> Source
        </a>
      </div>
    </article>
  );
}
