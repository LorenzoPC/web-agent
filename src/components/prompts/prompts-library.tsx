"use client";

import { useMemo, useState } from "react";
import { CreateNewCard } from "@/components/ui/create-new-card";
import type { MockBusinessUnit, MockPrompt, MockTaskProcess } from "@/lib/mock-data";
import type { PipelineStep } from "@/lib/types";
import { PromptFormModal } from "./prompt-form-modal";
import { PromptRow } from "./prompt-row";
import { PromptTestModal } from "./prompt-test-modal";

export function PromptsLibrary({
  prompts: initialPrompts,
  businessUnits,
  taskProcesses,
  roles,
  agents,
}: {
  prompts: MockPrompt[];
  businessUnits: MockBusinessUnit[];
  taskProcesses: MockTaskProcess[];
  roles: string[];
  agents: PipelineStep[];
}) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [businessUnitFilter, setBusinessUnitFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [taskProcessFilter, setTaskProcessFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<MockPrompt | "new" | null>(null);
  const [testingPrompt, setTestingPrompt] = useState<MockPrompt | null>(null);

  const scopedTaskProcesses = businessUnitFilter
    ? taskProcesses.filter((t) => t.businessUnitId === businessUnitFilter)
    : taskProcesses;

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      if (!showArchived && p.archived) return false;
      if (businessUnitFilter && p.businessUnitId !== businessUnitFilter) return false;
      if (roleFilter && p.role !== roleFilter) return false;
      if (taskProcessFilter && p.taskProcessId !== taskProcessFilter) return false;
      return true;
    });
  }, [prompts, showArchived, businessUnitFilter, roleFilter, taskProcessFilter]);

  function handleSave(prompt: MockPrompt) {
    setPrompts((prev) => {
      const exists = prev.some((p) => p.id === prompt.id);
      return exists ? prev.map((p) => (p.id === prompt.id ? prompt : p)) : [prompt, ...prev];
    });
    setEditingPrompt(null);
  }

  function toggleArchive(id: string) {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Business unit</label>
          <select
            value={businessUnitFilter}
            onChange={(e) => {
              setBusinessUnitFilter(e.target.value);
              setTaskProcessFilter("");
            }}
            className="mt-1 rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All</option>
            {businessUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Task/process</label>
          <select
            value={taskProcessFilter}
            onChange={(e) => setTaskProcessFilter(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All</option>
            {scopedTaskProcesses.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <CreateNewCard label="Create new prompt" onClick={() => setEditingPrompt("new")} />
        {filteredPrompts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
            No prompts match these filters.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filteredPrompts.map((prompt) => (
              <PromptRow
                key={prompt.id}
                prompt={prompt}
                businessUnits={businessUnits}
                taskProcesses={taskProcesses}
                onEdit={() => setEditingPrompt(prompt)}
                onTest={() => setTestingPrompt(prompt)}
                onArchiveToggle={() => toggleArchive(prompt.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {editingPrompt && (
        <PromptFormModal
          initialPrompt={editingPrompt === "new" ? undefined : editingPrompt}
          businessUnits={businessUnits}
          taskProcesses={taskProcesses}
          roles={roles}
          onSave={handleSave}
          onClose={() => setEditingPrompt(null)}
        />
      )}

      {testingPrompt && (
        <PromptTestModal prompt={testingPrompt} agents={agents} onClose={() => setTestingPrompt(null)} />
      )}
    </div>
  );
}
