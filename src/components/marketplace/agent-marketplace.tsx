"use client";

import { useState } from "react";
import type { PipelineStep } from "@/lib/types";
import { AgentCard } from "./agent-card";
import { AgentSidebar } from "./agent-sidebar";

export function AgentMarketplace({ agents }: { agents: PipelineStep[] }) {
  const [selected, setSelected] = useState<PipelineStep | null>(null);
  // Agents picked for the organization's Agents Departments. Only in the page's state for now.
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  function setPicked(id: string, checked: boolean) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={selected?.id === agent.id}
            picked={pickedIds.has(agent.id)}
            onSelect={() => setSelected(agent)}
          />
        ))}
      </div>
      <AgentSidebar
        agent={selected}
        picked={selected ? pickedIds.has(selected.id) : false}
        onPick={(checked) => selected && setPicked(selected.id, checked)}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
