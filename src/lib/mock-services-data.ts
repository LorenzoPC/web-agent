// Mock data for the public services catalog (/services and /services/[slug]).
// A service is a packaged outcome: one job done end to end for a team, built
// from the hub's agents, models, tools and MCP servers, and priced per task.
// Nothing here is live yet. Results, prices and connectors are placeholders.

import type { MockTaskProcess } from "./mock-data";

export type ServiceStatus = "available" | "beta" | "soon";

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  available: "Available",
  beta: "Beta",
  soon: "Coming soon",
};

/**
 * Where a service can run. Echoes the app's execution sources: paid APIs
 * (ours, or the client's own contract) and hardware the client owns or rents.
 */
export type RunOptionId = "our-cloud" | "your-cloud" | "your-hardware";

export interface RunOption {
  id: RunOptionId;
  label: string;
  description: string;
  models: string;
  /** Who pays for the model calls on this option. */
  modelCosts: string;
  /** Ends the cost estimate's sentence, e.g. "8,000 tickets × $0.04 on our cloud, models included". */
  estimateNote: string;
}

export const RUN_OPTIONS: RunOption[] = [
  {
    id: "our-cloud",
    label: "Our cloud",
    description: "We run it end to end. Nothing to host.",
    models: "Claude, GPT, Gemini or Mistral models",
    modelCosts: "Included in the price",
    estimateNote: "models included",
  },
  {
    id: "your-cloud",
    label: "Your cloud account",
    description: "Runs on your Azure OpenAI, AWS Bedrock or Vertex AI account, under your own contract.",
    models: "The models in your account",
    modelCosts: "Billed by your cloud provider",
    estimateNote: "plus model costs from your cloud provider",
  },
  {
    id: "your-hardware",
    label: "Your hardware",
    description: "Open-source models on your own servers or a GPU you rent. Data never leaves your network.",
    models: "Llama, Mistral or Qwen, served by Ollama or vLLM",
    modelCosts: "None, you run the hardware",
    estimateNote: "plus the cost of running your hardware",
  },
];

export type ServiceComponentKind = "Agent" | "Model" | "Tool" | "MCP server" | "Knowledge";

export interface ServiceComponent {
  kind: ServiceComponentKind;
  name: string;
  /** What this component does inside the service. */
  role: string;
}

/** A person, not a component, does this step. Used as a step's `actor`. */
export const PERSON = "A person";

export interface ServiceStep {
  /** When it happens relative to the work that triggers it, as in the Dashboard's coverage table. */
  phase: MockTaskProcess["phase"];
  title: string;
  detail: string;
  /** Who does it: a component name from the service's `components`, or PERSON. */
  actor: string;
  /** A person decides here before anything leaves the service. */
  checkpoint?: boolean;
}

export const STEP_PHASE_LABELS: Record<ServiceStep["phase"], string> = {
  pre: "Before",
  work: "During",
  post: "After",
};

export interface Service {
  slug: string;
  name: string;
  /** A MOCK_ROLE_POOLS id. */
  teamId: string;
  status: ServiceStatus;
  /** One line for the catalog card. */
  summary: string;
  description: string;
  /** Headline result from pilots. Placeholder figures. */
  result: { value: string; label: string };
  /** The roles that use it day to day. */
  usedBy: string[];
  /** What one task is, singular and plural. Prices are per task. */
  unit: string;
  units: string;
  /** Monthly volume for a mid-size team. Seeds the cost estimator. */
  typicalVolume: number;
  /** Price per task on our cloud, models included. */
  pricePerTask: number;
  /** Price per task when it runs on the client's cloud account or hardware, before their model costs. */
  platformFee: number;
  runsOn: RunOptionId[];
  timeToLive: string;
  steps: ServiceStep[];
  components: ServiceComponent[];
  connectsTo: { name: string; available: boolean }[];
  controls: string[];
  prerequisites: string[];
}

/** How the hub works, in the order a client meets it. */
export const HUB_STEPS: { title: string; detail: string }[] = [
  {
    title: "Connect once",
    detail: "Add one MCP URL to Claude, ChatGPT or Copilot, or call the API. People sign in with their work email.",
  },
  {
    title: "Switch on services per team",
    detail: "Each service does one job end to end. Turn it on for the teams that need it. There's nothing to build.",
  },
  {
    title: "Pay per task, priced up front",
    detail: "Every service shows its price per task before it runs, on our models, your cloud or your own hardware.",
  },
];

/** What every service comes with, whichever team uses it. */
export const SERVICE_FOUNDATIONS: { title: string; detail: string }[] = [
  { title: "Single sign-on and roles", detail: "Work-email sign-in over OAuth. Access mirrors each person's own permissions." },
  { title: "People approve what matters", detail: "Services pause for a person before anything reaches a customer or a system of record." },
  { title: "Audit log", detail: "Every run, approval and edit is recorded, with who did what and why." },
  { title: "Your data stays yours", detail: "Never used to train models, written into every contract." },
  { title: "Your choice of where it runs", detail: "Our cloud, your cloud account, or your own hardware, per service." },
  { title: "Your choice of models", detail: "Augure, Azure, Anthropic, Gemini, Mistral, OpenAI or open-source models." },
];

export const SERVICES: Service[] = [
  {
    slug: "support-reply-drafting",
    name: "Support reply drafting",
    teamId: "customer-support",
    status: "available",
    summary: "Drafts first replies to new tickets from your help center. A person approves each one.",
    description:
      "When a ticket arrives, the service finds the answer in your help center and past tickets, and drafts a reply in your team's tone. A support agent reviews it in the help desk they already use, edits it if needed, and sends it. Every edit improves the next draft.",
    result: { value: "50%", label: "of first replies drafted" },
    usedBy: ["Support agents", "Support team leads"],
    unit: "ticket",
    units: "tickets",
    typicalVolume: 8000,
    pricePerTask: 0.04,
    platformFee: 0.01,
    runsOn: ["our-cloud", "your-cloud", "your-hardware"],
    timeToLive: "1–2 weeks",
    steps: [
      {
        phase: "pre",
        title: "Reads the ticket",
        detail: "Picks up each new ticket with the customer's plan and recent history.",
        actor: "Help desk MCP server",
      },
      {
        phase: "pre",
        title: "Checks urgency and language",
        detail: "Sends angry or at-risk customers straight to a person, and translates the ticket if needed.",
        actor: "Sentiment Analysis",
      },
      {
        phase: "work",
        title: "Finds the answer",
        detail: "Searches your help center articles and similar resolved tickets.",
        actor: "Help center search",
      },
      {
        phase: "work",
        title: "Drafts the reply",
        detail: "Writes a reply in your tone and links the articles it used.",
        actor: "Support Agent",
      },
      {
        phase: "work",
        title: "A person approves",
        detail: "The draft waits in the help desk. The support agent edits it, or sends it as is.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Learns from edits",
        detail: "Turns edits into tone-guide updates, and flags questions your help center doesn't answer yet.",
        actor: "Summarizer Agent",
      },
    ],
    components: [
      { kind: "Agent", name: "Support Agent", role: "Drafts replies in your tone" },
      { kind: "Agent", name: "Summarizer Agent", role: "Turns edits into tone-guide updates" },
      { kind: "Tool", name: "Sentiment Analysis", role: "Spots urgency and frustration" },
      { kind: "Tool", name: "Translate Text", role: "Handles tickets in other languages" },
      { kind: "Knowledge", name: "Help center search", role: "Hybrid search over articles and resolved tickets" },
      { kind: "MCP server", name: "Help desk MCP server", role: "Reads tickets and posts drafts" },
    ],
    connectsTo: [
      { name: "Zendesk", available: true },
      { name: "Intercom", available: true },
      { name: "Slack", available: true },
      { name: "Freshdesk", available: false },
      { name: "Salesforce Service Cloud", available: false },
    ],
    controls: [
      "Nothing is sent without a person's approval",
      "Legal and billing disputes skip the service and go to a person",
      "Personal data is masked before it reaches a model",
      "Every draft and edit is in the audit log",
    ],
    prerequisites: ["A help center with at least 50 articles", "Admin access to Zendesk or Intercom, to add the connector"],
  },
  {
    slug: "ticket-triage",
    name: "Ticket triage and routing",
    teamId: "customer-support",
    status: "available",
    summary: "Tags, prioritizes and routes every new ticket, and flags at-risk customers for a team lead.",
    description:
      "The service reads each ticket as it lands, tags its product area, sets a priority from urgency, plan and SLA, and routes it to the right queue. Duplicates get linked, and customers who look ready to churn go straight to a team lead.",
    result: { value: "92%", label: "of tickets routed right the first time" },
    usedBy: ["Support team leads", "Queue owners"],
    unit: "ticket",
    units: "tickets",
    typicalVolume: 8000,
    pricePerTask: 0.02,
    platformFee: 0.01,
    runsOn: ["our-cloud", "your-cloud", "your-hardware"],
    timeToLive: "Under a week",
    steps: [
      {
        phase: "pre",
        title: "Reads the ticket",
        detail: "Picks up each ticket the moment it lands.",
        actor: "Help desk MCP server",
      },
      {
        phase: "pre",
        title: "Tags and prioritizes",
        detail: "Tags the product area and sets a priority from urgency, plan and SLA.",
        actor: "Extract Structured Data",
      },
      {
        phase: "pre",
        title: "Links duplicates",
        detail: "Finds open tickets about the same issue and links them.",
        actor: "Ticket history search",
      },
      {
        phase: "work",
        title: "Routes to a queue",
        detail: "Assigns the ticket to the right queue, with a one-line reason.",
        actor: "General Assistant Agent",
      },
      {
        phase: "work",
        title: "A lead handles churn risk",
        detail: "Customers who look ready to churn go to a team lead, who decides what happens next.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Reports trends",
        detail: "Sends a weekly summary of volume, topics and SLA risk.",
        actor: "Data Analyst Agent",
      },
    ],
    components: [
      { kind: "Agent", name: "General Assistant Agent", role: "Chooses the queue" },
      { kind: "Agent", name: "Data Analyst Agent", role: "Writes the weekly trend report" },
      { kind: "Tool", name: "Extract Structured Data", role: "Pulls product area, plan and urgency" },
      { kind: "Tool", name: "Sentiment Analysis", role: "Spots churn risk" },
      { kind: "Knowledge", name: "Ticket history search", role: "Finds duplicates among open tickets" },
      { kind: "MCP server", name: "Help desk MCP server", role: "Reads tickets and sets their fields" },
    ],
    connectsTo: [
      { name: "Zendesk", available: true },
      { name: "Intercom", available: true },
      { name: "Slack", available: true },
      { name: "Freshdesk", available: false },
      { name: "Jira Service Management", available: false },
    ],
    controls: [
      "Routing rules you set always win over the service's choice",
      "Churn-risk escalations always go to a person",
      "Every tag and route is in the audit log, with its reason",
    ],
    prerequisites: ["Your queues and routing rules, written down", "Admin access to your help desk"],
  },
  {
    slug: "call-notes-to-crm",
    name: "Call notes to CRM",
    teamId: "sales",
    status: "available",
    summary: "Summarizes every discovery call into CRM notes and fields, ready for the rep to confirm.",
    description:
      "After each call, the service transcribes the recording, writes a short summary with next steps, and fills the CRM fields your team tracks: budget, timeline, decision makers and competitors. The rep checks the notes in the CRM and confirms them.",
    result: { value: "3 h", label: "back per rep, every week" },
    usedBy: ["Account executives", "Sales managers"],
    unit: "call",
    units: "calls",
    typicalVolume: 1200,
    pricePerTask: 0.12,
    platformFee: 0.03,
    runsOn: ["our-cloud", "your-cloud"],
    timeToLive: "1 week",
    steps: [
      {
        phase: "pre",
        title: "Picks up the recording",
        detail: "Fetches the recording as soon as the call ends.",
        actor: "Meeting recorder MCP server",
      },
      {
        phase: "work",
        title: "Transcribes the call",
        detail: "Turns the recording into a transcript with speaker names.",
        actor: "Speech-to-text model",
      },
      {
        phase: "work",
        title: "Writes the summary",
        detail: "Pains, next steps and who owns each one, in a few lines.",
        actor: "Summarizer Agent",
      },
      {
        phase: "work",
        title: "Fills the CRM fields",
        detail: "Puts budget, timeline, decision makers and competitors in their fields.",
        actor: "Extract Structured Data",
      },
      {
        phase: "work",
        title: "The rep confirms",
        detail: "Notes and fields wait as a draft in the CRM until the rep confirms them.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Flags stalled deals",
        detail: "Tells the sales manager about deals with no next step.",
        actor: "Data Analyst Agent",
      },
    ],
    components: [
      { kind: "Agent", name: "Summarizer Agent", role: "Writes the call summary" },
      { kind: "Agent", name: "Data Analyst Agent", role: "Spots stalled deals" },
      { kind: "Model", name: "Speech-to-text model", role: "Transcribes calls, with speaker names" },
      { kind: "Tool", name: "Extract Structured Data", role: "Fills CRM fields" },
      { kind: "MCP server", name: "CRM MCP server", role: "Writes notes and fields to Salesforce or HubSpot" },
      { kind: "MCP server", name: "Meeting recorder MCP server", role: "Fetches recordings from Zoom or Google Meet" },
    ],
    connectsTo: [
      { name: "Salesforce", available: true },
      { name: "HubSpot", available: true },
      { name: "Zoom", available: true },
      { name: "Google Meet", available: true },
      { name: "Microsoft Teams", available: false },
      { name: "Gong", available: false },
    ],
    controls: [
      "Only works on calls your recorder already has consent for",
      "Nothing reaches the CRM until the rep confirms",
      "Recordings are deleted after 30 days, or sooner if you choose",
    ],
    prerequisites: ["Calls recorded in Zoom or Google Meet", "A CRM admin to map the fields you track"],
  },
  {
    slug: "account-research-briefs",
    name: "Account research briefs",
    teamId: "sales",
    status: "available",
    summary: "Prepares a one-page brief on the account before every meeting, with sources.",
    description:
      "The day before each external meeting on a rep's calendar, the service researches the account: recent news, hiring, funding, past deals and the people attending. It writes a one-page brief with suggested questions, links every claim to its source, and sends it to the rep in Slack.",
    result: { value: "45 min", label: "of prep saved per meeting" },
    usedBy: ["Account executives", "Sales development reps"],
    unit: "brief",
    units: "briefs",
    typicalVolume: 600,
    pricePerTask: 0.3,
    platformFee: 0.05,
    runsOn: ["our-cloud", "your-cloud"],
    timeToLive: "Under a week",
    steps: [
      {
        phase: "pre",
        title: "Spots the meeting",
        detail: "Checks each rep's calendar for external meetings the next day.",
        actor: "Read Calendar",
      },
      {
        phase: "work",
        title: "Researches the account",
        detail: "Searches the web for news, hiring and funding, and your CRM for past deals.",
        actor: "Web Search",
      },
      {
        phase: "work",
        title: "Reads the sources",
        detail: "Opens the most relevant pages and keeps the facts that matter.",
        actor: "Fetch URL",
      },
      {
        phase: "work",
        title: "Writes the brief",
        detail: "One page: what changed, who's attending, and five questions to ask. Every claim links to its source.",
        actor: "Research Agent",
      },
      {
        phase: "post",
        title: "Sends it in Slack",
        detail: "Posts the brief to the rep the evening before the meeting.",
        actor: "Slack MCP server",
      },
    ],
    components: [
      { kind: "Agent", name: "Research Agent", role: "Writes the brief, with sources" },
      { kind: "Tool", name: "Read Calendar", role: "Finds tomorrow's external meetings" },
      { kind: "Tool", name: "Web Search", role: "Finds news, hiring and funding" },
      { kind: "Tool", name: "Fetch URL", role: "Reads the pages it found" },
      { kind: "MCP server", name: "CRM MCP server", role: "Reads past deals and contacts" },
      { kind: "MCP server", name: "Slack MCP server", role: "Sends the brief to the rep" },
    ],
    connectsTo: [
      { name: "Google Calendar", available: true },
      { name: "Outlook Calendar", available: true },
      { name: "Salesforce", available: true },
      { name: "HubSpot", available: true },
      { name: "Slack", available: true },
      { name: "LinkedIn Sales Navigator", available: false },
    ],
    controls: [
      "Reads public sources and your CRM, nothing else",
      "Every claim in a brief links to its source",
      "Only the meeting's owner sees the brief",
    ],
    prerequisites: ["Reps' calendars connected", "Read access to your CRM"],
  },
  {
    slug: "pull-request-review",
    name: "Pull request review",
    teamId: "engineering",
    status: "available",
    summary: "Reviews every pull request for bugs, security and style within minutes of it opening.",
    description:
      "When a pull request opens, the service reads the diff and the code around it, summarizes the change, and comments on bugs, security issues and style. A person still approves the merge. It can run on your own hardware, so your code never leaves your network.",
    result: { value: "6 min", label: "from opening to first review" },
    usedBy: ["Software engineers", "Engineering managers"],
    unit: "pull request",
    units: "pull requests",
    typicalVolume: 2000,
    pricePerTask: 0.08,
    platformFee: 0.02,
    runsOn: ["our-cloud", "your-cloud", "your-hardware"],
    timeToLive: "Same day",
    steps: [
      {
        phase: "pre",
        title: "Reads the change",
        detail: "Picks up each new pull request with its diff and linked issue.",
        actor: "GitHub MCP server",
      },
      {
        phase: "work",
        title: "Summarizes it",
        detail: "Writes what changed and why at the top of the pull request.",
        actor: "Code Reviewer Agent",
      },
      {
        phase: "work",
        title: "Reviews the code",
        detail: "Comments on bugs, security issues and style, with a suggested fix where it can.",
        actor: "Code Reviewer Agent",
      },
      {
        phase: "work",
        title: "Checks its own findings",
        detail: "Runs the code paths it's unsure about in a sandbox before commenting.",
        actor: "Code Execution",
      },
      {
        phase: "work",
        title: "A person approves the merge",
        detail: "The service never approves or merges. A reviewer reads its comments and decides.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Learns what your team acts on",
        detail: "Drops the kinds of comments your team keeps dismissing.",
        actor: "Data Analyst Agent",
      },
    ],
    components: [
      { kind: "Agent", name: "Code Reviewer Agent", role: "Summarizes and reviews the change" },
      { kind: "Agent", name: "Data Analyst Agent", role: "Tracks which comments get acted on" },
      { kind: "Tool", name: "Code Execution", role: "Checks findings in a sandbox" },
      { kind: "MCP server", name: "GitHub MCP server", role: "Reads pull requests and posts comments" },
    ],
    connectsTo: [
      { name: "GitHub", available: true },
      { name: "Slack", available: true },
      { name: "GitLab", available: false },
      { name: "Bitbucket", available: false },
    ],
    controls: [
      "Never approves or merges a pull request",
      "Can run on your hardware, so code stays in your network",
      "Your code is never used to train models",
    ],
    prerequisites: ["A GitHub organization, and permission to install an app on it", "Your style guide, if you have one"],
  },
  {
    slug: "release-notes",
    name: "Release notes",
    teamId: "engineering",
    status: "beta",
    summary: "Turns merged pull requests into release notes for customers and a changelog for engineers.",
    description:
      "When you tag a release, the service reads every pull request merged since the last one, sorts them into features, fixes and breaking changes, and drafts two versions: plain-language notes for customers and a technical changelog with migration steps. A person edits and publishes.",
    result: { value: "2 h", label: "saved on every release" },
    usedBy: ["Engineering managers", "Product managers"],
    unit: "release",
    units: "releases",
    typicalVolume: 20,
    pricePerTask: 0.5,
    platformFee: 0.1,
    runsOn: ["our-cloud", "your-cloud", "your-hardware"],
    timeToLive: "Same day",
    steps: [
      {
        phase: "pre",
        title: "Spots the release",
        detail: "Starts when you tag a release in GitHub.",
        actor: "GitHub MCP server",
      },
      {
        phase: "work",
        title: "Sorts the changes",
        detail: "Reads each merged pull request and files it under features, fixes or breaking changes.",
        actor: "Summarizer Agent",
      },
      {
        phase: "work",
        title: "Drafts two versions",
        detail: "Plain-language notes for customers, and a technical changelog with migration steps.",
        actor: "Summarizer Agent",
      },
      {
        phase: "work",
        title: "A person publishes",
        detail: "Both drafts wait for an editor, who changes what they want and publishes.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Shares the news",
        detail: "Posts the published notes to your release channel in Slack.",
        actor: "Slack MCP server",
      },
    ],
    components: [
      { kind: "Agent", name: "Summarizer Agent", role: "Sorts changes and drafts both versions" },
      { kind: "MCP server", name: "GitHub MCP server", role: "Reads merged pull requests" },
      { kind: "MCP server", name: "Slack MCP server", role: "Posts the published notes" },
    ],
    connectsTo: [
      { name: "GitHub", available: true },
      { name: "Slack", available: true },
      { name: "GitLab", available: false },
      { name: "Notion", available: false },
    ],
    controls: [
      "Nothing is published without an editor",
      "Pull requests labeled internal stay out of customer notes",
    ],
    prerequisites: ["Releases tagged in GitHub", "Pull request titles that say what changed"],
  },
  {
    slug: "feedback-themes",
    name: "Feedback themes",
    teamId: "customer-experience",
    status: "available",
    summary: "Turns interviews, surveys and reviews into a summary of themes the same day.",
    description:
      "Drop interview transcripts, survey answers or app reviews into a shared folder. The service tags each comment, groups them into themes with counts and sentiment, and writes a summary with quotes for each theme. A CX lead reviews the themes before they're shared.",
    result: { value: "Same day", label: "from raw feedback to themes" },
    usedBy: ["CX researchers", "CX and product leads"],
    unit: "transcript",
    units: "transcripts",
    typicalVolume: 300,
    pricePerTask: 0.2,
    platformFee: 0.04,
    runsOn: ["our-cloud", "your-cloud", "your-hardware"],
    timeToLive: "Under a week",
    steps: [
      {
        phase: "pre",
        title: "Collects the feedback",
        detail: "Reads transcripts, survey exports and app reviews from a shared folder.",
        actor: "Filesystem MCP server",
      },
      {
        phase: "work",
        title: "Tags every comment",
        detail: "Tags each comment with its topic and sentiment.",
        actor: "Sentiment Analysis",
      },
      {
        phase: "work",
        title: "Groups the themes",
        detail: "Groups comments into themes, with counts and the trend since last time.",
        actor: "Data Analyst Agent",
      },
      {
        phase: "work",
        title: "Writes the summary",
        detail: "One page per theme, with quotes that show it.",
        actor: "Summarizer Agent",
      },
      {
        phase: "work",
        title: "A lead reviews",
        detail: "A CX lead merges, renames or drops themes before anything is shared.",
        actor: PERSON,
        checkpoint: true,
      },
      {
        phase: "post",
        title: "Shares with product",
        detail: "Posts the summary to the product team's Slack channel.",
        actor: "Slack MCP server",
      },
    ],
    components: [
      { kind: "Agent", name: "Data Analyst Agent", role: "Groups comments into themes" },
      { kind: "Agent", name: "Summarizer Agent", role: "Writes each theme's summary" },
      { kind: "Tool", name: "Sentiment Analysis", role: "Tags topic and sentiment" },
      { kind: "MCP server", name: "Filesystem MCP server", role: "Reads the shared folder" },
      { kind: "MCP server", name: "Slack MCP server", role: "Shares the summary" },
    ],
    connectsTo: [
      { name: "Google Drive", available: true },
      { name: "App Store and Google Play reviews", available: true },
      { name: "Slack", available: true },
      { name: "Dovetail", available: false },
      { name: "Qualtrics", available: false },
    ],
    controls: ["Names and emails are removed from quotes", "Themes are shared only after a lead reviews them"],
    prerequisites: ["Feedback in a shared folder, or exported from your survey tool"],
  },
  {
    slug: "voice-of-customer-digest",
    name: "Voice of the customer digest",
    teamId: "customer-experience",
    status: "soon",
    summary: "A weekly digest of what customers say across support, sales and reviews, for product teams.",
    description:
      "Every week, the service reads what customers said in support tickets, sales calls and reviews, and writes one digest for product teams: top requests, rising complaints and accounts at risk, each linked to the conversations behind it.",
    result: { value: "1", label: "digest in place of four team reports" },
    usedBy: ["Product managers", "CX leads"],
    unit: "digest",
    units: "digests",
    typicalVolume: 4,
    pricePerTask: 2,
    platformFee: 0.4,
    runsOn: ["our-cloud", "your-cloud"],
    timeToLive: "1–2 weeks",
    steps: [
      {
        phase: "pre",
        title: "Gathers the week's conversations",
        detail: "Reads tickets, call notes and reviews from the past week.",
        actor: "Help desk MCP server",
      },
      {
        phase: "work",
        title: "Finds what changed",
        detail: "Spots rising complaints, top requests and accounts at risk.",
        actor: "Data Analyst Agent",
      },
      {
        phase: "work",
        title: "Writes the digest",
        detail: "Two pages, each point linked to the conversations behind it.",
        actor: "Summarizer Agent",
      },
      {
        phase: "post",
        title: "Sends it out",
        detail: "Emails the digest to product teams every Monday morning.",
        actor: "Send Email",
      },
    ],
    components: [
      { kind: "Agent", name: "Data Analyst Agent", role: "Finds what changed this week" },
      { kind: "Agent", name: "Summarizer Agent", role: "Writes the digest" },
      { kind: "Tool", name: "Send Email", role: "Sends it to product teams" },
      { kind: "MCP server", name: "Help desk MCP server", role: "Reads the week's tickets" },
      { kind: "MCP server", name: "CRM MCP server", role: "Reads call notes and account health" },
    ],
    connectsTo: [
      { name: "Zendesk", available: true },
      { name: "Salesforce", available: true },
      { name: "App Store and Google Play reviews", available: true },
      { name: "Email", available: true },
    ],
    controls: [
      "Links open the original conversation only for people allowed to see it",
      "Customer names are hidden from teams without CRM access",
    ],
    prerequisites: ["At least one Customer Support or Sales service switched on"],
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
