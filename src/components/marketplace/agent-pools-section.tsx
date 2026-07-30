"use client";

import { useState } from "react";
import type { MockAgentPool } from "@/lib/mock-data";

const VIEWS = [
  { id: "capabilities", label: "Capabilities" },
  { id: "roles", label: "Roles" },
] as const;

type View = (typeof VIEWS)[number]["id"];

const PHASES = [
  { id: "pre", label: "Pre" },
  { id: "work", label: "Work" },
  { id: "post", label: "Post" },
] as const;

function PoolCard({
  pool,
  expanded,
  onToggle,
}: {
  pool: MockAgentPool;
  expanded: boolean;
  onToggle: () => void;
}) {
  const agents = pool.agents ?? [];
  const hasContent = agents.length > 0 || pool.processes != null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">{pool.name}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {pool.entryCount}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">{expanded ? "▾" : "▸"}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{pool.description}</p>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          {!hasContent && (
            <p className="text-xs text-zinc-400 dark:text-zinc-600">No details mapped to this pool yet.</p>
          )}

          {agents.length > 0 && (
            <ul className="flex flex-col gap-2">
              {agents.map((agent) => (
                <li key={agent.name} className="text-xs">
                  <span className="font-medium text-black dark:text-zinc-50">{agent.name}</span>
                  <span className="text-zinc-500 dark:text-zinc-500">: {agent.note}</span>
                </li>
              ))}
            </ul>
          )}

          {pool.processes &&
            PHASES.map((phase) => {
              const items = pool.processes![phase.id];
              if (items.length === 0) return null;
              return (
                <div key={phase.id}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
                    {phase.label}
                  </h4>
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {items.map((item) => (
                      <li key={item} className="text-xs text-zinc-600 dark:text-zinc-400">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export function AgentPoolsSection({
  capabilityPools,
  rolePools,
}: {
  capabilityPools: MockAgentPool[];
  rolePools: MockAgentPool[];
}) {
  const [view, setView] = useState<View>("capabilities");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const pools = view === "capabilities" ? capabilityPools : rolePools;

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-black dark:text-zinc-50">Business Capabilities Agents</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Categorized agents and models available to build flows from. Click a pool to see its agents.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === v.id
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          No agent pools yet. Categories will show up here once the catalog is seeded.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              expanded={expandedIds.has(pool.id)}
              onToggle={() => toggle(pool.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
