// Mock data for Create MCP server (/mcp-servers/new): the datasets a server can
// expose, the catalog tools it can offer, and the departments access rules
// narrow by. Nothing here is live: publishing only lives in the page's state,
// and no server is deployed at webagent.dev/mcp/.

import type { CostModel } from "./types";

export const MCP_BASE_URL = "https://webagent.dev/mcp/";

/** Slugs already in use. The URL field checks against these. */
export const TAKEN_MCP_SLUGS = ["sales-playbook", "engineering-docs", "status"];

// The same four audiences /onboarding serves.
export type McpAudience = "internal" | "clients" | "partners" | "resellers";

export const MCP_AUDIENCES: { id: McpAudience; label: string }[] = [
  { id: "internal", label: "Internal" },
  { id: "clients", label: "Clients" },
  { id: "partners", label: "Partners" },
  { id: "resellers", label: "Resellers" },
];

/** Each level includes the ones before it. */
export type McpAccess = "none" | "read" | "write" | "manage";

export const MCP_ACCESS_LEVELS: { id: McpAccess; label: string }[] = [
  { id: "none", label: "None" },
  { id: "read", label: "Read" },
  { id: "write", label: "Write" },
  { id: "manage", label: "Manage" },
];

export interface McpDataset {
  id: string;
  name: string;
  description: string;
  size: string;
}

export const MCP_DATASETS: McpDataset[] = [
  { id: "help-center", name: "Help center articles", description: "Public how-to articles and FAQs", size: "1,284 articles" },
  { id: "runbooks", name: "Support runbooks", description: "Internal troubleshooting steps and escalation paths", size: "312 docs" },
  { id: "release-notes", name: "Release notes", description: "What shipped, by version and date", size: "96 entries" },
  { id: "tickets", name: "Support tickets", description: "Customer conversations, status and internal notes", size: "48,210 tickets" },
  { id: "accounts", name: "Customer accounts", description: "Plan, billing status, credits and contacts", size: "3,920 accounts" },
];

/** Departments inside each business unit (MOCK_BUSINESS_UNITS), read from the person's directory profile at sign-in. */
export interface McpDepartment {
  id: string;
  name: string;
  unitId: string;
}

export const MCP_DEPARTMENTS: McpDepartment[] = [
  { id: "support-tier-1", name: "Tier 1", unitId: "customer-support" },
  { id: "support-tier-2", name: "Tier 2", unitId: "customer-support" },
  { id: "support-escalations", name: "Escalations", unitId: "customer-support" },
  { id: "sales-sdr", name: "Sales development", unitId: "sales" },
  { id: "sales-ae", name: "Account executives", unitId: "sales" },
  { id: "sales-ops", name: "Sales ops", unitId: "sales" },
  { id: "eng-platform", name: "Platform", unitId: "engineering" },
  { id: "eng-sre", name: "SRE", unitId: "engineering" },
  { id: "eng-product", name: "Product engineering", unitId: "engineering" },
  { id: "cx-success", name: "Customer success", unitId: "customer-experience" },
  { id: "cx-onboarding", name: "Onboarding", unitId: "customer-experience" },
  { id: "cx-research", name: "Research", unitId: "customer-experience" },
];

/** Maps to MCP tool annotations: read → readOnlyHint, destructive → destructiveHint. */
export type McpToolSafety = "read" | "write" | "destructive";

export type McpToolCategory = "knowledge" | "tickets" | "accounts" | "general";

/** Display order of the Tools section's collapsible groups. */
export const MCP_TOOL_CATEGORIES: { id: McpToolCategory; label: string }[] = [
  { id: "knowledge", label: "Knowledge base" },
  { id: "tickets", label: "Tickets" },
  { id: "accounts", label: "Accounts & billing" },
  { id: "general", label: "General" },
];

/** Which tools a rule gets. "per-tool": each tool's own data needs decide, as set in Tools. */
export type McpToolAccess = "per-tool" | "read-only" | "none";

export const MCP_TOOL_ACCESS_OPTIONS: { id: McpToolAccess; label: string }[] = [
  { id: "per-tool", label: "Per tool" },
  { id: "read-only", label: "Read-only" },
  { id: "none", label: "None" },
];

/** A catalog tool as a server offers it. Generic tools reuse their curated catalog ids. */
export interface McpCatalogTool {
  id: string;
  /** What AI clients call it. */
  toolName: string;
  name: string;
  description: string;
  safety: McpToolSafety;
  category: McpToolCategory;
  /** Datasets the tool reads or changes. Using the tool needs enough access to all of them. */
  datasetIds: string[];
  cost: CostModel;
}

export const MCP_CATALOG_TOOLS: McpCatalogTool[] = [
  {
    id: "catalog:tool-search-help-center",
    toolName: "search_help_center",
    name: "Search help center",
    description: "Search help center articles and return the best matches with links",
    safety: "read",
    category: "knowledge",
    datasetIds: ["help-center"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-search-runbooks",
    toolName: "search_runbooks",
    name: "Search runbooks",
    description: "Find the troubleshooting runbook for a symptom or error message",
    safety: "read",
    category: "knowledge",
    datasetIds: ["runbooks"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-search-release-notes",
    toolName: "search_release_notes",
    name: "Search release notes",
    description: "Find when a feature or fix shipped, and in which version",
    safety: "read",
    category: "knowledge",
    datasetIds: ["release-notes"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-get-ticket",
    toolName: "get_ticket",
    name: "Get ticket",
    description: "Read a support ticket's conversation, status and notes",
    safety: "read",
    category: "tickets",
    datasetIds: ["tickets"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-create-ticket",
    toolName: "create_ticket",
    name: "Create ticket",
    description: "Open a new support ticket with a subject, description and priority",
    safety: "write",
    category: "tickets",
    datasetIds: ["tickets"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-update-ticket",
    toolName: "update_ticket",
    name: "Update ticket",
    description: "Change a ticket's status, priority or assignee, or add a note",
    safety: "write",
    category: "tickets",
    datasetIds: ["tickets"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-delete-ticket",
    toolName: "delete_ticket",
    name: "Delete ticket",
    description: "Permanently delete a ticket and its conversation",
    safety: "destructive",
    category: "tickets",
    datasetIds: ["tickets"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-lookup-account",
    toolName: "lookup_account",
    name: "Look up account",
    description: "Read a customer's plan, billing status and contacts",
    safety: "read",
    category: "accounts",
    datasetIds: ["accounts"],
    cost: { kind: "free" },
  },
  {
    id: "catalog:tool-issue-credit",
    toolName: "issue_credit",
    name: "Issue credit",
    description: "Add a credit to a customer's next invoice. It can't be taken back once the invoice is sent",
    safety: "destructive",
    category: "accounts",
    datasetIds: ["accounts"],
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-web-search",
    toolName: "web_search",
    name: "Web Search",
    description: "Search the live web and return results the agent can cite",
    safety: "read",
    category: "general",
    datasetIds: [],
    cost: { kind: "perRequest", dollarsPerRequest: 0.005 },
  },
  {
    id: "curated:tool-translate",
    toolName: "translate_text",
    name: "Translate Text",
    description: "Translate text between languages",
    safety: "read",
    category: "general",
    datasetIds: [],
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-sentiment",
    toolName: "analyze_sentiment",
    name: "Sentiment Analysis",
    description: "Classify the sentiment and tone of a piece of text",
    safety: "read",
    category: "general",
    datasetIds: [],
    cost: { kind: "free" },
  },
  {
    id: "curated:tool-send-email",
    toolName: "send_email",
    name: "Send Email",
    description: "Compose and send an email",
    safety: "write",
    category: "general",
    datasetIds: [],
    cost: { kind: "perRequest", dollarsPerRequest: 0.001 },
  },
];

/**
 * Who gets what. A rule covers a whole audience, or narrows it to a business
 * unit, or to a department within one. For each person the most specific
 * matching rule applies, in full.
 */
export interface McpAccessRule {
  id: string;
  audience: McpAudience;
  /** null: every business unit. */
  unitId: string | null;
  /** null: every department. Only set when unitId is. */
  departmentId: string | null;
  /** Per dataset id. A missing dataset means "none". */
  access: Record<string, McpAccess>;
  /** Missing means "per-tool". */
  tools?: McpToolAccess;
}

export interface McpServerDraft {
  name: string;
  /** The last part of the URL: webagent.dev/mcp/<slug>. */
  slug: string;
  /** Sent to AI clients when they connect, to tell the model when and how to use the server. */
  instructions: string;
  datasetIds: string[];
  /** Datasets where Clients, Partners and Resellers only see their own company's records. */
  companyScopedIds: string[];
  rules: McpAccessRule[];
  toolIds: string[];
  /** Tools that ask the person to confirm before each call. */
  confirmToolIds: string[];
  callsPerPersonPerDay: number;
  /** Dollars. Calls stop for everyone when the month's tool spend reaches it. */
  monthlyBudget: number;
}

export const BLANK_MCP_SERVER: McpServerDraft = {
  name: "",
  slug: "",
  instructions: "",
  datasetIds: [],
  companyScopedIds: [],
  rules: MCP_AUDIENCES.map((audience) => ({
    id: `rule-${audience.id}`,
    audience: audience.id,
    unitId: null,
    departmentId: null,
    access: {},
  })),
  toolIds: [],
  confirmToolIds: [],
  callsPerPersonPerDay: 200,
  monthlyBudget: 100,
};

const SUPPORT_KB: McpServerDraft = {
  name: "Support knowledge base",
  slug: "support-kb",
  instructions:
    "Answers product and account questions from our help center, runbooks and release notes, and reads or opens support tickets. Search the help center first and cite the article you used. Use runbooks only for troubleshooting steps. Before creating a ticket, check get_ticket for an open one on the same issue.",
  datasetIds: ["help-center", "runbooks", "release-notes", "tickets", "accounts"],
  companyScopedIds: ["tickets", "accounts"],
  rules: [
    {
      id: "rule-internal",
      audience: "internal",
      unitId: null,
      departmentId: null,
      access: { "help-center": "read", runbooks: "read", "release-notes": "read", tickets: "read", accounts: "read" },
    },
    {
      id: "rule-internal-support",
      audience: "internal",
      unitId: "customer-support",
      departmentId: null,
      access: { "help-center": "write", runbooks: "read", "release-notes": "read", tickets: "write", accounts: "read" },
    },
    {
      id: "rule-internal-support-escalations",
      audience: "internal",
      unitId: "customer-support",
      departmentId: "support-escalations",
      access: { "help-center": "write", runbooks: "write", "release-notes": "read", tickets: "manage", accounts: "manage" },
    },
    {
      id: "rule-clients",
      audience: "clients",
      unitId: null,
      departmentId: null,
      access: { "help-center": "read", "release-notes": "read", tickets: "write", accounts: "read" },
    },
    {
      id: "rule-partners",
      audience: "partners",
      unitId: null,
      departmentId: null,
      access: { "help-center": "read", "release-notes": "read", tickets: "read" },
    },
    {
      id: "rule-resellers",
      audience: "resellers",
      unitId: null,
      departmentId: null,
      access: { "help-center": "read", "release-notes": "read", tickets: "write", accounts: "read" },
    },
  ],
  toolIds: [
    "catalog:tool-search-help-center",
    "catalog:tool-search-runbooks",
    "catalog:tool-search-release-notes",
    "catalog:tool-get-ticket",
    "catalog:tool-create-ticket",
    "catalog:tool-update-ticket",
    "catalog:tool-lookup-account",
    "catalog:tool-issue-credit",
    "curated:tool-translate",
  ],
  confirmToolIds: ["catalog:tool-issue-credit"],
  callsPerPersonPerDay: 200,
  monthlyBudget: 150,
};

export const MCP_SERVER_TEMPLATES: { label: string; server: McpServerDraft }[] = [
  { label: "Support knowledge base", server: SUPPORT_KB },
  { label: "Blank", server: BLANK_MCP_SERVER },
];
