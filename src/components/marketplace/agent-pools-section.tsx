"use client";

import { CardDetailGrid, CardLabels, type CardFace, type DetailPlacement } from "@/components/ui/card-detail-grid";
import type { MockAgentPool } from "@/lib/mock-data";
import { unbuilt } from "@/lib/unbuilt";

const PHASES = [
  { id: "pre", label: "Pre" },
  { id: "work", label: "Work" },
  { id: "post", label: "Post" },
] as const;

const NO_POOLS = "No agent pools yet. Categories will show up here once the catalog is seeded.";
const MOCK_CATALOG = unbuilt("panel", "marketplace catalog API");

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

/**
 * The selected pool's agents and business processes. In the detail column it
 * repeats the pool's name, description and labels; under its own card (phones)
 * it doesn't.
 */
function PoolDetail({ pool, placement }: { pool: MockAgentPool; placement: DetailPlacement }) {
  const agents = pool.agents ?? [];
  const hasContent = agents.length > 0 || pool.processes != null;

  return (
    <div className="flex flex-col gap-4">
      {placement === "column" && (
        <div className="flex flex-col gap-2">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-zinc-50">{pool.name}</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{pool.description}</p>
          </div>
          <CardLabels labels={poolFace(pool).labels ?? []} />
        </div>
      )}

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

/** Role pools, then capability pools, with the selected pool's details beside them (there used to be a Roles | Capabilities toggle). */
export function AgentPoolsSection({
  capabilityPools,
  rolePools,
}: {
  capabilityPools: MockAgentPool[];
  rolePools: MockAgentPool[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Business Capabilities Agents</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Categorized agents and models available to build flows from. Click a pool to see its agents.
        </p>
      </div>

      <CardDetailGrid
        groups={[
          {
            id: "roles",
            title: "Roles",
            description: "Agents grouped by the team they support.",
            items: rolePools,
            empty: NO_POOLS,
          },
          {
            id: "capabilities",
            title: "Capabilities",
            description: "Models and agents grouped by what they can do.",
            items: capabilityPools,
            empty: NO_POOLS,
          },
        ]}
        getId={(pool) => pool.id}
        card={poolFace}
        renderDetail={(pool, placement) => <PoolDetail pool={pool} placement={placement} />}
        emptyDetail="Select a pool to see its agents and the work it covers."
        detailLabel="Selected pool"
        cardProps={MOCK_CATALOG}
        detailProps={MOCK_CATALOG}
      />
    </section>
  );
}
