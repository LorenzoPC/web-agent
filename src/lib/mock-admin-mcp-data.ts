// Every MCP server on the platform, for /admin/mcp-servers. Two kinds share the name:
// - Published: servers we host for AI clients (Claude, ChatGPT, ...) to connect to.
//   The main server is the one Get started and MCP connection set up (MCP_URL); the
//   others are made with Create MCP server (MCP_BASE_URL + slug). None is deployed yet.
// - Connected: third-party servers whose tools our agents call. They extend the
//   Marketplace's entries by id, and `live` mirrors the catalog seed's executor
//   (scripts/seed-catalog-curated.ts): only GitHub runs today.

import type { ToolCredential } from "./mock-admin-tools-data";
import { MOCK_MARKETPLACE_MCP_SERVERS, type MockMarketplaceMcpServer } from "./mock-marketplace-data";
import { MCP_AUDIENCES, MCP_BASE_URL, MCP_SERVER_TEMPLATES, type McpAudience } from "./mock-mcp-server-data";
import { MCP_URL } from "./mock-onboarding-data";

export interface MockPublishedMcpServer {
  id: string;
  name: string;
  url: string;
  status: "Published" | "Draft";
  /** Audiences with access to at least one dataset. */
  audiences: McpAudience[];
  datasets: number;
  tools: number;
  /** Tools that ask the person to confirm each call. */
  confirmTools: number;
  /** Dollars of tool spend this month, against the server's monthly budget. */
  spend: number;
  monthlyBudget: number;
}

const EVERYONE = MCP_AUDIENCES.map((a) => a.id);

// The Support knowledge base template, as a saved draft: its counts come from the template itself.
const kb = MCP_SERVER_TEMPLATES.find((t) => t.server.slug === "support-kb")!.server;
const kbAudiences = EVERYONE.filter((audience) =>
  kb.rules.some((rule) => rule.audience === audience && Object.values(rule.access).some((level) => level !== "none")),
);

export const MOCK_PUBLISHED_MCP_SERVERS: MockPublishedMcpServer[] = [
  {
    id: "main",
    name: "Web Agent",
    url: MCP_URL,
    status: "Published",
    audiences: EVERYONE,
    datasets: 12,
    tools: 22,
    confirmTools: 3,
    spend: 412,
    monthlyBudget: 1000,
  },
  {
    id: "sales-playbook",
    name: "Sales playbook",
    url: `${MCP_BASE_URL}sales-playbook`,
    status: "Published",
    audiences: ["internal"],
    datasets: 3,
    tools: 6,
    confirmTools: 0,
    spend: 12.4,
    monthlyBudget: 50,
  },
  {
    id: "engineering-docs",
    name: "Engineering docs",
    url: `${MCP_BASE_URL}engineering-docs`,
    status: "Published",
    audiences: ["internal"],
    datasets: 2,
    tools: 4,
    confirmTools: 0,
    spend: 3.1,
    monthlyBudget: 25,
  },
  {
    id: "status",
    name: "Service status",
    url: `${MCP_BASE_URL}status`,
    status: "Published",
    audiences: EVERYONE,
    datasets: 1,
    tools: 2,
    confirmTools: 0,
    spend: 0.4,
    monthlyBudget: 10,
  },
  {
    id: "support-kb",
    name: kb.name,
    url: `${MCP_BASE_URL}${kb.slug}`,
    status: "Draft",
    audiences: kbAudiences,
    datasets: kb.datasetIds.length,
    tools: kb.toolIds.length,
    confirmTools: kb.confirmToolIds.length,
    spend: 0,
    monthlyBudget: kb.monthlyBudget,
  },
];

export interface MockConnectedMcpFacts {
  /** Agents' calls reach the server today. Otherwise it's a catalog entry only. */
  live: boolean;
  /** Tools it offers that change something, out of `exposes`. */
  writes: string[];
  credential: ToolCredential;
}

const FACTS: Record<string, MockConnectedMcpFacts> = {
  "curated:mcp-github": { live: true, writes: [], credential: { kind: "envVar", name: "GITHUB_TOKEN" } },
  "curated:mcp-slack": { live: false, writes: ["post_message"], credential: { kind: "signIn", label: "A Slack workspace, over OAuth" } },
  "curated:mcp-filesystem": { live: false, writes: ["write_file"], credential: { kind: "signIn", label: "Folders shared with it" } },
};

export type MockConnectedMcpServer = MockMarketplaceMcpServer & MockConnectedMcpFacts;

export const MOCK_CONNECTED_MCP_SERVERS: MockConnectedMcpServer[] = MOCK_MARKETPLACE_MCP_SERVERS.map((server) => ({
  ...server,
  ...(FACTS[server.id] ?? { live: false, writes: [], credential: { kind: "none" } }),
}));
