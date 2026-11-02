import { SOURCE_TYPE_LABELS, actualCost, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import type { RunState } from "./types";

function stepCostLabel(step: PipelineStep, run: RunState) {
  return run.status === "done" ? formatCost(actualCost(step, run.usage)) : formatCost(stepCost(step));
}

const RUN_STATUS_LABELS: Partial<Record<RunState["status"], string>> = {
  running: "Running…",
  done: "Done",
  error: "Error",
};

/** Compact card for the steps grid. */
export function StepCard({ step, index, run }: { step: PipelineStep; index: number; run: RunState }) {
  const statusLabel = RUN_STATUS_LABELS[run.status];

  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
        <span>Step {index + 1}</span>
        {statusLabel && (
          <span className={run.status === "error" ? "text-red-600 dark:text-red-400" : undefined}>
            {statusLabel}
          </span>
        )}
      </p>
      <h3 className="truncate text-sm font-medium text-black dark:text-zinc-50">{step.name}</h3>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="shrink-0 font-medium text-black dark:text-zinc-50">{stepCostLabel(step, run)}</span>
        <span className="min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500">
          {SOURCE_TYPE_LABELS[step.sourceType]}
        </span>
      </div>
    </div>
  );
}

/** Full details for the display card, with the step's actions. */
export function StepDetails({
  step,
  index,
  total,
  run,
  disabled,
  onRun,
  onRemove,
}: {
  step: PipelineStep;
  index: number;
  total: number;
  run: RunState;
  disabled: boolean;
  onRun: () => void;
  onRemove: () => void;
}) {
  const isRunning = run.status === "running";

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
        Step {index + 1} of {total}
      </p>
      <h3 className="font-medium text-black dark:text-zinc-50">{step.name}</h3>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="shrink-0 font-medium text-black dark:text-zinc-50">{stepCostLabel(step, run)}</span>
        <span className="min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500">
          {SOURCE_TYPE_LABELS[step.sourceType]}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{step.description}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{step.sourceLabel}</p>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onRun}
          disabled={disabled}
          className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {isRunning ? "Running…" : "Run"}
        </button>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-xs text-zinc-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
        >
          Remove
        </button>
      </div>

      {run.status === "error" && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{run.message}</p>
      )}
      {run.status === "done" && (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {run.output}
        </pre>
      )}
    </div>
  );
}
