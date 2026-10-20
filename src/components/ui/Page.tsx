import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, type LucideIcon } from "lucide-react";

export function Page({ children, width = "max-w-3xl" }: { children: ReactNode; width?: string }) {
  return <div className={`page-enter mx-auto w-full ${width} px-4 py-8 sm:px-8`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-50">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-bas-gold/10 text-bas-gold">
        <Icon size={20} />
      </div>
      <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3">
      <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-red-200/90">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-red-100">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
