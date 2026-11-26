import { PickedMark } from "@/components/ui/pick-checkbox";
import type { PipelineStep } from "@/lib/types";
import { unbuilt } from "@/lib/unbuilt";
import { AGENTS_DEPARTMENTS_PICK } from "./agents-departments";

export function AgentCard({
  agent,
  selected,
  picked,
  onSelect,
}: {
  agent: PipelineStep;
  selected: boolean;
  /** Picked for the organization's Agents Departments: shows a check beside the name. */
  picked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      {...unbuilt("panel", "marketplace catalog API")}
      className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
        selected
          ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-medium text-black dark:text-zinc-50">{agent.name}</h3>
        {picked && <PickedMark label={AGENTS_DEPARTMENTS_PICK.picked} />}
      </span>
      {agent.role && (
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">{agent.role}</p>
      )}
    </button>
  );
}
