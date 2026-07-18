import { SOURCE_TYPE_LABELS, actualCost, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import type { RunState } from "./types";

export function StepCard({
  step,
  run,
  disabled,
  onRun,
}: {
  step: PipelineStep;
  run: RunState;
  disabled: boolean;
  onRun: () => void;
}) {
  const isRunning = run.status === "running";

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-black dark:text-zinc-50">{step.name}</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {SOURCE_TYPE_LABELS[step.sourceType]}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{step.description}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{step.sourceLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-black dark:text-zinc-50">
            {run.status === "done" ? formatCost(actualCost(step, run.usage)) : formatCost(stepCost(step))}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-500">
            {run.status === "done" ? "actual" : "projected"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={disabled}
          className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {isRunning ? "Running…" : "Run"}
        </button>
        {run.status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">{run.message}</span>
        )}
      </div>

      {run.status === "done" && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {run.output}
        </pre>
      )}
    </li>
  );
}
