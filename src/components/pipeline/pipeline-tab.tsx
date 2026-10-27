"use client";

import { useState } from "react";
import { actualCost, formatCost, stepCost, totalCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { ExplorePanel } from "./explore-panel";
import { ModelTypePicker } from "./model-type-picker";
import { StepCard } from "./step-card";
import type { RunState } from "./types";

type StepResult = Extract<RunState, { status: "done" | "error" }>;

async function callStep(step: PipelineStep, input: string): Promise<StepResult> {
  try {
    const res = await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, input }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return { status: "done", output: data.output, usage: data.usage };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Step failed",
    };
  }
}

export function PipelineTab({
  initialSteps,
  initialInput,
  successCriteria,
  onExplore,
}: {
  initialSteps: PipelineStep[];
  initialInput?: string;
  successCriteria?: string;
  onExplore: (idea: string) => void;
}) {
  const [steps, setSteps] = useState(initialSteps);
  const [input, setInput] = useState(initialInput ?? "");
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [isChainRunning, setIsChainRunning] = useState(false);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(steps[0]?.id ?? null);
  const [exploredIdea, setExploredIdea] = useState<string | null>(null);

  // Suffixed id so the same model can be added more than once without colliding run state.
  function addStep(option: PipelineStep) {
    const step = { ...option, id: `${option.id}:${crypto.randomUUID().slice(0, 8)}` };
    setSteps((prev) => [...prev, step]);
    setFocusedStepId(step.id);
  }

  async function runStep(step: PipelineStep) {
    setRuns((prev) => ({ ...prev, [step.id]: { status: "running" } }));
    const result = await callStep(step, input);
    setRuns((prev) => ({ ...prev, [step.id]: result }));
  }

  async function runPipeline() {
    setIsChainRunning(true);
    setRuns({});
    let chainInput = input;
    for (const step of steps) {
      setRuns((prev) => ({ ...prev, [step.id]: { status: "running" } }));
      const result = await callStep(step, chainInput);
      setRuns((prev) => ({ ...prev, [step.id]: result }));
      if (result.status === "error") break;
      chainInput = result.output;
    }
    setIsChainRunning(false);
  }

  const runningTotal = steps.reduce((sum, step) => {
    const run = runs[step.id];
    if (run?.status === "done") {
      return sum + actualCost(step, run.usage);
    }
    return sum + stepCost(step);
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Describe what you have in mind that an AI agent could help you with."
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-600"
        />
        <button
          onClick={() => setExploredIdea(input.trim())}
          disabled={input.trim() === ""}
          className="w-full rounded-lg border border-black px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-zinc-900"
        >
          Explore how to build this
        </button>
      </div>

      {exploredIdea && (
        <ExplorePanel
          idea={exploredIdea}
          disabled={isChainRunning}
          onAdd={addStep}
          onOpenEcosystem={() => onExplore(exploredIdea)}
          onClose={() => setExploredIdea(null)}
        />
      )}

      {successCriteria && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Success criteria</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {successCriteria}
          </p>
        </div>
      )}

      <ul className="flex flex-wrap items-start gap-3">
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            run={runs[step.id] ?? { status: "idle" }}
            disabled={isChainRunning || runs[step.id]?.status === "running"}
            focused={focusedStepId === step.id}
            onFocus={() => setFocusedStepId(step.id)}
            onRun={() => runStep(step)}
          />
        ))}
      </ul>

      <button
        onClick={runPipeline}
        disabled={isChainRunning || input.trim() === ""}
        className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isChainRunning ? "Running pipeline…" : "Run pipeline"}
      </button>

      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Running total</span>
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          {formatCost(runningTotal)}
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Projected total: {formatCost(totalCost(steps))}
      </p>

      <ModelTypePicker disabled={isChainRunning} onAdd={addStep} />
    </div>
  );
}
