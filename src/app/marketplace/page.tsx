import { AgentMarketplace } from "@/components/marketplace/agent-marketplace";
import { AgentPoolsSection } from "@/components/marketplace/agent-pools-section";
import { MOCK_AGENTS, MOCK_CAPABILITY_POOLS, MOCK_ROLE_POOLS } from "@/lib/mock-data";

// Support Agent and Code Reviewer Agent now live under the Engineering business
// capability pool instead of the individual Tasks Agents grid.
const TASK_AGENT_EXCLUDED_IDS = new Set(["curated:agent-support", "curated:agent-code-reviewer"]);
const taskAgents = MOCK_AGENTS.filter((agent) => !TASK_AGENT_EXCLUDED_IDS.has(agent.id));

export default function MarketplacePage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Agent Marketplace
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Browse agent pools by role or capability, or pick an individual agent persona below.
          </p>
        </div>

        <AgentPoolsSection capabilityPools={MOCK_CAPABILITY_POOLS} rolePools={MOCK_ROLE_POOLS} />

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium text-black dark:text-zinc-50">Tasks Agents</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              Click a card to see the full persona.
            </p>
          </div>
          <AgentMarketplace agents={taskAgents} />
        </section>
      </main>
    </div>
  );
}
