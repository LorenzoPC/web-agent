"use client";

import { useState } from "react";
import { INPUT_CLASS } from "@/components/tools/form-controls";
import { formatCost } from "@/lib/pipeline-data";
import type { RunOption } from "@/lib/mock-services-data";

export interface EstimatorOption extends RunOption {
  /** This service's price per task on this option, before any model costs billed elsewhere. */
  perTask: number;
}

function formatMonthly(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * Pick where the service runs and a monthly volume, and see the cost before
 * signing up. Mockup: list prices only, no discounts or plan allowances.
 */
export function CostEstimator({
  unit,
  units,
  typicalVolume,
  options,
}: {
  unit: string;
  units: string;
  typicalVolume: number;
  options: EstimatorOption[];
}) {
  const [optionId, setOptionId] = useState(options[0].id);
  const [volumeInput, setVolumeInput] = useState(String(typicalVolume));
  const option = options.find((o) => o.id === optionId) ?? options[0];
  const volume = Math.max(0, Math.floor(Number(volumeInput) || 0));

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Where it runs</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 has-checked:border-black has-checked:ring-1 has-checked:ring-black has-focus-visible:ring-2 has-focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:has-checked:border-white dark:has-checked:ring-white"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="run-option"
                value={o.id}
                checked={o.id === optionId}
                onChange={() => setOptionId(o.id)}
                className="accent-black dark:accent-white"
              />
              <span className="text-sm font-medium text-black dark:text-zinc-50">{o.label}</span>
            </span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">{o.description}</span>
            <dl className="mt-auto flex flex-col gap-1 border-t border-zinc-100 pt-2 text-xs dark:border-zinc-900">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Models</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">{o.models}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Model costs</dt>
                <dd className="text-right text-zinc-700 dark:text-zinc-300">{o.modelCosts}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Price per {unit}</dt>
                <dd className="font-medium tabular-nums text-black dark:text-zinc-50">{formatCost(o.perTask)}</dd>
              </div>
            </dl>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="flex w-48 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {units.charAt(0).toUpperCase() + units.slice(1)} per month
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={volumeInput}
            onChange={(e) => setVolumeInput(e.target.value)}
            className={`${INPUT_CLASS} tabular-nums`}
          />
        </label>
        <div className="text-right" aria-live="polite">
          <p className="text-2xl font-semibold tabular-nums text-black dark:text-zinc-50">
            {formatMonthly(volume * option.perTask)}
            <span className="text-sm font-normal text-zinc-500"> per month</span>
          </p>
          <p className="text-xs text-zinc-500">
            {volume.toLocaleString("en-US")} {volume === 1 ? unit : units} × {formatCost(option.perTask)} on{" "}
            {option.label.toLowerCase()}, {option.estimateNote}
          </p>
        </div>
      </div>
    </div>
  );
}
