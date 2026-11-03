"use client";

import { useState } from "react";
import { MOCK_MODEL_TYPE_GROUPS, type MockModelOption } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { DisplayGrid } from "./display-grid";

function CostAndSource({ option }: { option: MockModelOption }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="shrink-0 font-medium text-black dark:text-zinc-50">
        {formatCost(stepCost(option))}
      </span>
      <span className="min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500">
        {SOURCE_TYPE_LABELS[option.sourceType]}
      </span>
    </div>
  );
}

function BestFor({ option, clamp }: { option: MockModelOption; clamp?: boolean }) {
  return (
    <p className={`text-xs text-zinc-500 dark:text-zinc-500 ${clamp ? "line-clamp-2" : ""}`}>
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Best for:</span>{" "}
      {option.bestFor}
    </p>
  );
}

/** Compact card for a model type's grid. */
function ModelCard({ option }: { option: MockModelOption }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h4 className="truncate text-sm font-medium text-black dark:text-zinc-50">{option.name}</h4>
      <CostAndSource option={option} />
      <BestFor option={option} clamp />
    </div>
  );
}

/** Full details for the display card, with Add to pipeline. */
function ModelDetails({
  option,
  disabled,
  onAdd,
}: {
  option: MockModelOption;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h4 className="font-medium text-black dark:text-zinc-50">{option.name}</h4>
      <CostAndSource option={option} />
      <BestFor option={option} />
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{option.description}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        {option.sourceLabel} · per {option.unit}
      </p>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="mt-3 self-start rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Add to pipeline
      </button>
    </div>
  );
}

export function ModelTypePicker({
  id,
  disabled,
  onAdd,
}: {
  id?: string;
  disabled: boolean;
  onAdd: (option: PipelineStep) => void;
}) {
  // One selection per model type, so each display card keeps its own pick.
  const [selectedIds, setSelectedIds] = useState<Record<string, string>>({});

  return (
    <div
      id={id}
      className="flex scroll-mt-6 flex-col gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Add a model step</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Mock options grouped by model type. Hover a card to preview it, click to select it.
          Text models run through the real pipeline route; image, voice, and video steps
          aren&apos;t wired yet and return a stub when run.
        </p>
      </div>

      {MOCK_MODEL_TYPE_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-zinc-50">{group.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{group.description}</p>
          </div>
          <DisplayGrid
            items={group.options}
            selectedId={selectedIds[group.id] ?? null}
            onSelect={(id) => setSelectedIds((prev) => ({ ...prev, [group.id]: id }))}
            renderCard={(option) => <ModelCard option={option} />}
            renderDisplay={(option) => (
              <ModelDetails option={option} disabled={disabled} onAdd={() => onAdd(option)} />
            )}
          />
        </div>
      ))}
    </div>
  );
}
