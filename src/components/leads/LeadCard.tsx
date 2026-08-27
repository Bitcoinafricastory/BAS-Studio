import { ExternalLink, Radar, Rss } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Lead } from "@/types";

export default function LeadCard({ lead }: { lead: Lead }) {
  return (
    <a
      href={lead.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-bas-gold/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
          {lead.origin === "market-radar" ? (
            <Radar size={12} className="shrink-0" />
          ) : (
            <Rss size={12} className="shrink-0" />
          )}
          <span className="truncate">{lead.sourceLabel}</span>
          <span>·</span>
          <span className="shrink-0">
            {formatDistanceToNow(new Date(lead.publishedAt), { addSuffix: true })}
          </span>
        </div>
        {lead.unverified && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-bas-gold/15 text-bas-gold border border-bas-gold/30">
            Unverified
          </span>
        )}
      </div>
      <h3 className="font-medium text-gray-50 mb-1 leading-snug">{lead.title}</h3>
      {lead.summary && <p className="text-sm text-gray-400 line-clamp-2">{lead.summary}</p>}
      <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
        <ExternalLink size={11} /> Open source
      </div>
    </a>
  );
}
