import { AgentMarketplace } from "@/components/marketplace/agent-marketplace";
import { AgentPoolsSection } from "@/components/marketplace/agent-pools-section";
import { MARKETPLACE_VIEWS, MarketplaceHeader } from "@/components/marketplace/marketplace-header";
import { McpToolsMarketplace } from "@/components/marketplace/mcp-tools-marketplace";
import { ModelMarketplace } from "@/components/marketplace/model-marketplace";
import { MOCK_AGENTS, MOCK_CAPABILITY_POOLS, MOCK_MODEL_TYPE_GROUPS, MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { MOCK_MARKETPLACE_MCP_SERVERS, MOCK_MARKETPLACE_TOOLS } from "@/lib/mock-marketplace-data";

// Support Agent and Code Reviewer Agent now live under the Engineering business
// capability pool instead of the individual Tasks Agents grid.
const TASK_AGENT_EXCLUDED_IDS = new Set(["curated:agent-support", "curated:agent-code-reviewer"]);
const taskAgents = MOCK_AGENTS.filter((agent) => !TASK_AGENT_EXCLUDED_IDS.has(agent.id));

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Three marketplaces on one page, switched from the title (?view=models, ?view=mcp-tools). */
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const view = MARKETPLACE_VIEWS.find((v) => v.id === firstParam(params.view))?.id ?? "agents";

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-6">
        <MarketplaceHeader active={view} />

        {view === "agents" && (
          <>
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
          </>
        )}

        {view === "models" && <ModelMarketplace groups={MOCK_MODEL_TYPE_GROUPS} />}

        {view === "mcp-tools" && (
          <McpToolsMarketplace servers={MOCK_MARKETPLACE_MCP_SERVERS} tools={MOCK_MARKETPLACE_TOOLS} />
        )}
      </main>
    </div>
  );
}
