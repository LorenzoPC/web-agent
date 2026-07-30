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
    completedAt: "2026-07-21T14:32:00Z",
  },
  {
    id: "run-2",
    rootInput: "Summarize the latest deployment status for this project",
    status: "success",
    totalCostUsd: 0.0187,
    stepCount: 3,
    completedAt: "2026-07-20T09:05:00Z",
  },
  {
    id: "run-3",
    rootInput: "Review the latest PR diff for security issues and post a summary",
    status: "partial",
    totalCostUsd: 0.0093,
    stepCount: 3,
    completedAt: "2026-07-19T18:47:00Z",
  },
];
