import type { PipelineStep } from "@/lib/types";

export function AgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: PipelineStep;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      }`}
    >
      <h3 className="truncate text-sm font-medium text-black dark:text-zinc-50">{agent.name}</h3>
      {agent.role && (
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">{agent.role}</p>
      )}
    </button>
  );
}
