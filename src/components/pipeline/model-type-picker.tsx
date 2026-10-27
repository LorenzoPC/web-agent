"use client";

import { useState } from "react";
import { MOCK_MODEL_TYPE_GROUPS, type MockModelOption } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { SelectableCard } from "./selectable-card";

function ModelOptionCard({
  option,
  selected,
  disabled,
  onSelect,
  onAdd,
}: {
  option: MockModelOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <SelectableCard
      as="li"
      selected={selected}
      onSelect={onSelect}
      header={
        <div className="flex flex-col gap-0.5">
          <h4
            className={`truncate font-medium text-black dark:text-zinc-50 ${selected ? "text-sm" : "text-xs"}`}
          >
            {option.name}
          </h4>
          <div className="flex items-center justify-between gap-1">
            <span
              className={`shrink-0 font-medium text-black dark:text-zinc-50 ${selected ? "text-xs" : "text-[10px]"}`}
            >
              {formatCost(stepCost(option))}
            </span>
            <span
              className={`min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500 ${selected ? "text-xs" : "text-[10px]"}`}
            >
              {SOURCE_TYPE_LABELS[option.sourceType]}
            </span>
          </div>
          <p className={`text-zinc-500 dark:text-zinc-500 ${selected ? "text-xs" : "text-[10px]"}`}>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Best for:</span>{" "}
            {option.bestFor}
          </p>
        </div>
      }
    >
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{option.description}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        {option.sourceLabel} · per {option.unit}
      </p>
      <button
        onClick={onAdd}
        disabled={disabled}
        className="mt-3 rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        Add to pipeline
      </button>
    </SelectableCard>
  );
}

export function ModelTypePicker({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (option: PipelineStep) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Add a model step</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Mock options grouped by model type. Text models run through the real pipeline route;
          image, voice, and video steps aren&apos;t wired yet and return a stub when run.
        </p>
      </div>

      {MOCK_MODEL_TYPE_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-zinc-50">{group.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{group.description}</p>
          </div>
          <ul className="flex flex-wrap items-start gap-3">
            {group.options.map((option) => (
              <ModelOptionCard
                key={option.id}
                option={option}
                selected={selectedId === option.id}
                disabled={disabled}
                onSelect={() => setSelectedId(option.id)}
                onAdd={() => onAdd(option)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
