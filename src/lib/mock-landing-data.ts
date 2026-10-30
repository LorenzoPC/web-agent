// Mock data for the landing page (/): what the platform offers at a
// glance, what shipped recently, where the docs start, and why to trust it.
// Signed in, the page adds the visitor's account. Nothing here is live yet.

import { MOCK_AGENTS } from "./mock-data";

export interface ComponentTypeTile {
  id: string;
  label: string;
  count: number;
  description: string;
  href: string;
}

// Counts match what the mockups show elsewhere: the Marketplace's agents and
// the curated MCP servers and tools in the Builder catalog.
export const COMPONENT_TYPES: ComponentTypeTile[] = [
  {
    id: "agents",
    label: "Agents",
    count: MOCK_AGENTS.length,
    description: "Ready-made personas for support, research, data and code review.",
    href: "/marketplace",
  },
  {
    id: "mcp-servers",
    label: "MCP servers",
    count: 3,
    description: "Connect agents to GitHub, Slack and your own files.",
    href: "/builder",
  },
  {
    id: "tools",
    label: "Tools",
    count: 10,
    description: "Single actions like web search, email and data extraction.",
    href: "/builder",
  },
];

export type SearchKind = "Agent" | "MCP server" | "Tool" | "Doc";

/** One searchable item. Items without an href have no page yet and show as "Soon". */
export interface SearchEntry {
  id: string;
  title: string;
  kind: SearchKind;
  href?: string;
}

export const SEARCH_INDEX: SearchEntry[] = [
  ...MOCK_AGENTS.map((agent) => ({ id: agent.id, title: agent.name, kind: "Agent" as const, href: "/marketplace" })),
  { id: "mcp-github", title: "GitHub MCP server", kind: "MCP server", href: "/builder" },
  { id: "mcp-slack", title: "Slack MCP server", kind: "MCP server", href: "/builder" },
  { id: "mcp-filesystem", title: "Filesystem MCP server", kind: "MCP server", href: "/builder" },
  { id: "tool-web-search", title: "Web Search", kind: "Tool", href: "/builder" },
  { id: "tool-send-email", title: "Send Email", kind: "Tool", href: "/builder" },
  { id: "tool-extract", title: "Extract Structured Data", kind: "Tool", href: "/builder" },
  { id: "tool-translate", title: "Translate Text", kind: "Tool", href: "/builder" },
  { id: "tool-fetch-url", title: "Fetch URL", kind: "Tool", href: "/builder" },
  { id: "doc-connect", title: "Connect over MCP", kind: "Doc", href: "/onboarding" },
  { id: "doc-quickstart", title: "Quickstart", kind: "Doc" },
  { id: "doc-api", title: "API reference", kind: "Doc" },
  { id: "doc-security", title: "Security overview", kind: "Doc" },
];

export interface ReleaseNote {
  id: string;
  date: string;
  kind: Exclude<SearchKind, "Doc">;
  title: string;
  summary: string;
  /** Included in the signed-in visitor's plan, badged when signed in. */
  inPlan: boolean;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    id: "slack-mcp-v2",
    date: "2026-10-23",
    kind: "MCP server",
    title: "Slack MCP server v2",
    summary: "Reads threads and reactions, and posts as a named bot.",
    inPlan: true,
  },
  {
    id: "data-analyst",
    date: "2026-10-20",
    kind: "Agent",
    title: "Data Analyst Agent",
    summary: "Answers questions about a CSV or table, with numbers and a short explanation.",
    inPlan: true,
  },
  {
    id: "extract",
    date: "2026-10-14",
    kind: "Tool",
    title: "Extract Structured Data",
    summary: "Turns emails, tickets and PDFs into typed fields.",
    inPlan: false,
  },
  {
    id: "code-reviewer-summary",
    date: "2026-10-06",
    kind: "Agent",
    title: "Code Reviewer Agent: PR summaries",
    summary: "Summarizes each pull request before listing its findings.",
    inPlan: true,
  },
];

export interface DocEntry {
  id: string;
  title: string;
  description: string;
  href?: string;
}

export const DOC_ENTRIES: DocEntry[] = [
  { id: "connect", title: "Connect over MCP", description: "Add Web Agent to Claude or ChatGPT in three steps.", href: "/onboarding" },
  { id: "quickstart", title: "Quickstart", description: "Make your first agent call from code in five minutes." },
  { id: "api", title: "API reference", description: "Every endpoint, parameter and error code." },
];

/** Placeholder stories, one per team in MOCK_ROLE_POOLS. Replace with real ones before this page is public. */
export const SUCCESS_STORIES: { teamId: string; outcome: string; story: string; customer: string }[] = [
  {
    teamId: "customer-support",
    outcome: "Half of first replies drafted",
    story: "The Support Agent drafts first replies, and a person approves each one.",
    customer: "Acme Health",
  },
  {
    teamId: "sales",
    outcome: "3 hours back per rep, every week",
    story: "Discovery calls are summarized straight into the CRM.",
    customer: "Brightpath Solutions",
  },
  {
    teamId: "engineering",
    outcome: "Every pull request reviewed in minutes",
    story: "The Code Reviewer Agent flags risky changes before a person looks.",
    customer: "Northwind Labs",
  },
  {
    teamId: "customer-experience",
    outcome: "Feedback themes ready the same day",
    story: "Interview transcripts become a summary of themes overnight.",
    customer: "Lakeside Dental",
  },
];

/** Trust targets for next year (2027), worded as goals rather than claims. */
export const TRUST_POINTS: { label: string; detail: string }[] = [
  { label: "SOC 2 Type II", detail: "First audit completed" },
  { label: "GDPR", detail: "EU data residency available" },
  { label: "99.9% uptime", detail: "Across every service" },
  { label: "Your data stays yours", detail: "Never used to train models, in every contract" },
];

export const PLACEHOLDER_QUOTE = {
  quote: "We connected the Support Agent to Claude on a Monday. By Friday it was drafting half our first replies.",
  name: "Ana Lopes",
  title: "Head of Support, Acme Health",
};

/** The signed-in visitor's account, shown when the page is previewed signed in. */
export const MOCK_LANDING_ACCOUNT = {
  company: "Acme Health",
  type: "Client",
  plan: "Enterprise plan",
  accountManager: "Jordan Rivera",
};
