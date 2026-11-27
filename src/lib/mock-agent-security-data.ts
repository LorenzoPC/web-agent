// Mock data for Agent security (/app/settings/security): the rules a client
// organization's admin sets for what its agents may do, which data and models
// they may use, who approves, and what they may spend. Nothing here is live:
// the agents, the people and their permissions, usage and the decision log are
// all mock, and the page keeps every setting in its own state.
//
// The model follows ADR-0003 (MCP server security and governance), applied to
// the agents an organization runs:
//   - An agent acts as a person: the one who starts it, or the owner of a
//     scheduled agent. It never reaches more than that person can in the source
//     system (decision 8: effective access is the intersection).
//   - The organization's rules are a ceiling. An agent can be stricter, never
//     looser, and built-in minimums win over both (decision 6).
//   - An agent that reads text written outside the company, reads private data
//     and can reach outside has every outside action checked (decision 17, the
//     "lethal trifecta").
//   - Every action is logged with the rule that decided it (decision 29).
//
// BEFORE BUILDING THE REAL THING
//
// Three tags mark what isn't settled. Find them all with:
//   grep -n "VERIFY\|MOCK\|DECIDE" src/lib/mock-agent-security-data.ts src/lib/agent-security.ts
//
//   VERIFY  A vendor fact we haven't confirmed (model regions, retention).
//   MOCK    A placeholder for data the real system has to supply: the agent
//           registry, the directory, source-system permissions, usage, the log.
//   DECIDE  A product or security decision that's still open.
//
// Most important first:
//   1. DECIDE where "Asks the person first" happens for agents used from
//      Claude or ChatGPT over MCP. ADR-0003 decision 20 relies on elicitation,
//      which isn't verified in either client yet.
//   2. MOCK the agent registry: each agent's tools, the data each tool touches,
//      its action kind and its model come from the platform, not the client.
//   3. MOCK the person check. The real one asks each source system (Zendesk,
//      Salesforce, Stripe…) what the person may do, delegated or synced.
//   4. DECIDE whether built-in minimums can ever be lowered (e.g. a data owner
//      signing off on the trifecta, as ADR-0003 decision 17 allows for servers).
//   5. VERIFY each model provider's regions and retention terms before showing
//      them to clients.
//   6. DECIDE whether a change applies to runs already in progress, or only to
//      the next action an agent takes (ADR-0003 item 5 says the next call).

/** What an action does, from least to most risky. Every tool has one kind. */
export type ActionKind = "read" | "change" | "outside" | "irreversible";

/** How much oversight an action gets, from least to most. */
export type Oversight = "auto" | "confirm" | "approve" | "off";

export interface ActionKindInfo {
  id: ActionKind;
  label: string;
  examples: string;
  /** The value to pick. */
  recommended: Oversight;
  /** The tempting wrong choice, named beside the field. */
  not?: { value: Oversight; why: string };
  /** A built-in minimum that no rule or agent can go below. */
  floor?: { value: Oversight; why: string };
}

export const ACTION_KINDS: ActionKindInfo[] = [
  {
    id: "read",
    label: "Read your data",
    examples: "Search tickets, look up an account, read code",
    recommended: "auto",
  },
  {
    id: "change",
    label: "Change records",
    examples: "Update a ticket's fields, add an internal note, save a draft",
    recommended: "auto",
  },
  {
    id: "outside",
    label: "Reach outside the company",
    examples: "Email a customer, post a public reply, search the web",
    recommended: "confirm",
    not: { value: "auto", why: "no one sees what leaves the company" },
  },
  {
    id: "irreversible",
    label: "Move money or delete",
    examples: "Issue a credit, refund an invoice, delete a record",
    recommended: "approve",
    // DECIDE: whether an organization can ever lower this (open item 4).
    floor: { value: "approve", why: "Money and deletions always wait for an approver." },
  },
];

export type SourceId = "help-center" | "tickets" | "accounts" | "billing" | "code" | "surveys" | "mail" | "teams" | "web";

export type Sensitivity = "general" | "confidential" | "restricted";

export interface DataSource {
  id: SourceId;
  name: string;
  system: string;
  /**
   * Written by people outside the company (customers, the public web), so it
   * can carry instructions aimed at the agent.
   */
  untrusted: boolean;
  sensitivity: Sensitivity;
}

// MOCK: the organization's connected systems and how each is classed. The
// classes come from the data owner, per ADR-0003 decision 17.
export const DATA_SOURCES: Record<SourceId, DataSource> = {
  "help-center": { id: "help-center", name: "Help center articles", system: "Zendesk Guide", untrusted: false, sensitivity: "general" },
  tickets: { id: "tickets", name: "Support tickets", system: "Zendesk", untrusted: true, sensitivity: "confidential" },
  accounts: { id: "accounts", name: "Customer accounts", system: "Salesforce", untrusted: false, sensitivity: "confidential" },
  billing: { id: "billing", name: "Invoices and payments", system: "Stripe", untrusted: false, sensitivity: "restricted" },
  code: { id: "code", name: "Source code", system: "GitHub", untrusted: false, sensitivity: "confidential" },
  surveys: { id: "surveys", name: "Survey responses", system: "Microsoft Forms", untrusted: true, sensitivity: "confidential" },
  mail: { id: "mail", name: "Email", system: "Microsoft 365", untrusted: false, sensitivity: "confidential" },
  teams: { id: "teams", name: "Teams channels", system: "Microsoft Teams", untrusted: false, sensitivity: "confidential" },
  web: { id: "web", name: "Public web", system: "Web Search", untrusted: true, sensitivity: "general" },
};

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  general: "General",
  confidential: "Confidential",
  restricted: "Restricted",
};

export interface AgentTool {
  /** The tool's name as the agent calls it. */
  id: string;
  label: string;
  source: SourceId;
  /** What the person needs in the source system for the agent to use this tool for them. */
  access: "read" | "write";
  kind: ActionKind;
}

export type ProviderId = "sherweb" | "azure-openai" | "anthropic" | "openai";

export interface Agent {
  id: string;
  name: string;
  purpose: string;
  /** The team that runs it. */
  team: string;
  /** A person starts it, or it runs on a schedule as its owner. */
  trigger: { kind: "person" } | { kind: "schedule"; when: string };
  model: { name: string; provider: ProviderId };
  tools: AgentTool[];
}

// MOCK: the agent registry (open item 2). Two agents combine text written
// outside the company, private data and a way out: Reply Drafter (tickets,
// accounts, email) and Outreach Writer (the web, accounts, web search, whose
// queries leave the company).
export const AGENTS: Agent[] = [
  {
    id: "ticket-triage",
    name: "Ticket Triage",
    purpose: "Sorts new tickets by urgency and topic, and routes them to the right queue.",
    team: "Support",
    trigger: { kind: "schedule", when: "On every new ticket" },
    model: { name: "Llama 3.3 70B", provider: "sherweb" },
    tools: [
      { id: "search_tickets", label: "Search tickets", source: "tickets", access: "read", kind: "read" },
      { id: "get_account", label: "Look up the customer's account", source: "accounts", access: "read", kind: "read" },
      { id: "update_ticket_fields", label: "Set priority, topic and queue", source: "tickets", access: "write", kind: "change" },
    ],
  },
  {
    id: "reply-drafter",
    name: "Reply Drafter",
    purpose: "Drafts replies to customer tickets from the help center and the customer's account.",
    team: "Support",
    trigger: { kind: "person" },
    model: { name: "GPT-4.1", provider: "azure-openai" },
    tools: [
      { id: "search_tickets", label: "Search tickets", source: "tickets", access: "read", kind: "read" },
      { id: "get_account", label: "Look up the customer's account", source: "accounts", access: "read", kind: "read" },
      { id: "search_help_center", label: "Search help center articles", source: "help-center", access: "read", kind: "read" },
      { id: "add_internal_note", label: "Add an internal note", source: "tickets", access: "write", kind: "change" },
      { id: "post_public_reply", label: "Post a reply the customer sees", source: "tickets", access: "write", kind: "outside" },
      { id: "send_email", label: "Send an email", source: "mail", access: "write", kind: "outside" },
    ],
  },
  {
    id: "refund-assistant",
    name: "Refund Assistant",
    purpose: "Checks a customer's invoices and issues credits within your refund policy.",
    team: "Finance",
    trigger: { kind: "person" },
    model: { name: "GPT-4.1 mini", provider: "azure-openai" },
    tools: [
      { id: "get_account", label: "Look up the customer's account", source: "accounts", access: "read", kind: "read" },
      { id: "list_invoices", label: "List invoices and payments", source: "billing", access: "read", kind: "read" },
      { id: "issue_credit", label: "Issue a credit", source: "billing", access: "write", kind: "irreversible" },
    ],
  },
  {
    id: "outreach-writer",
    name: "Outreach Writer",
    purpose: "Researches a prospect and drafts a first email for the rep to send.",
    team: "Sales",
    trigger: { kind: "person" },
    model: { name: "GPT-4.1", provider: "azure-openai" },
    tools: [
      { id: "web_search", label: "Search the web", source: "web", access: "read", kind: "outside" },
      { id: "get_crm_account", label: "Read the account in Salesforce", source: "accounts", access: "read", kind: "read" },
      { id: "create_email_draft", label: "Save an email draft", source: "mail", access: "write", kind: "change" },
    ],
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    purpose: "Reviews pull requests for correctness and security, and comments on them.",
    team: "Engineering",
    trigger: { kind: "schedule", when: "On every pull request" },
    model: { name: "Claude Sonnet", provider: "anthropic" },
    tools: [
      { id: "read_repository", label: "Read the repository", source: "code", access: "read", kind: "read" },
      { id: "comment_on_pull_request", label: "Comment on the pull request", source: "code", access: "write", kind: "change" },
    ],
  },
  {
    id: "cx-digest",
    name: "Weekly CX Digest",
    purpose: "Summarizes the week's survey responses and posts the themes for the product team.",
    team: "Customer Success",
    trigger: { kind: "schedule", when: "Mondays at 8:00" },
    model: { name: "Llama 3.3 70B", provider: "sherweb" },
    tools: [
      { id: "read_survey_responses", label: "Read survey responses", source: "surveys", access: "read", kind: "read" },
      { id: "post_to_channel", label: "Post in a Teams channel", source: "teams", access: "write", kind: "change" },
    ],
  },
];

export interface Person {
  id: string;
  name: string;
  title: string;
  group: string;
  /** What the person may do in each source system. Missing means no access. */
  access: Partial<Record<SourceId, "read" | "write">>;
}

// MOCK: from the identity provider (name, group) and each source system
// (access), open item 3. Maya can read invoices but not issue credits, so
// Refund Assistant can't issue one for her.
export const PEOPLE: Person[] = [
  {
    id: "maya",
    name: "Maya Chen",
    title: "Support lead",
    group: "Support",
    access: { tickets: "write", "help-center": "read", accounts: "read", billing: "read", mail: "write", teams: "write", web: "read" },
  },
  {
    id: "ana",
    name: "Ana Souza",
    title: "Billing manager",
    group: "Finance",
    access: { billing: "write", accounts: "read", tickets: "read", mail: "write", teams: "write", web: "read" },
  },
  {
    id: "jordan",
    name: "Jordan Blake",
    title: "Account executive",
    group: "Sales",
    access: { accounts: "write", "help-center": "read", mail: "write", teams: "write", web: "read" },
  },
  {
    id: "liam",
    name: "Liam Patel",
    title: "Staff engineer",
    group: "Engineering",
    access: { code: "write", tickets: "read", "help-center": "read", mail: "write", teams: "write", web: "read" },
  },
  {
    id: "priya",
    name: "Priya Raman",
    title: "CX manager",
    group: "Customer Success",
    access: { surveys: "read", accounts: "read", "help-center": "read", mail: "write", teams: "write", web: "read" },
  },
];

export type RegionId = "canada" | "us" | "eu" | "any";

export const REGIONS: { id: RegionId; label: string }[] = [
  { id: "canada", label: "Canada" },
  { id: "us", label: "United States" },
  { id: "eu", label: "European Union" },
  { id: "any", label: "Any region" },
];

export interface ModelProvider {
  id: ProviderId;
  name: string;
  models: string;
  /** Where it can process data. */
  regions: Exclude<RegionId, "any">[];
}

// VERIFY: regions and retention per provider (open item 5). Claude is left out
// of Canada here so the mock shows a region rule blocking an agent.
export const PROVIDERS: ModelProvider[] = [
  { id: "sherweb", name: "Sherweb cloud", models: "Open models, such as Llama", regions: ["canada"] },
  { id: "azure-openai", name: "Azure OpenAI", models: "GPT models", regions: ["canada", "us", "eu"] },
  { id: "anthropic", name: "Anthropic", models: "Claude models", regions: ["us", "eu"] },
  { id: "openai", name: "OpenAI", models: "GPT models", regions: ["us", "eu"] },
];

export interface FieldType {
  id: string;
  label: string;
  example: string;
}

// DECIDE: masking happens before the model sees the text and before the log
// stores it. Whether agents can ask a person to reveal a field is open.
export const HIDDEN_FIELD_TYPES: FieldType[] = [
  { id: "card", label: "Card numbers", example: "4111 •••• •••• 1111" },
  { id: "bank", label: "Bank account numbers", example: "Transit and account numbers, IBANs" },
  { id: "gov-id", label: "Government ID numbers", example: "SIN, SSN, National Insurance" },
  { id: "secrets", label: "Passwords and keys pasted into text", example: "API keys, one-time codes" },
  { id: "birth", label: "Dates of birth", example: "1984-03-12" },
  { id: "phone", label: "Personal phone numbers", example: "Mobile numbers in signatures" },
];

export type ExpiryId = "1h" | "8h" | "24h" | "3d";

export const EXPIRY_OPTIONS: { id: ExpiryId; label: string }[] = [
  { id: "1h", label: "1 hour" },
  { id: "8h", label: "8 hours" },
  { id: "24h", label: "24 hours" },
  { id: "3d", label: "3 days" },
];

/** One agent's settings: who may use it, who it acts as, and where it's stricter than the organization's rules. */
export interface AgentPolicy {
  /** Groups whose people may start it. Only for agents a person starts. */
  usedBy: string[];
  /** The person a scheduled agent acts as. */
  ownerId?: string;
  /** Tool id → a stricter level than the organization's rule. */
  overrides: Partial<Record<string, Oversight>>;
}

export interface SecuritySettings {
  rules: Record<ActionKind, Oversight>;
  agents: Record<string, AgentPolicy>;
  hiddenFields: Record<string, boolean>;
  region: RegionId;
  providers: Record<ProviderId, boolean>;
  approvers: string[];
  approvalExpiry: ExpiryId;
  /** Dollars per person per day. */
  personDailyLimit: number;
  /** Dollars per month for the whole organization. */
  monthlyBudget: number;
  onBudgetOut: "stop" | "alert";
}

// MOCK: the organization's saved settings. The page keeps them in state;
// nothing is persisted.
export const INITIAL_SETTINGS: SecuritySettings = {
  rules: { read: "auto", change: "auto", outside: "confirm", irreversible: "approve" },
  agents: {
    "ticket-triage": { usedBy: [], ownerId: "maya", overrides: {} },
    "reply-drafter": { usedBy: ["Support"], overrides: {} },
    "refund-assistant": { usedBy: ["Support", "Finance"], overrides: {} },
    "outreach-writer": { usedBy: ["Sales"], overrides: {} },
    "code-reviewer": { usedBy: [], ownerId: "liam", overrides: {} },
    "cx-digest": { usedBy: [], ownerId: "priya", overrides: {} },
  },
  hiddenFields: { card: true, bank: true, "gov-id": true, secrets: true, birth: true, phone: false },
  region: "canada",
  providers: { sherweb: true, "azure-openai": true, anthropic: true, openai: false },
  approvers: ["Finance", "IT admins"],
  approvalExpiry: "24h",
  personDailyLimit: 25,
  monthlyBudget: 4000,
  onBudgetOut: "stop",
};

// MOCK: from usage metering.
export const MONTH_SPEND = 2680;

// MOCK: from the approvals queue.
export const PENDING_APPROVALS = 3;

export type LogResult = "ran" | "confirmed" | "approved" | "waiting" | "declined" | "blocked";

export interface LogEntry {
  id: string;
  when: string;
  personId: string;
  agentId: string;
  toolId: string;
  result: LogResult;
  /** Who confirmed, approved or declined, when someone did. */
  by?: string;
  /** The rule that decided it, as recorded at the time. */
  rule: string;
}

// MOCK: the append-only decision log (ADR-0003 decision 29). Rules are worded
// as they stood when each action ran, so they can differ from today's settings.
export const DECISION_LOG: LogEntry[] = [
  {
    id: "l1",
    when: "Today 10:42",
    personId: "maya",
    agentId: "reply-drafter",
    toolId: "send_email",
    result: "confirmed",
    by: "Maya Chen",
    rule: "Reach outside the company: asks the person first",
  },
  {
    id: "l2",
    when: "Today 10:31",
    personId: "ana",
    agentId: "refund-assistant",
    toolId: "issue_credit",
    result: "waiting",
    rule: "Built in: money and deletions wait for an approver",
  },
  {
    id: "l3",
    when: "Today 10:17",
    personId: "maya",
    agentId: "refund-assistant",
    toolId: "issue_credit",
    result: "blocked",
    rule: "Maya Chen can't change invoices and payments in Stripe",
  },
  {
    id: "l4",
    when: "Today 09:58",
    personId: "maya",
    agentId: "ticket-triage",
    toolId: "update_ticket_fields",
    result: "ran",
    rule: "Change records: runs on its own",
  },
  {
    id: "l5",
    when: "Today 09:40",
    personId: "jordan",
    agentId: "outreach-writer",
    toolId: "web_search",
    result: "confirmed",
    by: "Jordan Blake",
    rule: "Built in: this agent reads private data and the web, so outside actions are checked",
  },
  {
    id: "l6",
    when: "Today 09:12",
    personId: "liam",
    agentId: "code-reviewer",
    toolId: "read_repository",
    result: "blocked",
    rule: "Anthropic doesn't process data in Canada",
  },
  {
    id: "l7",
    when: "Yesterday 16:05",
    personId: "ana",
    agentId: "refund-assistant",
    toolId: "issue_credit",
    result: "approved",
    by: "Sam Okafor (Finance)",
    rule: "Built in: money and deletions wait for an approver",
  },
  {
    id: "l8",
    when: "Yesterday 14:22",
    personId: "maya",
    agentId: "reply-drafter",
    toolId: "post_public_reply",
    result: "declined",
    by: "Maya Chen",
    rule: "Reach outside the company: asks the person first",
  },
];
