// Mock data for the Marketplace's MCP & Tools view (/marketplace?view=mcp-tools).
// Entries mirror the curated catalog seed (scripts/seed-catalog-curated.ts) and
// keep its ids and costs; names, statuses and what each server exposes match the
// catalog page's docs (feature/catalog-page). Nothing here is live yet.

import type { CostModel } from "./types";

export type MarketplaceStatus = "Available" | "Beta";

export interface MockMarketplaceMcpServer {
  id: string;
  name: string;
  description: string;
  status: MarketplaceStatus;
  /** How people connect, in one line. */
  signIn: string;
  /** Tool names the server exposes, shown as chips. */
  exposes: string[];
}

export interface MockMarketplaceTool {
  id: string;
  name: string;
  description: string;
  status: MarketplaceStatus;
  category: "Search & web" | "Text" | "Actions" | "Compute & media";
  /** Third-party provider behind the tool, when there is one. */
  provider?: string;
  cost: CostModel;
}

export const MOCK_MARKETPLACE_MCP_SERVERS: MockMarketplaceMcpServer[] = [
  {
    id: "curated:mcp-github",
    name: "GitHub MCP server",
    description: "Read repositories, issues and pull requests.",
    status: "Available",
    signIn: "Your GitHub account, over OAuth",
    exposes: ["search_code", "list_issues", "get_pull_request"],
  },
  {
    id: "curated:mcp-slack",
    name: "Slack MCP server",
    description: "Read threads and reactions, and post as a named bot.",
    status: "Available",
    signIn: "Your Slack workspace, over OAuth",
    exposes: ["search_messages", "get_thread", "post_message"],
  },
  {
    id: "curated:mcp-filesystem",
    name: "Filesystem MCP server",
    description: "Read and write files in folders you share with it.",
    status: "Beta",
    signIn: "No account; you pick the folders it can reach",
    exposes: ["list_directory", "read_file", "write_file"],
  },
];

export const MOCK_MARKETPLACE_TOOLS: MockMarketplaceTool[] = [
  {
    id: "curated:tool-web-search",
    name: "Web Search",
    description: "Search the live web and return results the agent can cite.",
    status: "Available",
    category: "Search & web",
    provider: "Exa",
    cost: { kind: "perRequest", dollarsPerRequest: 0.005 },
  },
  {
    id: "curated:tool-fetch-url",
    name: "Fetch URL",
    description: "Retrieve and read the contents of a web page.",
    status: "Available",
    category: "Search & web",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-json-extract",
    name: "Extract Structured Data",
    description: "Turn emails, tickets and PDFs into typed fields.",
    status: "Available",
    category: "Text",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-translate",
    name: "Translate Text",
    description: "Translate text between languages.",
    status: "Available",
    category: "Text",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-sentiment",
    name: "Sentiment Analysis",
    description: "Classify the sentiment and tone of a piece of text.",
    status: "Available",
    category: "Text",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-send-email",
    name: "Send Email",
    description: "Compose and send an email.",
    status: "Available",
    category: "Actions",
    cost: { kind: "perRequest", dollarsPerRequest: 0.001 },
  },
  {
    id: "curated:tool-read-calendar",
    name: "Read Calendar",
    description: "Look up events on a connected calendar.",
    status: "Available",
    category: "Actions",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-calculator",
    name: "Calculator",
    description: "Evaluate arithmetic and numeric expressions precisely.",
    status: "Available",
    category: "Compute & media",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-code-execution",
    name: "Code Execution",
    description: "Run a short code snippet in a sandbox and return its output.",
    status: "Beta",
    category: "Compute & media",
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-image-generation",
    name: "Generate Image",
    description: "Generate an image from a text prompt.",
    status: "Beta",
    category: "Compute & media",
    cost: { kind: "free" },
  },
];
