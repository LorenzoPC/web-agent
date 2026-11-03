"use client";

import { useState } from "react";
import {
  MOCK_ORCHESTRATION_PATTERNS,
  type MockOrchestrationPattern,
} from "@/lib/mock-orchestration-data";
import { DisplayGrid } from "./display-grid";
import { PatternDiagram } from "./pattern-diagram";

function InUseLabel() {
  return (
    <span className="shrink-0 text-[11px] font-medium text-black dark:text-zinc-50">In use</span>
  );
}

/** Compact card for the pattern grid. */
function PatternCard({ pattern, inUse }: { pattern: MockOrchestrationPattern; inUse: boolean }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <PatternDiagram diagram={pattern.diagram} className="mb-2 h-14 w-full" />
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-medium text-black dark:text-zinc-50">{pattern.name}</h4>
        {inUse && <InUseLabel />}
      </div>
      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">{pattern.summary}</p>
      <div className="mt-auto flex flex-wrap justify-between gap-x-2 pt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
        <span>{pattern.agents}</span>
        <span>Cost: {pattern.cost}</span>
      </div>
    </div>
  );
}

/** Full details for the display card, with Use this pattern. */
function PatternDetails({
  pattern,
  inUse,
  onToggle,
}: {
  pattern: MockOrchestrationPattern;
  inUse: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <PatternDiagram diagram={pattern.diagram} className="mb-2 h-24 w-full" />
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-medium text-black dark:text-zinc-50">{pattern.name}</h4>
        {inUse && <InUseLabel />}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">{pattern.agents}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Cost: {pattern.cost} · Speed: {pattern.speed}
      </p>
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{pattern.description}</p>
      <ol className="mt-2 flex list-decimal flex-col gap-0.5 pl-4 text-xs text-zinc-600 dark:text-zinc-400">
        {pattern.flow.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Best for:</span>{" "}
        {pattern.bestFor}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Watch out:</span>{" "}
        {pattern.watchOut}
      </p>
      <button
        onClick={onToggle}
        className={`mt-3 self-start rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
          inUse
            ? "border border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
            : "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        }`}
      >
        {inUse ? "Stop using" : "Use this pattern"}
      </button>
    </div>
  );
}

export function PatternPicker() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inUseId, setInUseId] = useState<string | null>(null);
  const inUse = MOCK_ORCHESTRATION_PATTERNS.find((pattern) => pattern.id === inUseId);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Orchestration pattern</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          How the agents in this flow work together. Draft patterns: steps still run in order,
          whichever one is in use.
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          In use:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {inUse ? inUse.name : "none, steps run in order"}
          </span>
        </p>
      </div>
      <DisplayGrid
        items={MOCK_ORCHESTRATION_PATTERNS}
        selectedId={selectedId}
        onSelect={setSelectedId}
        gridClassName="grid-cols-2 lg:grid-cols-3"
        renderCard={(pattern) => <PatternCard pattern={pattern} inUse={pattern.id === inUseId} />}
        renderDisplay={(pattern) => (
          <PatternDetails
            pattern={pattern}
            inUse={pattern.id === inUseId}
            onToggle={() => setInUseId(pattern.id === inUseId ? null : pattern.id)}
          />
        )}
      />
    </div>
  );
}
