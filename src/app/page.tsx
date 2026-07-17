"use client";

import { useState } from "react";
import {
  MOCK_PIPELINE,
  SOURCE_TYPE_LABELS,
  actualCost,
  formatCost,
  stepCost,
  totalCost,
} from "@/lib/pipeline-data";
import type { ActualUsage } from "@/lib/types";

type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; output: string; usage: ActualUsage }
  | { status: "error"; message: string };

export default function Home() {
  const [input, setInput] = useState(
    "Summarize the latest deployment status for this project.",
  );
  const [runs, setRuns] = useState<Record<string, RunState>>({});

  async function runStep(stepId: string) {
    setRuns((prev) => ({ ...prev, [stepId]: { status: "running" } }));
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, input }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setRuns((prev) => ({
        ...prev,
        [stepId]: { status: "done", output: data.output, usage: data.usage },
      }));
    } catch (error) {
      setRuns((prev) => ({
        ...prev,
        [stepId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Step failed",
        },
      }));
    }
  }

  const runningTotal = MOCK_PIPELINE.reduce((sum, step) => {
    const run = runs[step.id];
    if (run?.status === "done") {
      return sum + actualCost(step, run.usage);
    }
    return sum + stepCost(step);
  }, 0);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col gap-8 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Pipeline
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Run each step against local hardware, rented remote hardware, or a paid API, and
            compare projected vs. actual cost.
          </p>
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />

        <ul className="flex flex-col gap-4">
          {MOCK_PIPELINE.map((step) => {
            const run = runs[step.id] ?? { status: "idle" };
            const isRunning = run.status === "running";
            return (
              <li
                key={step.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium text-black dark:text-zinc-50">{step.name}</h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {SOURCE_TYPE_LABELS[step.sourceType]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {step.description}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {step.sourceLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-black dark:text-zinc-50">
                      {run.status === "done"
                        ? formatCost(actualCost(step, run.usage))
                        : formatCost(stepCost(step))}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      {run.status === "done" ? "actual" : "projected"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => runStep(step.id)}
                    disabled={isRunning}
                    className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    {isRunning ? "Running…" : "Run"}
                  </button>
                  {run.status === "error" && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {run.message}
                    </span>
                  )}
                </div>

                {run.status === "done" && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {run.output}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Running total</span>
          <span className="text-sm font-semibold text-black dark:text-zinc-50">
            {formatCost(runningTotal)}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Projected total: {formatCost(totalCost(MOCK_PIPELINE))}
        </p>
      </main>
    </div>
  );
}
