import { MOCK_MODEL_TYPE_GROUPS } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCost, stepCost, totalCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";

/** Mock proposal: keyword-match the idea against each model type, suggesting that group's first option. */
function proposeFlow(idea: string) {
  const text = idea.toLowerCase();
  return MOCK_MODEL_TYPE_GROUPS.filter(
    (group) => group.keywords.length === 0 || group.keywords.some((k) => text.includes(k)),
  ).map((group) => ({ group, model: group.options[0] }));
}

export function ExplorePanel({
  idea,
  disabled,
  onAdd,
  onOpenEcosystem,
  onClose,
}: {
  idea: string;
  disabled: boolean;
  onAdd: (option: PipelineStep) => void;
  onOpenEcosystem: () => void;
  onClose: () => void;
}) {
  const proposal = proposeFlow(idea);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-black dark:text-zinc-50">How to build this</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">“{idea}”</p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Hide
        </button>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {proposal.map(({ group, model }, i) => (
          <li
            key={group.id}
            className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                Step {i + 1} · {group.title}
              </p>
              <p className="text-sm font-medium text-black dark:text-zinc-50">{group.stepLabel}</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                {model.name} · {formatCost(stepCost(model))} · {SOURCE_TYPE_LABELS[model.sourceType]}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Best for:</span>{" "}
                {model.bestFor}
              </p>
            </div>
            <button
              onClick={() => onAdd(model)}
              disabled={disabled}
              className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Add
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          Estimated: {formatCost(totalCost(proposal.map((p) => p.model)))} per run
        </span>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenEcosystem}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            Full analysis in Ecosystem →
          </button>
          <button
            onClick={() => proposal.forEach((p) => onAdd(p.model))}
            disabled={disabled}
            className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Add all to pipeline
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-600">
        Mock proposal matched from keywords in your description — not an AI analysis yet.
      </p>
    </section>
  );
}
