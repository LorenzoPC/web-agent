import type { MockFlowPattern } from "@/lib/mock-data";

export function PatternCard({
  pattern,
  expanded,
  onToggle,
}: {
  pattern: MockFlowPattern;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">{pattern.name}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {pattern.slots.length} {pattern.slots.length === 1 ? "step" : "steps"}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{pattern.description}</p>
      </button>

      {expanded && (
        <ol className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {pattern.slots.map((slot, index) => (
            <li key={slot.taskLabel} className="text-xs">
              <span className="font-medium text-black dark:text-zinc-50">
                {index + 1}. {slot.taskLabel}
              </span>
              <p className="mt-0.5 text-zinc-500 dark:text-zinc-500">{slot.defaultInstructions}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
