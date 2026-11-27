"use client";

import { CardDetailGrid, type CardDetailGroup, type CardFace } from "@/components/ui/card-detail-grid";
import type { MockAgentPool } from "@/lib/mock-data";
import { unbuilt } from "@/lib/unbuilt";
import { AGENTS_DEPARTMENTS_PICK } from "./agents-departments";

const PHASES = [
  { id: "pre", label: "Pre" },
  { id: "work", label: "Work" },
  { id: "post", label: "Post" },
] as const;

const MOCK_CATALOG = unbuilt("panel", "marketplace catalog API");

/** Shown in place of a group's cards when it has no pools. */
export const NO_POOLS = "No agent pools yet. Categories will show up here once the catalog is seeded.";

/** A pool's card: its name, its description, and labels for its entries, processes and mapped agents. */
function poolFace(pool: MockAgentPool): CardFace {
  const processes = pool.processes
    ? pool.processes.pre.length + pool.processes.work.length + pool.processes.post.length
    : 0;
  const agents = pool.agents?.length ?? 0;
  const labels = [`${pool.entryCount} entries`];
  if (processes > 0) labels.push(`${processes} processes`);
  if (agents > 0) labels.push(`${agents} ${agents === 1 ? "agent" : "agents"}`);
  return { title: pool.name, description: pool.description, labels };
}

/** The selected pool's agents and business processes, after the details' title and pick. */
function PoolDetail({ pool }: { pool: MockAgentPool }) {
  const agents = pool.agents ?? [];
  const hasContent = agents.length > 0 || pool.processes != null;

  return (
    <div className="flex flex-col gap-4">
      {!hasContent && (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">No details mapped to this pool yet.</p>
      )}

      {agents.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            Agents
          </h4>
          <ul className="mt-1.5 flex flex-col gap-2">
            {agents.map((agent) => (
              <li key={agent.name} className="text-xs">
                <span className="font-medium text-black dark:text-zinc-50">{agent.name}</span>
                <span className="text-zinc-500 dark:text-zinc-500">: {agent.note}</span>
              </li>
            ))}
          </ul>
        </div>
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
  );
}

/**
 * Pool cards with the selected pool's details beside them, and the "Add to my
 * Agents Departments" pick. Used for the role pools on the Agent Marketplace and
 * the capability pools on the Model Marketplace.
 */
export function PoolCardGrid({
  groups,
  emptyDetail,
  detailLabel,
}: {
  groups: CardDetailGroup<MockAgentPool>[];
  /** Shown in the detail column until a pool is selected. */
  emptyDetail: string;
  /** Accessible name of the detail column, e.g. "Selected pool". */
  detailLabel: string;
}) {
  return (
    <CardDetailGrid
      groups={groups}
      getId={(pool) => pool.id}
      card={poolFace}
      renderDetail={(pool) => <PoolDetail pool={pool} />}
      emptyDetail={emptyDetail}
      detailLabel={detailLabel}
      pick={AGENTS_DEPARTMENTS_PICK}
      cardProps={MOCK_CATALOG}
      detailProps={MOCK_CATALOG}
    />
  );
}
