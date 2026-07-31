import type { MockBusinessUnit, MockPrompt, MockTaskProcess } from "@/lib/mock-data";

export function PromptRow({
  prompt,
  businessUnits,
  taskProcesses,
  onEdit,
  onTest,
  onArchiveToggle,
}: {
  prompt: MockPrompt;
  businessUnits: MockBusinessUnit[];
  taskProcesses: MockTaskProcess[];
  onEdit: () => void;
  onTest: () => void;
  onArchiveToggle: () => void;
}) {
  const businessUnit = businessUnits.find((u) => u.id === prompt.businessUnitId);
  const taskProcess = taskProcesses.find((t) => t.id === prompt.taskProcessId);

  return (
    <li className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">{prompt.name}</h3>
          {prompt.archived && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Archived
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">{prompt.body}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {taskProcess && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {taskProcess.label}
            </span>
          )}
          {prompt.role && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Role: {prompt.role}
            </span>
          )}
          {businessUnit && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {businessUnit.name}
            </span>
          )}
          {!businessUnit && !prompt.role && !taskProcess && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">Unscoped</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        <button
          onClick={onTest}
          className="font-medium text-black hover:underline dark:text-zinc-50"
        >
          Test
        </button>
        <button onClick={onEdit} className="text-zinc-500 hover:underline dark:text-zinc-400">
          Edit
        </button>
        <button onClick={onArchiveToggle} className="text-zinc-500 hover:underline dark:text-zinc-400">
          {prompt.archived ? "Unarchive" : "Archive"}
        </button>
      </div>
    </li>
  );
}
