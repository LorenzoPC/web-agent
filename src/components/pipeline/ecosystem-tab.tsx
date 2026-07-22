"use client";

import { useState } from "react";
import type { BlockType } from "@/lib/block-catalog";
import type { CatalogCard } from "@/lib/catalog-db";
import { SOURCE_TYPE_LABELS, formatCost, stepCost } from "@/lib/pipeline-data";
import type { CostModel, PipelineStep } from "@/lib/types";
import { SelectableCard } from "./selectable-card";

const LOCAL_RAG_ID = "curated:rag-local-documents";

type Group<T> = { rationale: string; allOptions: T[]; recommendedIds: string[] };

type AnalysisResult = {
  refinedGoal: string;
  successCriteria: string;
  blocks: { blockType: BlockType; rationale: string; allOptions: PipelineStep[]; recommendedIds: string[] }[];
  agent: Group<PipelineStep>;
  tools: Group<CatalogCard>;
  mcpServers: Group<CatalogCard>;
  ragSources: Group<CatalogCard>;
};

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: AnalysisResult }
  | { status: "error"; message: string };

function formatCostModel(cost: CostModel): string {
  switch (cost.kind) {
    case "free":
      return "Free";
    case "duration":
      return `${formatCost(cost.dollarsPerHour)}/hr`;
    case "tokens":
      return `${formatCost(cost.inputPerMillion)}/M in · ${formatCost(cost.outputPerMillion)}/M out`;
    case "perRequest":
      return `${formatCost(cost.dollarsPerRequest)}/req`;
  }
}

const BLOCK_TITLES: Record<string, string> = {
  "data-source": "Data Source",
  delivery: "Delivery",
};

function StepOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: PipelineStep;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <SelectableCard
      selected={selected}
      onSelect={onSelect}
      header={
        <div className="flex flex-col gap-0.5">
          <h3
            className={`truncate font-medium text-black dark:text-zinc-50 ${selected ? "text-sm" : "text-xs"}`}
          >
            {option.name}
          </h3>
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
        </div>
      }
    >
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{option.description}</p>
      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">{option.sourceLabel}</p>
    </SelectableCard>
  );
}

function CardOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: CatalogCard;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <SelectableCard
      selected={selected}
      onSelect={onSelect}
      header={
        <div className="flex flex-col gap-0.5">
          <h3
            className={`truncate font-medium text-black dark:text-zinc-50 ${selected ? "text-sm" : "text-xs"}`}
          >
            {option.name}
          </h3>
          <span
            className={`font-medium text-black dark:text-zinc-50 ${selected ? "text-xs" : "text-[10px]"}`}
          >
            {formatCostModel(option.cost)}
          </span>
        </div>
      }
    >
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{option.description}</p>
      {option.provider && (
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">{option.provider}</p>
      )}
    </SelectableCard>
  );
}

export function EcosystemTab({
  onBuildFlow,
}: {
  onBuildFlow: (steps: PipelineStep[], seedInput: string, successCriteria: string) => void;
}) {
  const [challenge, setChallenge] = useState(
    "I want a daily summary of game results for American basketball, in email format.",
  );
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [refinedGoal, setRefinedGoal] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, string>>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string>();
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [selectedMcpIds, setSelectedMcpIds] = useState<Set<string>>(new Set());
  const [selectedRagIds, setSelectedRagIds] = useState<Set<string>>(new Set());
  const [ragDocuments, setRagDocuments] = useState("");

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

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
      const result: AnalysisResult = data;
      setAnalysis({ status: "done", result });
      setRefinedGoal(result.refinedGoal);
      setSuccessCriteria(result.successCriteria);
      setSelectedBlocks(Object.fromEntries(result.blocks.map((b) => [b.blockType, b.recommendedIds[0]])));
      setSelectedAgentId(result.agent.recommendedIds[0]);
      setSelectedToolIds(new Set(result.tools.recommendedIds));
      setSelectedMcpIds(new Set(result.mcpServers.recommendedIds));
      setSelectedRagIds(new Set(result.ragSources.recommendedIds));
    } catch (error) {
      setAnalysis({
        status: "error",
        message: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  }

  function buildFlow() {
    if (analysis.status !== "done") return;
    const { result } = analysis;

    const dataSourceStep = result.blocks
      .find((b) => b.blockType === "data-source")
      ?.allOptions.find((o) => o.id === selectedBlocks["data-source"]);
    const deliveryStep = result.blocks
      .find((b) => b.blockType === "delivery")
      ?.allOptions.find((o) => o.id === selectedBlocks.delivery);
    const agentStep = result.agent.allOptions.find((o) => o.id === selectedAgentId);
    if (!dataSourceStep || !agentStep || !deliveryStep) return;

    const wantsLocalRag = selectedRagIds.has(LOCAL_RAG_ID);
    const enrichedAgentStep: PipelineStep = {
      ...agentStep,
      toolRefs: [...selectedToolIds],
      mcpServerRefs: [...selectedMcpIds],
      ragSource:
        wantsLocalRag && ragDocuments.trim() ? { id: LOCAL_RAG_ID, documents: ragDocuments } : undefined,
    };

    onBuildFlow([dataSourceStep, enrichedAgentStep, deliveryStep], refinedGoal || challenge, successCriteria);
  }

  const allSelected =
    analysis.status === "done" &&
    analysis.result.blocks.every((b) => selectedBlocks[b.blockType]) &&
    Boolean(selectedAgentId);

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
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Goal</label>
            <textarea
              value={refinedGoal}
              onChange={(e) => setRefinedGoal(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {analysis.result.blocks.map((block) => (
            <div key={block.blockType} className="flex flex-col gap-3">
              <div>
                <h2 className="font-medium text-black dark:text-zinc-50">
                  {BLOCK_TITLES[block.blockType]}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">{block.rationale}</p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {block.allOptions.map((option) => (
                  <StepOptionCard
                    key={option.id}
                    option={option}
                    selected={selectedBlocks[block.blockType] === option.id}
                    onSelect={() =>
                      setSelectedBlocks((prev) => ({ ...prev, [block.blockType]: option.id }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-medium text-black dark:text-zinc-50">Agent</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{analysis.result.agent.rationale}</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              {analysis.result.agent.allOptions.map((option) => (
                <StepOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedAgentId === option.id}
                  onSelect={() => setSelectedAgentId(option.id)}
                />
              ))}
            </div>
          </div>

          {analysis.result.tools.allOptions.length > 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-medium text-black dark:text-zinc-50">Tools</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">{analysis.result.tools.rationale}</p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {analysis.result.tools.allOptions.map((option) => (
                  <CardOptionCard
                    key={option.id}
                    option={option}
                    selected={selectedToolIds.has(option.id)}
                    onSelect={() => setSelectedToolIds((prev) => toggle(prev, option.id))}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="font-medium text-black dark:text-zinc-50">Bonuses</h2>

            {analysis.result.mcpServers.allOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-zinc-50">MCP servers</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    {analysis.result.mcpServers.rationale}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  {analysis.result.mcpServers.allOptions.map((option) => (
                    <CardOptionCard
                      key={option.id}
                      option={option}
                      selected={selectedMcpIds.has(option.id)}
                      onSelect={() => setSelectedMcpIds((prev) => toggle(prev, option.id))}
                    />
                  ))}
                </div>
              </div>
            )}

            {analysis.result.ragSources.allOptions.length > 0 && (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-zinc-50">RAG sources</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    {analysis.result.ragSources.rationale}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  {analysis.result.ragSources.allOptions.map((option) => (
                    <CardOptionCard
                      key={option.id}
                      option={option}
                      selected={selectedRagIds.has(option.id)}
                      onSelect={() => setSelectedRagIds((prev) => toggle(prev, option.id))}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedRagIds.has(LOCAL_RAG_ID) && (
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Paste reference text for retrieval
                </label>
                <textarea
                  value={ragDocuments}
                  onChange={(e) => setRagDocuments(e.target.value)}
                  rows={4}
                  placeholder="Paste the text your agent should be able to retrieve from…"
                  className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Success criteria
            </label>
            <textarea
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

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
