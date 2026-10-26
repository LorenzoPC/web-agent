import {
  MOCK_BUSINESS_UNITS,
  MOCK_UNIT_COVERAGE,
  type MockMetric,
  type MockNotification,
  type MockPhaseCoverage,
  type MockPriority,
  type MockTaskProcess,
  type MockUnitCoverage,
} from "./mock-data";

// Product dashboard (/product) — the same bands as the Overview, for the PM of the
// agentic product or the manager of one of its supporting functions. Those
// functions are MOCK_BUSINESS_UNITS; a "lens" scopes the screen to one of them.
// Kept apart from mock-data.ts so the two screens' data can evolve separately.

export const ALL_FUNCTIONS = "all";

export interface MockLens {
  id: string;
  name: string;
  /** Fits a feed chip. */
  short: string;
}

const SHORT_NAMES: Record<string, string> = {
  "customer-support": "Support",
  sales: "Sales",
  engineering: "Eng",
  "customer-experience": "CX",
};

export const MOCK_LENSES: MockLens[] = [
  { id: ALL_FUNCTIONS, name: "All functions", short: "Product" },
  ...MOCK_BUSINESS_UNITS.map((unit) => ({
    id: unit.id,
    name: unit.name,
    short: SHORT_NAMES[unit.id] ?? unit.name,
  })),
];

export const MOCK_PRODUCT_METRICS: Record<string, MockMetric[]> = {
  [ALL_FUNCTIONS]: [
    { id: "activation", label: "Activation rate", value: 38.5, format: "percent", change: 4.2, comparedTo: "last month", higherIsBetter: true },
    { id: "eval-pass", label: "Eval pass rate", value: 87.4, format: "percent", change: -2.1, comparedTo: "last release", higherIsBetter: true },
    { id: "autonomy", label: "Autonomy rate", value: 71.3, format: "percent", change: 3.0, comparedTo: "last month", higherIsBetter: true },
    { id: "cost-per-task", label: "Cost per task", value: 0.042, format: "usd", change: 0.18, comparedTo: "last month", higherIsBetter: false },
  ],
  "customer-support": [
    { id: "tickets", label: "Tickets this week", value: 1124, format: "count", change: 0.09, comparedTo: "last week", higherIsBetter: false },
    { id: "agent-resolved", label: "Resolved by agents", value: 58.2, format: "percent", change: 3.4, comparedTo: "last week", higherIsBetter: true },
    { id: "csat", label: "CSAT", value: 86.0, format: "percent", change: -1.5, comparedTo: "last week", higherIsBetter: true },
    { id: "escalations", label: "Escalations to Eng", value: 37, format: "count", change: -0.12, comparedTo: "last week", higherIsBetter: false },
  ],
  sales: [
    { id: "pipeline", label: "Pipeline influenced", value: 2_400_000, format: "usd", change: 0.11, comparedTo: "last quarter", higherIsBetter: true },
    { id: "blocked-deals", label: "Deals blocked by a gap", value: 14, format: "count", change: 0.4, comparedTo: "last month", higherIsBetter: false },
    { id: "trial-to-paid", label: "Trial-to-paid", value: 21.6, format: "percent", change: 1.8, comparedTo: "last month", higherIsBetter: true },
    { id: "sales-cycle", label: "Sales cycle (days)", value: 38, format: "count", change: -0.05, comparedTo: "last quarter", higherIsBetter: false },
  ],
  "customer-experience": [
    { id: "nps", label: "NPS", value: 42, format: "score", change: 4, comparedTo: "last quarter", higherIsBetter: true },
    { id: "churn-risk", label: "Accounts at churn risk", value: 23, format: "count", change: 0.15, comparedTo: "last month", higherIsBetter: false },
    { id: "nrr", label: "Net revenue retention", value: 112.0, format: "percent", change: 2.0, comparedTo: "last quarter", higherIsBetter: true },
    { id: "thumbs-down", label: "Thumbs-down rate", value: 6.8, format: "percent", change: 1.9, comparedTo: "last week", higherIsBetter: false },
  ],
  engineering: [
    { id: "incidents", label: "Open incidents", value: 3, format: "count", change: -0.4, comparedTo: "last week", higherIsBetter: false },
    { id: "p95-latency", label: "p95 task latency", value: 8.2, format: "seconds", change: 0.12, comparedTo: "last week", higherIsBetter: false },
    { id: "inference-spend", label: "Inference spend (Oct)", value: 48_210, format: "usd", change: 0.09, comparedTo: "budget", higherIsBetter: false },
    { id: "deploys", label: "Deploys this week", value: 17, format: "count", change: 0.06, comparedTo: "last week", higherIsBetter: true },
  ],
};

export interface MockProductNotification extends MockNotification {
  /** The function it came from; omitted for product-wide news, which every lens shows. */
  functionId?: string;
}

export const MOCK_PRODUCT_NOTIFICATIONS: MockProductNotification[] = [
  {
    id: "pn-eval-regression",
    kind: "alert",
    functionId: "engineering",
    title: "Code Reviewer eval pass rate fell 6 pts after the switch to Haiku 4.5",
    tone: "critical",
    unread: true,
    createdAt: "2026-10-23T09:50:00Z",
  },
  {
    id: "pn-prompt-v12",
    kind: "approval",
    title: "Support Agent prompt v12 is ready to ship and waiting on your call",
    tone: "neutral",
    unread: true,
    createdAt: "2026-10-23T09:10:00Z",
  },
  {
    id: "pn-anthropic-latency",
    kind: "alert",
    functionId: "engineering",
    title: "Anthropic API latency elevated — Summarizer and Code Reviewer runs are slower",
    tone: "warning",
    unread: true,
    createdAt: "2026-10-23T08:55:00Z",
  },
  {
    id: "pn-gpt-retirement",
    kind: "alert",
    functionId: "engineering",
    title: "OpenAI retires GPT-5.4 on Dec 1 — 3 agents still use it",
    tone: "warning",
    unread: true,
    createdAt: "2026-10-23T08:30:00Z",
  },
  {
    id: "pn-research-thumbs-down",
    kind: "insight",
    functionId: "customer-experience",
    title: "Thumbs-down on Research Agent answers doubled this week",
    tone: "warning",
    unread: true,
    createdAt: "2026-10-23T07:45:00Z",
  },
  {
    id: "pn-acme-escalation",
    kind: "escalation",
    functionId: "customer-support",
    title: "Acme Corp escalated: an agent promised a refund it can't issue",
    tone: "critical",
    unread: true,
    createdAt: "2026-10-23T06:20:00Z",
  },
  {
    id: "pn-salesforce-deals",
    kind: "deal",
    functionId: "sales",
    title: "Two enterprise deals stalled on the missing Salesforce connector",
    tone: "warning",
    unread: false,
    createdAt: "2026-10-22T21:00:00Z",
  },
  {
    id: "pn-release-2-14",
    kind: "release",
    title: "Release 2.14 shipped: Flow tab and prompt versioning",
    tone: "good",
    unread: false,
    createdAt: "2026-10-22T17:30:00Z",
  },
  {
    id: "pn-trial-conversion",
    kind: "insight",
    functionId: "sales",
    title: "Trial-to-paid conversion hit 21.6%, a 6-month high",
    tone: "good",
    unread: false,
    createdAt: "2026-10-22T15:10:00Z",
  },
  {
    id: "pn-dormant-accounts",
    kind: "insight",
    functionId: "customer-experience",
    title: "14 accounts haven't run an agent in 30 days",
    tone: "warning",
    unread: false,
    createdAt: "2026-10-22T09:40:00Z",
  },
  {
    id: "pn-support-backlog",
    kind: "escalation",
    functionId: "customer-support",
    title: "Support backlog passed 200 tickets for the first time this quarter",
    tone: "warning",
    unread: false,
    createdAt: "2026-10-21T16:00:00Z",
  },
  {
    id: "pn-activation",
    kind: "insight",
    title: "Activation up 4.2 pts since the onboarding checklist launched",
    tone: "good",
    unread: false,
    createdAt: "2026-10-21T10:20:00Z",
  },
];

export interface MockProductPriority extends MockPriority {
  /** Other functions the decision touches; `businessUnitId` is the one that raised it. */
  affects: string[];
}

// Ranked: a lens shows the first five that its function raised or is affected by.
export const MOCK_PRODUCT_PRIORITIES: MockProductPriority[] = [
  {
    id: "pp-ship-prompt-v12",
    title: "Ship Support Agent prompt v12?",
    businessUnitId: "customer-support",
    affects: ["customer-experience"],
    context:
      "Evals +3 pts and refund-promise errors down 80% in testing, but longer replies raise cost per task 18%. Shipping should cut escalations by about a quarter.",
    actions: [{ label: "See evidence", href: "/prompts" }, { label: "Ship v12" }],
  },
  {
    id: "pp-code-reviewer-regression",
    title: "Fix the Code Reviewer eval regression",
    businessUnitId: "engineering",
    affects: ["customer-experience"],
    context:
      "Pass rate fell from 87% to 81% after the move to Haiku 4.5 to save cost. Misses cluster in security checks. Reverting the model costs about $2.1K a month.",
    actions: [{ label: "See failures", href: "/builder" }, { label: "Revert model" }],
  },
  {
    id: "pp-gpt-migration",
    title: "Move 3 agents off GPT-5.4 by Dec 1",
    businessUnitId: "engineering",
    affects: ["customer-support", "sales"],
    context:
      "OpenAI retires GPT-5.4 on Dec 1. The Research, Support, and Data Analyst agents still use it. Two replacements pass current evals; one agent needs a prompt rework.",
    actions: [{ label: "See models", href: "/builder" }, { label: "Plan migration" }],
  },
  {
    id: "pp-salesforce-connector",
    title: "Prioritize a Salesforce connector",
    businessUnitId: "sales",
    affects: ["customer-experience"],
    context:
      "14 open deals worth $610K list it as a must-have, two of them enterprise. It's also the top request from current accounts. An MCP-based build is about 3 weeks.",
    actions: [{ label: "See deals" }, { label: "Draft spec" }],
  },
  {
    id: "pp-starter-margin",
    title: "Stop Starter-plan margin loss",
    affects: ["sales", "customer-experience", "engineering"],
    context:
      "The heaviest 5% of Starter workspaces cost $41 a month in inference on a $29 plan. A usage cap or a nudge to Pro fixes it without touching most users.",
    actions: [{ label: "See cohort" }, { label: "Model pricing" }],
  },
  {
    id: "pp-dormant-accounts",
    title: "Re-engage 14 dormant accounts",
    businessUnitId: "customer-experience",
    affects: ["sales", "customer-support"],
    context:
      "14 accounts haven't run an agent in 30 days, 9 of them up for renewal this quarter. Most stalled at connecting their first data source during onboarding.",
    actions: [{ label: "See accounts" }, { label: "Run playbook" }],
  },
  {
    id: "pp-refund-guardrail",
    title: "Add a refund-promise guardrail",
    businessUnitId: "customer-support",
    affects: ["engineering"],
    context:
      "Agents promised refunds they can't issue in 23 conversations this month, Acme included. A policy check before sending blocks these without new prompts.",
    actions: [{ label: "See chats" }, { label: "Draft policy", href: "/prompts" }],
  },
  {
    id: "pp-support-backlog",
    title: "Get the support backlog under 150",
    businessUnitId: "customer-support",
    affects: [],
    context:
      "The backlog passed 200 tickets for the first time this quarter, mostly onboarding questions after Release 2.14. Two help articles and a triage update cover most.",
    actions: [{ label: "See backlog" }, { label: "Update triage" }],
  },
  {
    id: "pp-research-feedback",
    title: "Explain the Research Agent thumbs-down spike",
    businessUnitId: "customer-experience",
    affects: ["engineering"],
    context:
      "Thumbs-down on Research Agent answers doubled this week. Early reads point to stale sources after a search-provider change, not the model itself.",
    actions: [{ label: "See feedback" }, { label: "Open evals", href: "/builder" }],
  },
  {
    id: "pp-flow-enablement",
    title: "Package the Flow tab for enterprise demos",
    businessUnitId: "sales",
    affects: [],
    context:
      "Release 2.14's Flow tab is the most-asked-about feature in demos this month, but there's no demo script or one-pager. Reps want both before QBR season.",
    actions: [{ label: "Draft brief" }, { label: "Book session" }],
  },
];

export type MockSystemStatus = "operational" | "degraded" | "down";

export interface MockSystem {
  id: string;
  name: string;
  status: MockSystemStatus;
  /** Short reading beside the status — latency, queue depth, or what's failing. */
  detail: string;
}

export const MOCK_SYSTEMS: MockSystem[] = [
  { id: "pipeline-runner", name: "Pipeline runner", status: "operational", detail: "p95 2.1s" },
  { id: "openai", name: "OpenAI API", status: "operational", detail: "p95 1.4s" },
  { id: "anthropic", name: "Anthropic API", status: "degraded", detail: "Elevated latency" },
  { id: "local-models", name: "Local models", status: "operational", detail: "3 models loaded" },
  { id: "exa-search", name: "Exa Search", status: "operational", detail: "p95 640ms" },
  { id: "github-mcp", name: "GitHub MCP", status: "down", detail: "Token missing" },
  { id: "eval-runner", name: "Eval runner", status: "degraded", detail: "40 min behind" },
  { id: "neon", name: "Neon Postgres", status: "operational", detail: "p95 12ms" },
  { id: "vercel", name: "Vercel deploys", status: "operational", detail: "Last one 2h ago" },
];

// "Our team": how much of our own functions' work runs on agents — the Overview's data.
export const MOCK_TEAM_COVERAGE: MockUnitCoverage[] = MOCK_UNIT_COVERAGE;

// "Our customers": workspaces with an agent on each target use case's processes,
// per phase; `total` is the workspaces that bought that use case.
const CUSTOMER_COUNTS: Record<string, Record<MockTaskProcess["phase"], MockPhaseCoverage>> = {
  "customer-support": {
    pre: { live: 212, pilot: 61, total: 480 },
    work: { live: 301, pilot: 48, total: 480 },
    post: { live: 96, pilot: 40, total: 480 },
  },
  sales: {
    pre: { live: 58, pilot: 30, total: 260 },
    work: { live: 121, pilot: 22, total: 260 },
    post: { live: 34, pilot: 19, total: 260 },
  },
  engineering: {
    pre: { live: 150, pilot: 41, total: 340 },
    work: { live: 228, pilot: 30, total: 340 },
    post: { live: 120, pilot: 35, total: 340 },
  },
  "customer-experience": {
    pre: { live: 41, pilot: 22, total: 190 },
    work: { live: 37, pilot: 18, total: 190 },
    post: { live: 66, pilot: 25, total: 190 },
  },
};

const NO_CUSTOMERS: MockPhaseCoverage = { live: 0, pilot: 0, total: 0 };

export const MOCK_CUSTOMER_COVERAGE: MockUnitCoverage[] = MOCK_BUSINESS_UNITS.map((unit) => ({
  businessUnitId: unit.id,
  name: unit.name,
  phases: CUSTOMER_COUNTS[unit.id] ?? { pre: NO_CUSTOMERS, work: NO_CUSTOMERS, post: NO_CUSTOMERS },
}));
