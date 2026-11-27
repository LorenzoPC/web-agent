"use client";

import type { MockAgentPool } from "@/lib/mock-data";
import { NO_POOLS, PoolCardGrid } from "./pool-card-grid";

/**
 * The role pools, with the selected pool's details beside them. The capability
 * pools that used to sit here moved to the top of the Model Marketplace.
 */
export function AgentPoolsSection({ rolePools }: { rolePools: MockAgentPool[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Business Capabilities Agents</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Agents grouped by the team they support, available to build flows from. Click a pool to see its agents
          and the work it covers.
        </p>
      </div>

      <PoolCardGrid
        groups={[{ id: "roles", items: rolePools, empty: NO_POOLS }]}
        emptyDetail="Select a pool to see its agents and the work it covers."
        detailLabel="Selected pool"
      />
    </section>
  );
}
