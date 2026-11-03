import { formatCost } from "@/lib/pipeline-data";
import type { AnalysisFallback, AnalysisStatus } from "./use-transcript-analysis";

/**
 * Right side of the Key points and Flow headers. Only shown over an existing
 * result: before the first one, each section's body shows the skeleton or the
 * error instead.
 */
export function AnalysisStatusNote({
  status,
  error,
  fallback,
}: {
  status: AnalysisStatus;
  error?: string;
  fallback?: AnalysisFallback;
}) {
  if (status === "loading") {
    return <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-600">Updating…</span>;
  }
  if (status === "error") {
    return (
      <span title={error} className="shrink-0 text-[11px] text-red-600 dark:text-red-400">
        Couldn&apos;t update
      </span>
    );
  }
  if (!fallback) return null;
  return (
    <span
      title={`The analysis model was unavailable, so ${fallback.agentName} wrote this at its own rate.`}
      className="min-w-0 truncate text-[11px] text-zinc-400 dark:text-zinc-600"
    >
      via {fallback.agentName} · {formatCost(fallback.cost)}
    </span>
  );
}
