import { Search, ExternalLink } from "lucide-react";
import type { ResearchResult } from "@/types";

const badgeStyles: Record<string, string> = {
  yes: "bg-green-500/15 text-green-400 border-green-500/30",
  maybe: "bg-bas-gold/15 text-bas-gold border-bas-gold/30",
  no: "bg-gray-700/30 text-gray-400 border-gray-700",
};

const badgeLabel: Record<string, string> = {
  yes: "Worth writing",
  maybe: "Maybe",
  no: "Skip for now",
};

export default function ResearchCard({ result }: { result: ResearchResult }) {
  if (result.raw) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-sm text-gray-300">
        <p className="mb-2">{result.overview}</p>
        <p className="text-gray-500 whitespace-pre-wrap text-xs">{result.raw}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-50">{result.query}</h3>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full border ${
            badgeStyles[result.writeworthy] || badgeStyles.maybe
          }`}
        >
          {badgeLabel[result.writeworthy] || "Maybe"}
        </span>
      </div>

      {result.overview && <p className="text-sm text-gray-300">{result.overview}</p>}

      {result.recentActivity && (
        <Section label="Recent activity" text={result.recentActivity} />
      )}

      {result.existingCoverage && (
        <Section label="Existing coverage" text={result.existingCoverage} />
      )}

      {result.recommendation && <Section label="Recommendation" text={result.recommendation} />}

      {result.suggestedAngle && (
        <div className="bg-black/40 border border-bas-gold/20 rounded-lg p-3">
          <p className="text-xs uppercase tracking-wide text-bas-gold mb-1">Suggested angle</p>
          <p className="text-sm text-gray-100">{result.suggestedAngle}</p>
        </div>
      )}

      {result.sources?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 flex items-center gap-1">
            <Search size={12} /> Sources
          </p>
          <ul className="flex flex-col gap-1">
            {result.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-bas-gold flex items-center gap-1"
                >
                  <ExternalLink size={11} className="shrink-0" />
                  <span className="truncate">{s.title || s.url}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-300">{text}</p>
    </div>
  );
}
