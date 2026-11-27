// How Agent security (/app/settings/security) decides what an agent may do.
// Pure functions over the page's draft settings, so Preview as shows unsaved
// changes. The real resolver has to run on the server, on every action an
// agent takes (ADR-0003 decisions 5 and 10); this one only explains the rules.

import {
  ACTION_KINDS,
  DATA_SOURCES,
  PROVIDERS,
  REGIONS,
  type ActionKind,
  type ActionKindInfo,
  type Agent,
  type AgentTool,
  type DataSource,
  type Oversight,
  type Person,
  type ProviderId,
  type SecuritySettings,
} from "./mock-agent-security-data";

/** From least to most oversight. A stricter level always wins. */
export const OVERSIGHT_ORDER: Oversight[] = ["auto", "confirm", "approve", "off"];

export const OVERSIGHT_LABEL: Record<Oversight, string> = {
  auto: "Runs on its own",
  confirm: "Asks the person first",
  approve: "Needs an approver",
  off: "Off",
};

/** What an action ends up doing for one person, or why it can't run. */
export type Outcome = Oversight | "blocked" | "paused";

export const OUTCOME_CLASS: Record<Outcome, string> = {
  auto: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  confirm: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  approve: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  off: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  blocked: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  paused: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

export function stricter(a: Oversight, b: Oversight): boolean {
  return OVERSIGHT_ORDER.indexOf(a) > OVERSIGHT_ORDER.indexOf(b);
}

function strictest(levels: Oversight[]): Oversight {
  return levels.reduce<Oversight>((top, level) => (stricter(level, top) ? level : top), "auto");
}

export function kindInfo(kind: ActionKind): ActionKindInfo {
  return ACTION_KINDS.find((k) => k.id === kind)!;
}

export function firstName(person: Person): string {
  return person.name.split(" ")[0];
}

/** One thing that went into an action's level, in the order it was applied. */
export interface Step {
  label: "Your rule" | "Built in" | "This agent" | "Scheduled";
  text: string;
  level: Oversight;
}

export interface Effective {
  level: Oversight;
  steps: Step[];
  /** The first step that set the final level: the reason to show. */
  decidedBy: Step;
}

/** The organization's rule for a tool's kind, raised to any built-in minimum. An agent can only go stricter. */
export function ruleLevel(tool: AgentTool, settings: SecuritySettings): Oversight {
  const floor = kindInfo(tool.kind).floor;
  return strictest([settings.rules[tool.kind], ...(floor ? [floor.value] : [])]);
}

/** The organization's rule, any built-in minimum, then the agent's own stricter setting. */
function baseSteps(agent: Agent, tool: AgentTool, settings: SecuritySettings): Step[] {
  const info = kindInfo(tool.kind);
  const rule = settings.rules[tool.kind];
  const steps: Step[] = [
    { label: "Your rule", text: `${info.label}: ${OVERSIGHT_LABEL[rule].toLowerCase()}`, level: rule },
  ];
  if (info.floor) steps.push({ label: "Built in", text: info.floor.why, level: info.floor.value });
  const override = settings.agents[agent.id]?.overrides[tool.id];
  if (override) steps.push({ label: "This agent", text: `Set to ${OVERSIGHT_LABEL[override].toLowerCase()}`, level: override });
  return steps;
}

/**
 * The three things that, together, let text in a ticket or on a web page talk
 * an agent into sending private data out (ADR-0003 decision 17).
 */
export interface Trifecta {
  untrusted: DataSource[];
  private: DataSource[];
  wayOut: AgentTool[];
}

function uniqueSources(tools: AgentTool[]): DataSource[] {
  return [...new Set(tools.map((t) => t.source))].map((id) => DATA_SOURCES[id]);
}

/** Whether an agent's tools that aren't off read untrusted text and private data, and can reach outside. */
export function trifecta(agent: Agent, settings: SecuritySettings): Trifecta | null {
  const live = agent.tools.filter((tool) => strictest(baseSteps(agent, tool, settings).map((s) => s.level)) !== "off");
  const reads = live.filter((t) => t.access === "read");
  const untrusted = uniqueSources(reads.filter((t) => DATA_SOURCES[t.source].untrusted));
  const priv = uniqueSources(reads.filter((t) => DATA_SOURCES[t.source].sensitivity !== "general"));
  const wayOut = live.filter((t) => t.kind === "outside");
  return untrusted.length && priv.length && wayOut.length ? { untrusted, private: priv, wayOut } : null;
}

/** Private sources worth naming beside the untrusted ones: those not already named, unless that leaves none. */
export function privateToName(t: Trifecta): DataSource[] {
  const rest = t.private.filter((s) => !t.untrusted.includes(s));
  return rest.length ? rest : t.private;
}

/** What an agent's tool does, for anyone, before the person's own permissions are checked. */
export function effective(agent: Agent, tool: AgentTool, settings: SecuritySettings): Effective {
  const steps = baseSteps(agent, tool, settings);
  // DECIDE: whether a data owner can sign off to lift this (open item 4 in the mock data).
  if (tool.kind === "outside" && strictest(steps.map((s) => s.level)) !== "off" && trifecta(agent, settings)) {
    steps.push({
      label: "Built in",
      text: "This agent reads text written outside the company and private data, so anything it sends out asks first.",
      level: "confirm",
    });
  }
  let level = strictest(steps.map((s) => s.level));
  if (level === "confirm" && agent.trigger.kind === "schedule") {
    steps.push({
      label: "Scheduled",
      text: "No one starts this agent, so an approver answers instead of the person.",
      level: "approve",
    });
    level = "approve";
  }
  return { level, steps, decidedBy: steps.find((s) => s.level === level)! };
}

export function regionLabel(settings: SecuritySettings): string {
  return REGIONS.find((r) => r.id === settings.region)!.label;
}

/** Why a provider can't take this organization's data, if it can't. */
export function providerBlock(id: ProviderId, settings: SecuritySettings): string | null {
  const provider = PROVIDERS.find((p) => p.id === id)!;
  if (settings.region !== "any" && !provider.regions.includes(settings.region)) {
    return `${provider.name} doesn't process data in ${regionLabel(settings)}.`;
  }
  if (!settings.providers[id]) return `${provider.name} is turned off in your data rules.`;
  return null;
}

/** Agents paused by the admin: all of them, or one at a time. Not part of the draft: pausing applies at once. */
export interface Pauses {
  all: boolean;
  agents: Record<string, boolean>;
}

export type AgentState = { kind: "running" } | { kind: "paused" | "blocked"; reason: string };

export const STATE_LABEL: Record<AgentState["kind"], string> = {
  running: "Running",
  paused: "Paused",
  blocked: "Blocked",
};

export const STATE_CLASS: Record<AgentState["kind"], string> = {
  running: OUTCOME_CLASS.auto,
  paused: OUTCOME_CLASS.paused,
  blocked: OUTCOME_CLASS.blocked,
};

export function agentState(agent: Agent, settings: SecuritySettings, pauses: Pauses): AgentState {
  if (pauses.all) return { kind: "paused", reason: "All agents are paused." };
  if (pauses.agents[agent.id]) return { kind: "paused", reason: `You paused ${agent.name}.` };
  const blocked = providerBlock(agent.model.provider, settings);
  if (blocked) return { kind: "blocked", reason: `It runs on ${agent.model.name}. ${blocked}` };
  return { kind: "running" };
}

/** The person an agent acts as for someone: themselves, or a scheduled agent's owner. */
export function actingPerson(agent: Agent, settings: SecuritySettings, people: Person[], starter: Person): Person | undefined {
  if (agent.trigger.kind === "person") return starter;
  return people.find((p) => p.id === settings.agents[agent.id]?.ownerId);
}

/** Whether a person may start an agent. Scheduled agents aren't started by anyone. */
export function canStart(agent: Agent, settings: SecuritySettings, person: Person): boolean {
  return agent.trigger.kind === "person" && (settings.agents[agent.id]?.usedBy ?? []).includes(person.group);
}

export interface PersonDecision {
  outcome: Outcome;
  effective: Effective;
  /** The person's own access in the source system, which caps the agent. */
  personCheck: { ok: boolean; text: string };
}

/** What one tool does when the agent acts as this person. */
export function decideFor(agent: Agent, tool: AgentTool, settings: SecuritySettings, person: Person): PersonDecision {
  const eff = effective(agent, tool, settings);
  const source = DATA_SOURCES[tool.source];
  const has = person.access[tool.source];
  const ok = tool.access === "read" ? Boolean(has) : has === "write";
  const verb = tool.access === "read" ? "read" : "change";
  const text = `${person.name} ${ok ? "can" : "can't"} ${verb} ${source.name.toLowerCase()} in ${source.system}`;
  const outcome: Outcome = eff.level === "off" ? "off" : ok ? eff.level : "blocked";
  return { outcome, effective: eff, personCheck: { ok, text } };
}

export function outcomeLabel(outcome: Outcome, person?: Person): string {
  switch (outcome) {
    case "auto":
      return "Runs";
    case "confirm":
      return person ? `Asks ${firstName(person)} first` : "Asks the person first";
    case "approve":
      return "Waits for an approver";
    case "off":
      return "Off";
    case "blocked":
      return "Blocked";
    case "paused":
      return "Paused";
  }
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The parts of the page with unsaved changes, for the save bar. */
export function changedAreas(saved: SecuritySettings, draft: SecuritySettings, agents: Agent[]): string[] {
  const areas: string[] = [];
  if (!same(saved.rules, draft.rules)) areas.push("What agents may do");
  for (const agent of agents) {
    if (!same(saved.agents[agent.id], draft.agents[agent.id])) areas.push(agent.name);
  }
  if (!same(saved.hiddenFields, draft.hiddenFields) || saved.region !== draft.region || !same(saved.providers, draft.providers)) {
    areas.push("Data and models");
  }
  if (
    !same(saved.approvers, draft.approvers) ||
    saved.approvalExpiry !== draft.approvalExpiry ||
    saved.personDailyLimit !== draft.personDailyLimit ||
    saved.monthlyBudget !== draft.monthlyBudget ||
    saved.onBudgetOut !== draft.onBudgetOut
  ) {
    areas.push("Approvals and limits");
  }
  return areas;
}

export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}
