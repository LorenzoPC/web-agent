import { formatCost } from "@/lib/pipeline-data";
import type { MockRun, MockRunStatus } from "@/lib/mock-data";

const STATUS_STYLES: Record<MockRunStatus, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  error: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ResultsSection({ runs }: { runs: MockRun[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Results</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">Recent pipeline runs.</p>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          No results yet. Run a pipeline from the Builder to see it appear here.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {runs.map((run) => (
            <li
              key={run.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-black dark:text-zinc-50">
                  {run.rootInput}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {formatTimestamp(run.completedAt)} · {run.stepCount} steps
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium text-black dark:text-zinc-50">
                  {formatCost(run.totalCostUsd)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[run.status]}`}
                >
                  {run.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
