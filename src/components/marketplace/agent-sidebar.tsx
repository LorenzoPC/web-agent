import { SOURCE_TYPE_LABELS, formatCostModel } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";

export function AgentSidebar({ agent, onClose }: { agent: PipelineStep | null; onClose: () => void }) {
  if (!agent) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">{agent.name}</h2>
            {agent.role && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{agent.role}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
            <span>{SOURCE_TYPE_LABELS[agent.sourceType]}</span>
            <span>{agent.sourceLabel}</span>
            <span>{formatCostModel(agent.cost)}</span>
          </div>

          <p className="text-sm text-zinc-700 dark:text-zinc-300">{agent.description}</p>

          {agent.systemPrompt && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-500">System prompt</h3>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {agent.systemPrompt}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
