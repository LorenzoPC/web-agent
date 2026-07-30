"use client";

import { useState } from "react";
import type { BlockType } from "@/lib/block-catalog";
import type { CatalogCard, CatalogCategory } from "@/lib/catalog-db";
import { SOURCE_TYPE_LABELS, formatCost, formatCostModel, stepCost } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { CatalogSearchModal, type ModalItem } from "./catalog-search-modal";
import { SelectableCard } from "./selectable-card";

const LOCAL_RAG_ID = "curated:rag-local-documents";

/** ids already present in `base` are skipped so a re-opened search doesn't duplicate a card. */
function withExtras<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const ids = new Set(base.map((o) => o.id));
  return [...base, ...extra.filter((o) => !ids.has(o.id))];
}

type Recommendation = { id: string; rationale: string };

type Group<T> = { rationale: string; allOptions: T[]; recommendations: Recommendation[] };

type AnalysisResult = {
  refinedGoal: string;
  successCriteria: string;
  blocks: { blockType: BlockType; rationale: string; allOptions: PipelineStep[]; recommendations: Recommendation[] }[];
  agent: Group<PipelineStep>;
  tools: Group<CatalogCard>;
  mcpServers: Group<CatalogCard>;
  ragSources: Group<CatalogCard>;
};

function rationaleFor(recommendations: Recommendation[], id: string): string | undefined {
  return recommendations.find((r) => r.id === id)?.rationale;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: AnalysisResult }
  | { status: "error"; message: string };

const BLOCK_TITLES: Record<string, string> = {
  "data-source": "Data Source",
  delivery: "Delivery",
};

function StepOptionCard({
  option,
  selected,
  onSelect,
  rationale,
}: {
  option: PipelineStep;
  selected: boolean;
  onSelect: () => void;
  rationale?: string;
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
      {rationale && (
        <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">“{rationale}”</p>
      )}
    </SelectableCard>
  );
}

function CardOptionCard({
  option,
  selected,
  onSelect,
  rationale,
}: {
  option: CatalogCard;
  selected: boolean;
  onSelect: () => void;
  rationale?: string;
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
      {rationale && (
        <p className="mt-2 text-xs italic text-zinc-500 dark:text-zinc-400">“{rationale}”</p>
      )}
    </SelectableCard>
  );
}

function SearchMoreCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: 100 }}
      className="flex h-full min-h-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 p-3 text-center text-[10px] text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
    >
      <span className="text-base leading-none">+</span>
      Search something else
    </button>
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

  const [searchCategory, setSearchCategory] = useState<CatalogCategory | null>(null);
  const [extraBlockOptions, setExtraBlockOptions] = useState<Record<string, PipelineStep[]>>({});
  const [extraAgentOptions, setExtraAgentOptions] = useState<PipelineStep[]>([]);
  const [extraToolOptions, setExtraToolOptions] = useState<CatalogCard[]>([]);
  const [extraMcpOptions, setExtraMcpOptions] = useState<CatalogCard[]>([]);
  const [extraRagOptions, setExtraRagOptions] = useState<CatalogCard[]>([]);

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  function handleSearchSelect(item: ModalItem) {
    switch (searchCategory) {
      case "data-source":
      case "delivery": {
        const step = item as PipelineStep;
        const category = searchCategory;
        setExtraBlockOptions((prev) => ({
          ...prev,
          [category]: withExtras(prev[category] ?? [], [step]),
        }));
        setSelectedBlocks((prev) => ({ ...prev, [category]: step.id }));
        break;
      }
      case "agent": {
        const step = item as PipelineStep;
        setExtraAgentOptions((prev) => withExtras(prev, [step]));
        setSelectedAgentId(step.id);
        break;
      }
      case "tools": {
        const card = item as CatalogCard;
        setExtraToolOptions((prev) => withExtras(prev, [card]));
        setSelectedToolIds((prev) => new Set(prev).add(card.id));
        break;
      }
      case "mcp-servers": {
        const card = item as CatalogCard;
        setExtraMcpOptions((prev) => withExtras(prev, [card]));
        setSelectedMcpIds((prev) => new Set(prev).add(card.id));
        break;
      }
      case "rag-sources": {
        const card = item as CatalogCard;
        setExtraRagOptions((prev) => withExtras(prev, [card]));
        setSelectedRagIds((prev) => new Set(prev).add(card.id));
        break;
      }
    }
    setSearchCategory(null);
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
      setSelectedBlocks(
        Object.fromEntries(result.blocks.map((b) => [b.blockType, b.recommendations[0]?.id])),
      );
      setSelectedAgentId(result.agent.recommendations[0]?.id);
      setSelectedToolIds(new Set(result.tools.recommendations.map((r) => r.id)));
      setSelectedMcpIds(new Set(result.mcpServers.recommendations.map((r) => r.id)));
      setSelectedRagIds(new Set(result.ragSources.recommendations.map((r) => r.id)));
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

    const dataSourceStep = withExtras(
      result.blocks.find((b) => b.blockType === "data-source")?.allOptions ?? [],
      extraBlockOptions["data-source"] ?? [],
    ).find((o) => o.id === selectedBlocks["data-source"]);
    const deliveryStep = withExtras(
      result.blocks.find((b) => b.blockType === "delivery")?.allOptions ?? [],
      extraBlockOptions.delivery ?? [],
    ).find((o) => o.id === selectedBlocks.delivery);
    const agentStep = withExtras(result.agent.allOptions, extraAgentOptions).find(
      (o) => o.id === selectedAgentId,
    );
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
          Describe your job-to-be-done
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

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-medium text-black dark:text-zinc-50">Agent</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{analysis.result.agent.rationale}</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              {withExtras(analysis.result.agent.allOptions, extraAgentOptions).map((option) => (
                <StepOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedAgentId === option.id}
                  onSelect={() => setSelectedAgentId(option.id)}
                  rationale={rationaleFor(analysis.result.agent.recommendations, option.id)}
                />
              ))}
              <SearchMoreCard onClick={() => setSearchCategory("agent")} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-medium text-black dark:text-zinc-50">Tools</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">{analysis.result.tools.rationale}</p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              {withExtras(analysis.result.tools.allOptions, extraToolOptions).map((option) => (
                <CardOptionCard
                  key={option.id}
                  option={option}
                  selected={selectedToolIds.has(option.id)}
                  onSelect={() => setSelectedToolIds((prev) => toggle(prev, option.id))}
                  rationale={rationaleFor(analysis.result.tools.recommendations, option.id)}
                />
              ))}
              <SearchMoreCard onClick={() => setSearchCategory("tools")} />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="font-medium text-black dark:text-zinc-50">Data sources (and outputs)</h2>
            {analysis.result.blocks.map((block) => (
              <div key={block.blockType} className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-zinc-50">
                    {BLOCK_TITLES[block.blockType]}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">{block.rationale}</p>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  {withExtras(block.allOptions, extraBlockOptions[block.blockType] ?? []).map((option) => (
                    <StepOptionCard
                      key={option.id}
                      option={option}
                      selected={selectedBlocks[block.blockType] === option.id}
                      onSelect={() =>
                        setSelectedBlocks((prev) => ({ ...prev, [block.blockType]: option.id }))
                      }
                      rationale={rationaleFor(block.recommendations, option.id)}
                    />
                  ))}
                  <SearchMoreCard
                    onClick={() => setSearchCategory(block.blockType as CatalogCategory)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h2 className="font-medium text-black dark:text-zinc-50">Bonuses</h2>

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-medium text-black dark:text-zinc-50">MCP servers</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  {analysis.result.mcpServers.rationale}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {withExtras(analysis.result.mcpServers.allOptions, extraMcpOptions).map((option) => (
                  <CardOptionCard
                    key={option.id}
                    option={option}
                    selected={selectedMcpIds.has(option.id)}
                    onSelect={() => setSelectedMcpIds((prev) => toggle(prev, option.id))}
                    rationale={rationaleFor(analysis.result.mcpServers.recommendations, option.id)}
                  />
                ))}
                <SearchMoreCard onClick={() => setSearchCategory("mcp-servers")} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="text-sm font-medium text-black dark:text-zinc-50">RAG sources</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  {analysis.result.ragSources.rationale}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {withExtras(analysis.result.ragSources.allOptions, extraRagOptions).map((option) => (
                  <CardOptionCard
                    key={option.id}
                    option={option}
                    selected={selectedRagIds.has(option.id)}
                    onSelect={() => setSelectedRagIds((prev) => toggle(prev, option.id))}
                    rationale={rationaleFor(analysis.result.ragSources.recommendations, option.id)}
                  />
                ))}
                <SearchMoreCard onClick={() => setSearchCategory("rag-sources")} />
              </div>
            </div>

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

      {searchCategory && (
        <CatalogSearchModal
          category={searchCategory}
          isSelected={(id) => {
            switch (searchCategory) {
              case "data-source":
              case "delivery":
                return selectedBlocks[searchCategory] === id;
              case "agent":
                return selectedAgentId === id;
              case "tools":
                return selectedToolIds.has(id);
              case "mcp-servers":
                return selectedMcpIds.has(id);
              case "rag-sources":
                return selectedRagIds.has(id);
            }
          }}
          onSelect={handleSearchSelect}
          onClose={() => setSearchCategory(null)}
        />
      )}
    </div>
  );
}
