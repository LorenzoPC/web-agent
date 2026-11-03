import Link from "next/link";
import type { ReactNode } from "react";
import type {
  MarketplaceStatus,
  MockMarketplaceMcpServer,
  MockMarketplaceTool,
} from "@/lib/mock-marketplace-data";
import { formatCostModel } from "@/lib/pipeline-data";

const CARD_CLASS =
  "flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

// Only Beta gets a badge; Available is the norm.
function StatusBadge({ status }: { status: MarketplaceStatus }) {
  if (status !== "Beta") return null;
  return (
    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      Beta
    </span>
  );
}

function SectionHeader({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function McpServerCard({ server }: { server: MockMarketplaceMcpServer }) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-black dark:text-zinc-50">{server.name}</h3>
        <StatusBadge status={server.status} />
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{server.description}</p>
      <ul aria-label="Tools it exposes" className="flex flex-wrap gap-1">
        {server.exposes.map((tool) => (
          <li
            key={tool}
            className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            {tool}
          </li>
        ))}
      </ul>
      <p className="mt-auto border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-900 dark:text-zinc-500">
        {server.signIn}
      </p>
    </div>
  );
}

function ToolCard({ tool }: { tool: MockMarketplaceTool }) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-black dark:text-zinc-50">{tool.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{tool.category}</p>
        </div>
        <StatusBadge status={tool.status} />
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{tool.description}</p>
      <p className="mt-auto border-t border-zinc-100 pt-2 text-xs dark:border-zinc-900">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatCostModel(tool.cost)}</span>
        {tool.provider && <span className="text-zinc-500 dark:text-zinc-500"> · {tool.provider}</span>}
      </p>
    </div>
  );
}

/** MCP servers (a connection that brings several tools) above single tools. */
export function McpToolsMarketplace({
  servers,
  tools,
}: {
  servers: MockMarketplaceMcpServer[];
  tools: MockMarketplaceTool[];
}) {
  return (
    <>
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="MCP servers"
          description="One connection to an outside system, bringing a set of tools with it."
          action={
            // Publishing a server is privileged, so it gets the admin color and hint.
            <Link
              href="/mcp-servers/new"
              className="flex shrink-0 items-center gap-2 rounded-lg bg-admin px-3 py-1.5 text-xs font-medium text-admin-foreground transition-colors hover:bg-admin-hover"
            >
              Create MCP server
              <span className="text-admin-foreground/80">Admin</span>
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <McpServerCard key={server.id} server={server} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Tools"
          description="Single actions an agent can call while it works."
          action={
            <Link
              href="/tools/new"
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700"
            >
              Create tool
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </>
  );
}
