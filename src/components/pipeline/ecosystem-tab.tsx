"use client";

import { useState } from "react";
import { SOURCE_TYPE_LABELS, formatCost, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import type { BlockType } from "@/lib/block-catalog";
import { SelectableCard } from "./selectable-card";

type BlockResult = {
  blockType: BlockType;
  rationale: string;
  options: PipelineStep[];
};

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; blocks: BlockResult[] }
  | { status: "error"; message: string };

export function EcosystemTab({ onBuildFlow }: { onBuildFlow: (steps: PipelineStep[]) => void }) {
  const [challenge, setChallenge] = useState(
    "I want a daily summary of game results for American basketball, in email format.",
  );
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [selected, setSelected] = useState<Record<BlockType, string>>(
    {} as Record<BlockType, string>,
  );

  async function analyze() {
    setAnalysis({ status: "loading" });
    try {
      const res = await fetch("/api/ecosystem/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const blocks: BlockResult[] = data.blocks;
      setAnalysis({ status: "done", blocks });
      setSelected(
        Object.fromEntries(
          blocks.map((block) => [block.blockType, block.options[0]?.id]),
        ) as Record<BlockType, string>,
      );
    } catch (error) {
      setAnalysis({
        status: "error",
        message: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  }

  function buildFlow() {
    if (analysis.status !== "done") return;
    const steps = analysis.blocks
      .map((block) => block.options.find((o) => o.id === selected[block.blockType]))
      .filter((s): s is PipelineStep => s != null);
    onBuildFlow(steps);
  }

  const allSelected =
    analysis.status === "done" && analysis.blocks.every((b) => selected[b.blockType]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Describe your challenge
        </label>
        <textarea
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <button
        onClick={analyze}
        disabled={analysis.status === "loading" || challenge.trim() === ""}
        className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {analysis.status === "loading" ? "Analyzing…" : "Analyze"}
      </button>

      {analysis.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{analysis.message}</p>
      )}

      {analysis.status === "done" && (
        <div className="flex flex-col gap-8">
          {analysis.blocks.map((block) => (
            <div key={block.blockType} className="flex flex-col gap-3">
              <div>
                <h2 className="font-medium text-black capitalize dark:text-zinc-50">
                  {block.blockType.replace("-", " ")}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">{block.rationale}</p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {block.options.map((option) => {
                  const isSelected = selected[block.blockType] === option.id;
                  return (
                    <SelectableCard
                      key={option.id}
                      selected={isSelected}
                      onSelect={() =>
                        setSelected((prev) => ({ ...prev, [block.blockType]: option.id }))
                      }
                      header={
                        <div className="flex flex-col gap-0.5">
                          <h3
                            className={`truncate font-medium text-black dark:text-zinc-50 ${
                              isSelected ? "text-sm" : "text-xs"
                            }`}
                          >
                            {option.name}
                          </h3>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`shrink-0 font-medium text-black dark:text-zinc-50 ${
                                isSelected ? "text-xs" : "text-[10px]"
                              }`}
                            >
                              {formatCost(stepCost(option))}
                            </span>
                            <span
                              className={`min-w-0 truncate text-right text-zinc-500 dark:text-zinc-500 ${
                                isSelected ? "text-xs" : "text-[10px]"
                              }`}
                            >
                              {SOURCE_TYPE_LABELS[option.sourceType]}
                            </span>
                          </div>
                        </div>
                      }
                    >
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        {option.description}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                        {option.sourceLabel}
                      </p>
                    </SelectableCard>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={buildFlow}
            disabled={!allSelected}
            className="w-full rounded-lg border border-black px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-zinc-900"
          >
            Build flow
          </button>
        </div>
      )}
    </div>
  );
}
