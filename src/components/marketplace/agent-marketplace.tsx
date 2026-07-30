"use client";

import { useState } from "react";
import type { PipelineStep } from "@/lib/types";
import { AgentCard } from "./agent-card";
import { AgentSidebar } from "./agent-sidebar";

export function AgentMarketplace({ agents }: { agents: PipelineStep[] }) {
  const [selected, setSelected] = useState<PipelineStep | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={selected?.id === agent.id}
            onSelect={() => setSelected(agent)}
          />
        ))}
      </div>
      <AgentSidebar agent={selected} onClose={() => setSelected(null)} />
    </>
  );
}
