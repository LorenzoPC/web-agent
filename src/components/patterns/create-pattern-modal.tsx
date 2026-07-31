"use client";

import { useState } from "react";
import type { MockFlowPattern, MockPatternSlot } from "@/lib/mock-data";

const EMPTY_SLOT: MockPatternSlot = { taskLabel: "", defaultInstructions: "" };

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `custom:${base || "pattern"}-${Date.now()}`;
}

export function CreatePatternModal({
  onCreate,
  onClose,
}: {
  onCreate: (pattern: MockFlowPattern) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<MockPatternSlot[]>([{ ...EMPTY_SLOT }]);

  const canSubmit = name.trim() !== "" && slots.some((s) => s.taskLabel.trim() !== "");

  function updateSlot(index: number, patch: Partial<MockPatternSlot>) {
    setSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { ...EMPTY_SLOT }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onCreate({
      id: slugify(name),
      name: name.trim(),
      description: description.trim(),
      slots: slots
        .filter((s) => s.taskLabel.trim() !== "")
        .map((s) => ({ taskLabel: s.taskLabel.trim(), defaultInstructions: s.defaultInstructions.trim() })),
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
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Create a Flow Pattern</h2>
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
              placeholder="e.g. Research → Synthesize"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this pattern for?"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Steps</label>
            <div className="mt-2 flex flex-col gap-3">
              {slots.map((slot, index) => (
                <div key={index} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                      Step {index + 1}
                    </span>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSlot(index)}
                        className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={slot.taskLabel}
                    onChange={(e) => updateSlot(index, { taskLabel: e.target.value })}
                    placeholder="Task label, e.g. Research the topic"
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                  <textarea
                    value={slot.defaultInstructions}
                    onChange={(e) => updateSlot(index, { defaultInstructions: e.target.value })}
                    rows={2}
                    placeholder="Default instructions for this step"
                    className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addSlot}
                className="rounded-lg border border-dashed border-zinc-300 py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
              >
                + Add step
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Create pattern
          </button>
        </div>
      </div>
    </div>
  );
}
