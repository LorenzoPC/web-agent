import { MOCK_PIPELINE } from "@/lib/pipeline-data";
import { PipelineTab } from "./pipeline-tab";
import { RunHistory } from "./run-history";

export function PipelineApp() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Agent flows
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Describe your agent coworker job-to-be-done, its goals, information and get back a
          proposed agent flow, a model, tools, and data sources. Ready to run against local
          hardware, rented remote hardware, or a paid API, with projected vs. actual cost at
          every step.
        </p>
      </div>

      <PipelineTab initialSteps={MOCK_PIPELINE} />
      <RunHistory />
    </div>
  );
}
