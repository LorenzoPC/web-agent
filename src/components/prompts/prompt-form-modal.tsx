"use client";

import { useState } from "react";
import type { MockBusinessUnit, MockPrompt, MockTaskProcess } from "@/lib/mock-data";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function PromptFormModal({
  initialPrompt,
  businessUnits,
  taskProcesses,
  roles,
  onSave,
  onClose,
}: {
  initialPrompt?: MockPrompt;
  businessUnits: MockBusinessUnit[];
  taskProcesses: MockTaskProcess[];
  roles: string[];
  onSave: (prompt: MockPrompt) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialPrompt?.name ?? "");
  const [body, setBody] = useState(initialPrompt?.body ?? "");
  const [businessUnitId, setBusinessUnitId] = useState(initialPrompt?.businessUnitId ?? "");
  const [role, setRole] = useState(initialPrompt?.role ?? "");
  const [taskProcessId, setTaskProcessId] = useState(initialPrompt?.taskProcessId ?? "");

  const canSubmit = name.trim() !== "" && body.trim() !== "";
  const scopedTaskProcesses = businessUnitId
    ? taskProcesses.filter((t) => t.businessUnitId === businessUnitId)
    : taskProcesses;

  function handleBusinessUnitChange(next: string) {
    setBusinessUnitId(next);
    // Reset the task/process if it no longer belongs to the newly-chosen business unit.
    if (taskProcessId && !taskProcesses.find((t) => t.id === taskProcessId && t.businessUnitId === next)) {
      setTaskProcessId("");
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSave({
      id: initialPrompt?.id ?? `custom:${slugify(name)}-${Date.now()}`,
      name: name.trim(),
      body: body.trim(),
      businessUnitId: businessUnitId || undefined,
      role: role || undefined,
      taskProcessId: taskProcessId || undefined,
      archived: initialPrompt?.archived ?? false,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {initialPrompt ? "Edit prompt" : "Create a prompt"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Not persisted yet — this draft only lives in this browser session.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. First-response draft"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prompt body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="The task instructions this prompt provides…"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Scope <span className="font-normal text-zinc-400 dark:text-zinc-600">(optional — broader scopes act as a fallback when nothing more specific matches)</span>
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={businessUnitId}
                onChange={(e) => handleBusinessUnitChange(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Business unit — any</option>
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Role — any</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={taskProcessId}
                onChange={(e) => setTaskProcessId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Task/process — any</option>
                {scopedTaskProcesses.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {initialPrompt ? "Save changes" : "Create prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
