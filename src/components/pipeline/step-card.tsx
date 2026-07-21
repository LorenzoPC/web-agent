import { SOURCE_TYPE_LABELS, actualCost, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { SelectableCard } from "./selectable-card";
import type { RunState } from "./types";

export function StepCard({
  step,
  run,
  disabled,
  focused,
  onFocus,
  onRun,
}: {
  step: PipelineStep;
  run: RunState;
  disabled: boolean;
  focused: boolean;
  onFocus: () => void;
  onRun: () => void;
}) {
  const isRunning = run.status === "running";

  return (
    <SelectableCard
      as="li"
      selected={focused}
      onSelect={onFocus}
      header={
        <div className="flex flex-col gap-0.5">
          <h2
            className={`truncate font-medium text-black dark:text-zinc-50 ${
              focused ? "text-sm" : "text-xs"
            }`}
          >
            {step.name}
          </h2>
          <div className="flex items-center justify-between gap-1">
            <span
              className={`shrink-0 font-medium text-black dark:text-zinc-50 ${
                focused ? "text-xs" : "text-[10px]"
              }`}
            >
              {run.status === "done" ? formatCost(actualCost(step, run.usage)) : formatCost(stepCost(step))}
            </span>
            <span
              className={`min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500 ${
                focused ? "text-xs" : "text-[10px]"
              }`}
            >
              {SOURCE_TYPE_LABELS[step.sourceType]}
            </span>
          </div>
        </div>
      }
    >
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
        {run.status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">{run.message}</span>
        )}
      </div>

      {run.status === "done" && (
        <pre className="mt-3 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {run.output}
        </pre>
      )}
    </SelectableCard>
  );
}
