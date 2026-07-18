"use client";

import { useState } from "react";
import { MOCK_PIPELINE } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { EcosystemTab } from "./ecosystem-tab";
import { HistoryTab } from "./history-tab";
import { PipelineTab } from "./pipeline-tab";

const TABS = ["Ecosystem", "Pipeline", "History"] as const;
type Tab = (typeof TABS)[number];

export function PipelineApp() {
  const [tab, setTab] = useState<Tab>("Ecosystem");
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(MOCK_PIPELINE);

  function handleBuildFlow(steps: PipelineStep[]) {
    setPipelineSteps(steps);
    setTab("Pipeline");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Pipeline
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Describe a challenge to build a flow, then run each step against local hardware,
          rented remote hardware, or a paid API, and compare projected vs. actual cost.
        </p>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-black text-black dark:border-white dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Ecosystem" && <EcosystemTab onBuildFlow={handleBuildFlow} />}
      {tab === "Pipeline" && <PipelineTab key={pipelineSteps.map((s) => s.id).join(",")} steps={pipelineSteps} />}
      {tab === "History" && <HistoryTab />}
    </div>
  );
}
