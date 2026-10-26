import type { PipelineStep } from "./types";

// Placeholder data for the Dashboard/Marketplace UI mockup, ahead of wiring real
// persistence (role column + pipeline_runs table + queries). Shapes are kept close
// to what the real data will look like so swapping in real queries later is a
// drop-in replacement, not a rewrite.

export const MOCK_AGENTS: PipelineStep[] = [
  {
    id: "curated:agent-research",
    name: "Research Agent",
    role: "Research Analyst",
    description: "Gathers and synthesizes information on a topic into a clear, sourced summary",
    systemPrompt:
      "You are a research agent. Given a topic or question, gather and synthesize relevant " +
      "information into a clear, well-organized summary. Cite sources when possible and flag uncertainty.",
    sourceType: "api",
    sourceLabel: "OpenAI · Research Agent",
    stepKind: "chat",
    modelRef: "openai > gpt-5.4",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
  },
  {
    id: "curated:agent-summarizer",
    name: "Summarizer Agent",
    role: "Content Summarizer",
    description: "Condenses content into a concise, accurate summary",
    systemPrompt:
      "You are a summarizer agent. Condense the given content into a concise, accurate summary, " +
      "preserving key facts and figures. Prefer bullet points for structure.",
    sourceType: "api",
    sourceLabel: "Anthropic · Summarizer Agent",
    stepKind: "chat",
    modelRef: "anthropic > claude-haiku-4.5",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "tokens", inputPerMillion: 1, outputPerMillion: 5 },
  },
  {
    id: "curated:agent-support",
    name: "Support Agent",
    role: "Customer Support Specialist",
    description: "Answers user questions helpfully, staying within the provided context",
    systemPrompt:
      "You are a customer support agent. Respond helpfully and empathetically to user questions, " +
      "staying strictly within the provided context. Say you don't know rather than guessing.",
    sourceType: "api",
    sourceLabel: "OpenAI · Support Agent",
    stepKind: "chat",
    modelRef: "openai > gpt-5.4",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
  },
  {
    id: "curated:agent-code-reviewer",
    name: "Code Reviewer Agent",
    role: "Code Reviewer",
    description: "Reviews code or diffs for correctness, security, and style issues",
    systemPrompt:
      "You are a code reviewer agent. Analyze the given code or diff for correctness, security " +
      "issues, and style problems. Be specific and reference line numbers where possible.",
    sourceType: "api",
    sourceLabel: "Anthropic · Code Reviewer Agent",
    stepKind: "chat",
    modelRef: "anthropic > claude-haiku-4.5",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "tokens", inputPerMillion: 1, outputPerMillion: 5 },
  },
  {
    id: "curated:agent-data-analyst",
    name: "Data Analyst Agent",
    role: "Data Analyst",
    description: "Identifies trends, anomalies, and insights from data",
    systemPrompt:
      "You are a data analyst agent. Given data or a description of data, identify trends, " +
      "anomalies, and actionable insights. Present findings clearly, quantify where possible.",
    sourceType: "api",
    sourceLabel: "OpenAI · Data Analyst Agent",
    stepKind: "chat",
    modelRef: "openai > gpt-5.4",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
  },
  {
    id: "curated:agent-general",
    name: "General Assistant Agent",
    role: "General Assistant",
    description: "A general-purpose local assistant, no per-call cost",
    systemPrompt:
      "You are a general-purpose assistant agent. Help with the given task directly and " +
      "concisely, asking clarifying questions only when necessary.",
    sourceType: "local",
    sourceLabel: "Ollama · General Assistant Agent",
    stepKind: "chat",
    modelRef: "local > llama3.2:latest",
    unit: "1K tokens",
    estimatedUnits: 3,
    cost: { kind: "free" },
  },
];

export interface MockPoolAgent {
  name: string;
  note: string;
}

/** Business processes a role could support, grouped by when they happen relative to the triggering work. */
export interface MockProcessPhases {
  /** Before work happens — a user asks something, or a system notices something. */
  pre: string[];
  /** The work done to create value in direct response to that trigger. */
  work: string[];
  /** Follow-up or enhancement work, uncalled for by the user. */
  post: string[];
}

export interface MockAgentPool {
  id: string;
  name: string;
  description: string;
  entryCount: number;
  /** Agents mapped into this pool so far — shown when the pool card is expanded. Empty until mapped. */
  agents?: MockPoolAgent[];
  /** Business processes this role could support, grouped by phase — shown when the pool card is expanded. */
  processes?: MockProcessPhases;
}

export const MOCK_CAPABILITY_POOLS: MockAgentPool[] = [
  { id: "natural-language-processing", name: "Natural Language Processing", description: "Text generation, chat, and reasoning models", entryCount: 142 },
  { id: "agentic-tool-use", name: "Agentic Tool Use", description: "Models and agents that plan and call tools", entryCount: 58 },
  { id: "search", name: "Search", description: "Retrieval and web/document search", entryCount: 24 },
  { id: "embeddings-retrieval", name: "Embeddings & Retrieval", description: "Embedding models for RAG and semantic search", entryCount: 31 },
  { id: "computer-vision", name: "Computer Vision", description: "Image understanding and classification", entryCount: 19 },
  { id: "image-generation", name: "Image Generation", description: "Text-to-image and image editing models", entryCount: 27 },
  { id: "video-generation", name: "Video Generation", description: "Text-to-video and video editing models", entryCount: 12 },
  { id: "speech-audio", name: "Speech & Audio", description: "Transcription, text-to-speech, and audio models", entryCount: 21 },
  { id: "multimodal", name: "Multimodal", description: "Models that combine text, image, audio, or video", entryCount: 16 },
];

export const MOCK_ROLE_POOLS: MockAgentPool[] = [
  {
    id: "customer-support",
    name: "Customer Support",
    description: "Agents that handle support tickets and user questions",
    entryCount: 34,
    processes: {
      pre: [
        "Triage and route incoming tickets by urgency and topic",
        "Detect at-risk or escalating customers and flag for a human",
        "Auto-tag tickets with product area/feature for reporting",
        "Detect duplicate tickets and merge or link them",
        "Monitor SLA breach risk and alert queue owners",
      ],
      work: [
        "Draft first-response replies to common questions",
        "Summarize long ticket threads for handoff between agents",
        "Translate tickets for non-native-language customers",
        "Suggest macros or canned responses based on ticket content",
        "Draft refund/credit request summaries for approval",
      ],
      post: [
        "Turn resolved tickets into knowledge-base drafts",
        "Send post-resolution satisfaction follow-ups",
        "Generate weekly ticket-volume and trend reports",
        "Pre-fill bug reports from support tickets for engineering handoff",
        "Identify upsell/renewal opportunities surfaced in conversations",
        "Onboard new support agents with guided Q&A on policies",
      ],
    },
  },
  {
    id: "sales",
    name: "Sales",
    description: "Agents that qualify leads and assist with outreach",
    entryCount: 22,
    processes: {
      pre: [
        "Qualify inbound leads against ICP criteria",
        "Flag stalled deals for rep attention",
        "Score and prioritize leads by likelihood to convert",
        "Generate account research briefs ahead of meetings",
        "Monitor buying signals from news, social, and job postings",
        "Prepare objection-handling talking points per deal",
      ],
      work: [
        "Research prospects and draft personalized outreach",
        "Summarize discovery calls into CRM notes",
        "Draft proposal and quote follow-ups",
        "Pull competitive battlecards during live calls",
        "Auto-populate CRM fields from call transcripts and emails",
      ],
      post: [
        "Draft personalized follow-up sequences after events/webinars",
        "Identify cross-sell/upsell opportunities in existing accounts",
        "Draft renewal and contract-expiration outreach",
        "Summarize win/loss reasons across closed deals",
        "Forecast pipeline health and flag at-risk quota gaps",
      ],
    },
  },
  {
    id: "engineering",
    name: "Engineering",
    description: "Agents that review code, triage issues, and assist builds",
    entryCount: 47,
    agents: [
      { name: "Support Agent", note: "Handles support tickets" },
      { name: "Code Reviewer Agent", note: "Reviews all PR changes" },
    ],
    processes: {
      pre: [
        "Triage and label incoming bug reports",
        "Flag flaky tests or CI failures with a likely root cause",
        "Summarize dependency/library upgrade impacts before merging",
        "Monitor build/deploy pipelines and alert on anomalies",
        "Detect and summarize recurring error patterns in logs",
        "Estimate ticket complexity/effort for sprint planning",
      ],
      work: [
        "Review pull requests for correctness, security, and style",
        "Answer on-call questions against runbooks and docs",
        "Draft technical design docs from meeting notes/requirements",
        "Generate unit test scaffolding for new code",
        "Answer developer onboarding questions from internal docs",
        "Cross-reference code changes against compliance requirements",
      ],
      post: [
        "Summarize incident postmortems",
        "Draft release notes from merged PRs",
        "Draft changelogs and migration guides for breaking changes",
        "Suggest refactors for code flagged as high-complexity/debt",
      ],
    },
  },
  {
    id: "customer-experience",
    name: "Customer Experience",
    description: "Agents that analyze feedback and improve customer journeys",
    entryCount: 18,
    processes: {
      pre: [
        "Monitor sentiment across reviews and social mentions",
        "Surface churn-risk signals from usage and feedback data",
        "Segment customers by behavior for targeted experience programs",
        "Identify friction points in onboarding flows from usage data",
        "Track feature-request frequency and impact across feedback",
        "Flag inconsistent experience across support channels",
        "Recommend proactive outreach for customers nearing renewal",
      ],
      work: [
        "Summarize customer advisory board/interview transcripts",
        "Draft personalized responses to individual pieces of customer feedback",
        "Answer follow-up questions during a live customer interview or advisory session",
        "Prepare a tailored CX briefing ahead of a specific customer's QBR",
        "Compile a specific customer's full journey history on request from support/sales",
      ],
      post: [
        "Analyze support and survey feedback for recurring themes",
        "Summarize NPS/CSAT verbatims into trends",
        "Draft customer-journey improvement recommendations",
        "Compile a voice-of-customer digest for product teams",
        "Benchmark experience metrics against prior periods/competitors",
        "Draft personalized re-engagement campaigns for dormant users",
        "Draft executive-ready CX health summaries",
        "Correlate CX metrics with revenue/retention outcomes",
      ],
    },
  },
];

export type MockRunStatus = "success" | "partial" | "error";

export interface MockRun {
  id: string;
  rootInput: string;
  status: MockRunStatus;
  totalCostUsd: number;
  stepCount: number;
  completedAt: string;
}

export const MOCK_RUNS: MockRun[] = [
  {
    id: "run-1",
    rootInput: "Daily summary of game results for American basketball, in email format",
    status: "success",
    totalCostUsd: 0.0412,
    stepCount: 3,
    completedAt: "2026-10-23T07:00:00Z",
  },
  {
    id: "run-2",
    rootInput: "Summarize the latest deployment status for this project",
    status: "success",
    totalCostUsd: 0.0187,
    stepCount: 3,
    completedAt: "2026-10-22T18:47:00Z",
  },
  {
    id: "run-3",
    rootInput: "Review the latest PR diff for security issues and post a summary",
    status: "partial",
    totalCostUsd: 0.0093,
    stepCount: 3,
    completedAt: "2026-10-22T09:05:00Z",
  },
];

// See docs/project/pattern_libraries.md — V1 Flow Patterns are curated/seeded,
// linear only. Each slot is a placeholder agent-task, bound to a real agent +
// task instructions when a pattern is used to build a flow.
export interface MockPatternSlot {
  taskLabel: string;
  defaultInstructions: string;
}

export interface MockFlowPattern {
  id: string;
  name: string;
  description: string;
  slots: MockPatternSlot[];
}

export const MOCK_FLOW_PATTERNS: MockFlowPattern[] = [
  {
    id: "single-agent",
    name: "Single Agent",
    description: "One agent handles the entire task end to end. The default pattern — equivalent to today's Ecosystem builder.",
    slots: [
      {
        taskLabel: "Complete the task",
        defaultInstructions: "Handle the full request end to end, using the input as context.",
      },
    ],
  },
  {
    id: "research-synthesize",
    name: "Research → Synthesize",
    description: "One agent gathers information, a second agent turns it into a polished result.",
    slots: [
      {
        taskLabel: "Research the topic",
        defaultInstructions: "Gather relevant facts, sources, and context on the given topic.",
      },
      {
        taskLabel: "Synthesize the findings",
        defaultInstructions: "Turn the research into a clear, well-organized final output.",
      },
    ],
  },
  {
    id: "draft-review",
    name: "Draft → Review",
    description: "One agent produces a first draft, a second agent reviews and refines it.",
    slots: [
      {
        taskLabel: "Draft the output",
        defaultInstructions: "Produce a first draft based on the input.",
      },
      {
        taskLabel: "Review and refine",
        defaultInstructions: "Review the draft for accuracy, clarity, and tone, and produce a refined final version.",
      },
    ],
  },
  {
    id: "triage-handle-notify",
    name: "Triage → Handle → Notify",
    description: "One agent classifies the request, a second handles it, a third summarizes the outcome.",
    slots: [
      {
        taskLabel: "Triage the request",
        defaultInstructions: "Classify the request by type and urgency, and route it accordingly.",
      },
      {
        taskLabel: "Handle the request",
        defaultInstructions: "Carry out the work needed to resolve the request.",
      },
      {
        taskLabel: "Notify the outcome",
        defaultInstructions: "Draft a concise summary of the outcome for the requester.",
      },
    ],
  },
  {
    id: "extract-validate",
    name: "Extract → Validate",
    description: "One agent pulls structured data out of unstructured input, a second validates it against expected rules.",
    slots: [
      {
        taskLabel: "Extract structured data",
        defaultInstructions: "Pull the relevant structured fields out of the unstructured input.",
      },
      {
        taskLabel: "Validate the extraction",
        defaultInstructions: "Check the extracted data for completeness, accuracy, and format issues, and flag anything that looks wrong.",
      },
    ],
  },
  {
    id: "summarize-translate",
    name: "Summarize → Translate",
    description: "One agent condenses the content, a second translates the summary into the target language.",
    slots: [
      {
        taskLabel: "Summarize the content",
        defaultInstructions: "Condense the input into a clear, accurate summary.",
      },
      {
        taskLabel: "Translate the summary",
        defaultInstructions: "Translate the summary into the target language, preserving meaning and tone.",
      },
    ],
  },
  {
    id: "plan-execute-report",
    name: "Plan → Execute → Report",
    description: "One agent plans an approach, a second carries it out, a third reports the results.",
    slots: [
      {
        taskLabel: "Plan the approach",
        defaultInstructions: "Break the request down into a clear, actionable plan.",
      },
      {
        taskLabel: "Execute the plan",
        defaultInstructions: "Carry out the planned steps to produce a result.",
      },
      {
        taskLabel: "Report the results",
        defaultInstructions: "Summarize what was done and the outcome, in a form ready to share.",
      },
    ],
  },
  {
    id: "classify-prioritize-assign",
    name: "Classify → Prioritize → Assign",
    description: "One agent classifies an incoming item, a second prioritizes it, a third assigns it to the right owner.",
    slots: [
      {
        taskLabel: "Classify the item",
        defaultInstructions: "Determine the type or category of the incoming item.",
      },
      {
        taskLabel: "Prioritize the item",
        defaultInstructions: "Assess urgency and importance, and assign a priority level.",
      },
      {
        taskLabel: "Assign the item",
        defaultInstructions: "Route the item to the appropriate owner or team based on its classification and priority.",
      },
    ],
  },
  {
    id: "draft-factcheck-finalize",
    name: "Draft → Fact-check → Finalize",
    description: "One agent drafts content, a second fact-checks it against sources, a third produces the polished final version.",
    slots: [
      {
        taskLabel: "Draft the content",
        defaultInstructions: "Produce a first draft based on the input.",
      },
      {
        taskLabel: "Fact-check the draft",
        defaultInstructions: "Verify claims and figures in the draft against available sources, flagging anything unverifiable.",
      },
      {
        taskLabel: "Finalize the content",
        defaultInstructions: "Incorporate fact-check findings and produce the polished final version.",
      },
    ],
  },
];

// See docs/project/pattern_libraries.md — Prompts are scoped to Business Unit
// (today's MOCK_ROLE_POOLS, renamed conceptually per the doc's rename decision)
// / Role (an agent's `role` field) / Task-process, with specificity fallback.
// Task/processes need stable ids to be scoped against — derived here from the
// existing MOCK_ROLE_POOLS content rather than hand-duplicated.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface MockBusinessUnit {
  id: string;
  name: string;
}

export const MOCK_BUSINESS_UNITS: MockBusinessUnit[] = MOCK_ROLE_POOLS.map((pool) => ({
  id: pool.id,
  name: pool.name,
}));

export interface MockTaskProcess {
  id: string;
  businessUnitId: string;
  label: string;
  phase: "pre" | "work" | "post";
}

export const MOCK_TASK_PROCESSES: MockTaskProcess[] = MOCK_ROLE_POOLS.flatMap((pool) =>
  (["pre", "work", "post"] as const).flatMap((phase) =>
    (pool.processes?.[phase] ?? []).map((label) => ({
      id: `${pool.id}:${phase}:${slugify(label)}`,
      businessUnitId: pool.id,
      label,
      phase,
    })),
  ),
);

export const MOCK_AGENT_ROLES: string[] = [...new Set(MOCK_AGENTS.map((a) => a.role).filter((r): r is string => !!r))];

export interface MockPrompt {
  id: string;
  name: string;
  body: string;
  businessUnitId?: string;
  role?: string;
  taskProcessId?: string;
  archived: boolean;
}

function taskProcessId(businessUnitId: string, phase: MockTaskProcess["phase"], label: string): string {
  return `${businessUnitId}:${phase}:${slugify(label)}`;
}

export const MOCK_PROMPTS: MockPrompt[] = [
  {
    id: "prompt-support-tone",
    name: "Support tone guidelines",
    body: "Always respond in a warm, empathetic tone. Never promise a refund or credit without escalating to a human first — offer to escalate instead.",
    businessUnitId: "customer-support",
    archived: false,
  },
  {
    id: "prompt-support-first-response",
    name: "First-response draft",
    body: "Draft a first-response reply to the customer's message below. Acknowledge their issue, show you understand it, and either answer directly or explain the next step. Keep it under 150 words.",
    businessUnitId: "customer-support",
    taskProcessId: taskProcessId("customer-support", "work", "Draft first-response replies to common questions"),
    archived: false,
  },
  {
    id: "prompt-code-reviewer-persona",
    name: "Code reviewer standard checklist",
    body: "Review the code or diff below for correctness, security issues, and style problems. Be specific and reference line numbers where possible. Call out anything that looks like a security risk explicitly, even if minor.",
    role: "Code Reviewer",
    archived: false,
  },
  {
    id: "prompt-pr-review-detailed",
    name: "PR review — detailed pass",
    body: "Review this pull request diff. For each file changed: 1) flag correctness issues, 2) flag security concerns, 3) flag style/consistency issues. End with a one-line overall verdict (approve, approve with comments, or request changes).",
    businessUnitId: "engineering",
    taskProcessId: taskProcessId("engineering", "work", "Review pull requests for correctness, security, and style"),
    archived: false,
  },
  {
    id: "prompt-sales-tone",
    name: "Sales outreach tone",
    body: "Write in a confident, concise, consultative tone. Avoid generic sales language and hard-selling phrases. Focus on the prospect's specific situation, not generic product features.",
    businessUnitId: "sales",
    archived: false,
  },
  {
    id: "prompt-sales-outreach-draft",
    name: "Personalized outreach draft",
    body: "Using the research notes below, draft a short, personalized outreach message to this prospect. Reference something specific to their situation in the first line. Keep it under 100 words and end with a low-friction call to action.",
    businessUnitId: "sales",
    taskProcessId: taskProcessId("sales", "work", "Research prospects and draft personalized outreach"),
    archived: false,
  },
  {
    id: "prompt-cx-verbatim-summary",
    name: "CSAT/NPS verbatim summarizer",
    body: "Summarize the customer feedback verbatims below into the top 3-5 recurring themes. For each theme, note whether it's positive or negative and roughly how many verbatims mention it.",
    businessUnitId: "customer-experience",
    taskProcessId: taskProcessId("customer-experience", "post", "Summarize NPS/CSAT verbatims into trends"),
    archived: false,
  },
  {
    id: "prompt-legacy-support-macro",
    name: "Old support macro (deprecated)",
    body: "Thank you for contacting support. Your request has been logged and will be reviewed within 5-7 business days.",
    businessUnitId: "customer-support",
    archived: true,
  },
];

// Dashboard — headline metrics, a newsfeed of notification headers, ranked top
// priorities, and agent coverage of each business unit's task-processes.

export interface MockMetric {
  id: string;
  label: string;
  value: number;
  format: "count" | "percent" | "usd" | "seconds" | "score";
  /** Fractional change vs `comparedTo` (0.18 = +18%); for percent and score metrics, the change in points. */
  change: number;
  comparedTo: string;
  /** Whether an increase is good news — decides the delta's color. */
  higherIsBetter: boolean;
}

export const MOCK_METRICS: MockMetric[] = [
  { id: "active-agents", label: "Active agents", value: 14, format: "count", change: 0.27, comparedTo: "last month", higherIsBetter: true },
  { id: "runs", label: "Runs this week", value: 1284, format: "count", change: 0.18, comparedTo: "last week", higherIsBetter: true },
  { id: "success-rate", label: "Run success rate", value: 94.2, format: "percent", change: 1.1, comparedTo: "last week", higherIsBetter: true },
  { id: "spend", label: "Spend this month", value: 861, format: "usd", change: 0.12, comparedTo: "budget", higherIsBetter: false },
];

export type MockNotificationKind =
  | "approval"
  | "alert"
  | "insight"
  | "agent"
  | "run"
  | "release"
  | "escalation"
  | "deal";
export type MockNotificationTone = "neutral" | "good" | "warning" | "critical";

export interface MockNotification {
  id: string;
  kind: MockNotificationKind;
  /** One-line header — the feed shows headers only. */
  title: string;
  tone: MockNotificationTone;
  unread: boolean;
  createdAt: string;
}

// Run results join the feed from MOCK_RUNS at render time (see runNotification).
export const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "notif-code-reviewer-approval",
    kind: "approval",
    title: "Code Reviewer Agent rollout to all 14 repos is waiting for your approval",
    tone: "neutral",
    unread: true,
    createdAt: "2026-10-23T09:40:00Z",
  },
  {
    id: "notif-spend-pace",
    kind: "alert",
    title: "API spend is pacing 12% over the October budget",
    tone: "warning",
    unread: true,
    createdAt: "2026-10-23T08:15:00Z",
  },
  {
    id: "notif-support-csat",
    kind: "insight",
    title: "CSAT on agent-drafted support replies fell from 4.6 to 4.1 this week",
    tone: "warning",
    unread: true,
    createdAt: "2026-10-23T06:30:00Z",
  },
  {
    id: "notif-github-token",
    kind: "alert",
    title: "GitHub MCP has no token — 3 flows ended with partial results",
    tone: "critical",
    unread: true,
    createdAt: "2026-10-22T22:10:00Z",
  },
  {
    id: "notif-data-analyst-sales",
    kind: "agent",
    title: "Data Analyst Agent was added to the Sales pool",
    tone: "neutral",
    unread: false,
    createdAt: "2026-10-22T16:20:00Z",
  },
  {
    id: "notif-engineering-coverage",
    kind: "insight",
    title: "Engineering now has agents live on 4 of its 6 Work processes",
    tone: "good",
    unread: false,
    createdAt: "2026-10-21T15:00:00Z",
  },
  {
    id: "notif-pattern-published",
    kind: "agent",
    title: "New flow pattern published: Draft → Fact-check → Finalize",
    tone: "neutral",
    unread: false,
    createdAt: "2026-10-21T11:30:00Z",
  },
  {
    id: "notif-sales-prompt-review",
    kind: "approval",
    title: "An edit to the Sales outreach tone prompt needs review before it goes live",
    tone: "neutral",
    unread: false,
    createdAt: "2026-10-21T10:00:00Z",
  },
];

export interface MockPriorityAction {
  label: string;
  /** A screen that exists today; actions without one have no screen yet. */
  href?: string;
}

export interface MockPriority {
  id: string;
  title: string;
  /** Omitted for org-wide priorities. */
  businessUnitId?: string;
  /** Kept to roughly five lines on the card. */
  context: string;
  actions: [MockPriorityAction, MockPriorityAction];
}

export const MOCK_PRIORITIES: MockPriority[] = [
  {
    id: "priority-code-reviewer-rollout",
    title: "Approve the Code Reviewer rollout",
    businessUnitId: "engineering",
    context:
      "Pilot on 2 repos: 212 PRs reviewed, 9 security issues caught that humans missed, false positives down to 6%. Rolling out to all 14 repos adds about $38/month.",
    actions: [{ label: "Review pilot", href: "/marketplace" }, { label: "Approve" }],
  },
  {
    id: "priority-support-csat",
    title: "Fix the dip in first-reply CSAT",
    businessUnitId: "customer-support",
    context:
      "CSAT on agent-drafted first replies fell from 4.6 to 4.1 this week. Low scores cite callbacks promised without a time — the tone prompt doesn't cover that yet.",
    actions: [
      { label: "Edit prompt", href: "/prompts" },
      { label: "Run test", href: "/prompts" },
    ],
  },
  {
    id: "priority-sales-pre-coverage",
    title: "Cover Sales pre-work with agents",
    businessUnitId: "sales",
    context:
      "None of the 6 Sales pre-work processes has a live agent. Lead qualification and meeting briefs are still manual, and the Research → Synthesize pattern fits both.",
    actions: [
      { label: "Use pattern", href: "/patterns" },
      { label: "See agents", href: "/marketplace" },
    ],
  },
  {
    id: "priority-api-spend",
    title: "Bring API spend back under budget",
    context:
      "October is pacing to $1,160 against a $1,035 budget. Two-thirds is the Data Analyst Agent on GPT-5.4, and its nightly batch could move to the local model.",
    actions: [{ label: "See costs", href: "/builder" }, { label: "Set a cap" }],
  },
  {
    id: "priority-github-token",
    title: "Unblock the GitHub MCP connection",
    businessUnitId: "engineering",
    context:
      "Three flows attach the GitHub MCP server, but no GITHUB_TOKEN is set, so each run skips its GitHub steps and ends partial. A read-only token unblocks all three.",
    actions: [{ label: "Add token" }, { label: "View flows", href: "/builder" }],
  },
];

export interface MockPhaseCoverage {
  /** Task-processes with an agent in production. */
  live: number;
  /** Task-processes with an agent being piloted. */
  pilot: number;
  /** All task-processes mapped for the unit and phase — the rest are uncovered. */
  total: number;
}

export interface MockUnitCoverage {
  businessUnitId: string;
  name: string;
  phases: Record<MockTaskProcess["phase"], MockPhaseCoverage>;
}

// [live, pilot] per phase; totals come from each unit's mapped task-processes.
const COVERAGE_COUNTS: Record<string, Record<MockTaskProcess["phase"], [live: number, pilot: number]>> = {
  "customer-support": { pre: [3, 1], work: [3, 1], post: [1, 2] },
  sales: { pre: [0, 2], work: [1, 1], post: [0, 1] },
  engineering: { pre: [3, 1], work: [4, 1], post: [2, 1] },
  "customer-experience": { pre: [2, 1], work: [0, 1], post: [3, 2] },
};

export const MOCK_UNIT_COVERAGE: MockUnitCoverage[] = MOCK_BUSINESS_UNITS.map((unit) => {
  const phaseCoverage = (phase: MockTaskProcess["phase"]): MockPhaseCoverage => {
    const [live, pilot] = COVERAGE_COUNTS[unit.id]?.[phase] ?? [0, 0];
    const total = MOCK_TASK_PROCESSES.filter((p) => p.businessUnitId === unit.id && p.phase === phase).length;
    return { live, pilot, total };
  };
  return {
    businessUnitId: unit.id,
    name: unit.name,
    phases: { pre: phaseCoverage("pre"), work: phaseCoverage("work"), post: phaseCoverage("post") },
  };
});
