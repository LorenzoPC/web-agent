"use client";

import { useState } from "react";
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
 * signing up. Styled with the landing theme. Mockup: list prices only, no
 * discounts or plan allowances.
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
    <div className="flex flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="sr-only">Where it runs</legend>
        {options.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-steel-200 bg-white p-5 transition-colors hover:border-steel-400 has-checked:border-brand-700 has-checked:ring-1 has-checked:ring-brand-700 has-focus-visible:ring-2 has-focus-visible:ring-brand-400 dark:border-white/10 dark:bg-steel-900 dark:hover:border-white/30 dark:has-checked:border-brand-300 dark:has-checked:ring-brand-300"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="run-option"
                value={o.id}
                checked={o.id === optionId}
                onChange={() => setOptionId(o.id)}
                className="accent-brand-700 dark:accent-brand-300"
              />
              <span className="font-display text-lg font-bold">{o.label}</span>
            </span>
            <span className="text-sm text-steel-600 dark:text-steel-300">{o.description}</span>
            <dl className="mt-auto flex flex-col gap-2 border-t border-steel-100 pt-3 text-sm dark:border-white/10">
              <div>
                <dt className="text-xs text-steel-500 dark:text-steel-400">Models</dt>
                <dd>{o.models}</dd>
              </div>
              <div>
                <dt className="text-xs text-steel-500 dark:text-steel-400">Model costs</dt>
                <dd>{o.modelCosts}</dd>
              </div>
              <div>
                <dt className="text-xs text-steel-500 dark:text-steel-400">Price per {unit}</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                  {formatCost(o.perTask)}
                </dd>
              </div>
            </dl>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-end justify-between gap-6 rounded-2xl bg-brand-100 p-6 dark:bg-brand-950/50">
        <label className="flex w-48 flex-col gap-1.5">
          <span className="text-sm font-semibold">{units.charAt(0).toUpperCase() + units.slice(1)} per month</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={volumeInput}
            onChange={(e) => setVolumeInput(e.target.value)}
            className="w-full rounded-lg border border-steel-300 bg-white px-3 py-2.5 tabular-nums text-steel-950 dark:border-white/20 dark:bg-steel-900 dark:text-white"
          />
        </label>
        <div className="text-right" aria-live="polite">
          <p className="font-display text-4xl font-bold tabular-nums">
            {formatMonthly(volume * option.perTask)}
            <span className="font-body text-base font-normal text-steel-600 dark:text-steel-300"> per month</span>
          </p>
          <p className="text-sm text-steel-600 dark:text-steel-300">
            {volume.toLocaleString("en-US")} {volume === 1 ? unit : units} × {formatCost(option.perTask)} on{" "}
            {option.label.toLowerCase()}, {option.estimateNote}
          </p>
        </div>
      </div>
    </div>
  );
}
