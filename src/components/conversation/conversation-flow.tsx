"use client";

import { formatCostModel } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";
import { AnalysisStatusNote } from "./analysis-status";
import {
  useTranscriptAnalysis,
  type AnalysisFallback,
  type AnalysisStatus,
  type AnalysisTask,
} from "./use-transcript-analysis";

// One call for the whole plan: the model writes the NEXT phases before the
// ACTIONs, so the actions follow from those phases. Asking for exactly 3
// actions framed as tasks for the agent (verb-first, with an example) keeps the
// small local model at 2–4 requests in the user's voice, rather than questions
// from the agent or advice to the user ("Make sure to proofread…"). Each NEXT
// is followed by the agent role best suited to it, from the agents on offer.
function flowTask(roles: string[]): AnalysisTask {
  return {
    name: "Draft flow",
    systemPrompt:
      "You map where a conversation between a user and an AI agent is heading. Reply in exactly this format and nothing else:\n" +
      "INTENT: <what the user's most recent message asks for, 2 to 5 words>\n" +
      "NEXT: <the most likely next phase of their work, 2 to 5 words>\n" +
      "AGENT: <the role best suited to that phase>\n" +
      "NEXT: <the second most likely next phase, 2 to 5 words>\n" +
      "AGENT: <the role best suited to that phase>\n" +
      "ACTION: <a task the user could ask the agent to do next>\n" +
      "ACTION: <another>\n" +
      "ACTION: <another>\n" +
      "INTENT covers the most recent user message only. " +
      `Each AGENT is one of these roles, copied exactly: ${roles.join(", ")}. ` +
      "Write exactly 3 ACTION lines, each moving the work into one of the two NEXT phases. " +
      "Each ACTION is a task for the agent to do for the user, not advice to the user, under 10 words, " +
      'starting with a verb like Draft, Write, List, Compare, Estimate, or Find, e.g. "Estimate the cost of each item". ' +
      "Never write questions from the agent. No parentheses, no numbering, no extra text.",
  };
}

export interface FlowPhase {
  label: string;
  /** The agent suited to this phase, when the model named one of the agents' roles. */
  agentId?: string;
}

export interface FlowPlan {
  /** What the most recent message asks for. */
  intent: string;
  /** The two most likely next phases, most likely first. */
  next: FlowPhase[];
  /** 2–4 instructions the user could send to move into those phases. */
  actions: string[];
}

const PLAN_LINE = /^(?:[-*•]|\d+[.)])?\s*(intent|next|agent|action)\s*\d*\s*:\s*(.+)$/i;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Chip-sized: cuts the ": detail", "(e.g. …)" and " - aside" tails the model adds anyway. */
const shortLabel = (text: string) => capitalize(text.split(/[:(]| [-–—] /)[0].replace(/\.$/, "").trim());

const asAction = (text: string) => capitalize(text.replace(/^["']|["']$/g, "").replace(/\.$/, "").trim());

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]+/g, " ").trim();

/** The exact role first, then a role inside a looser answer like "the Data Analyst agent". */
function findAgentByRole(text: string, agents: PipelineStep[]): PipelineStep | undefined {
  const wanted = normalize(text);
  if (!wanted) return undefined;
  return (
    agents.find((a) => a.role && normalize(a.role) === wanted) ??
    agents.find((a) => a.role && wanted.includes(normalize(a.role)))
  );
}

function parsePlan(output: string, agents: PipelineStep[]): FlowPlan {
  const plan: FlowPlan = { intent: "", next: [], actions: [] };
  // Paired with the NEXT lines by position, so it doesn't matter whether the
  // model interleaves them as asked or writes all the NEXTs first.
  const roles: string[] = [];
  for (const line of output.split("\n")) {
    const match = line.replaceAll("**", "").trim().match(PLAN_LINE);
    if (!match) continue;
    const kind = match[1].toLowerCase();
    if (kind === "action") {
      const action = asAction(match[2]);
      if (action && plan.actions.length < 4 && !plan.actions.includes(action)) plan.actions.push(action);
      continue;
    }
    if (kind === "agent") {
      roles.push(match[2]);
      continue;
    }
    const label = shortLabel(match[2]);
    if (!label) continue;
    if (kind === "intent" && !plan.intent) plan.intent = label;
    else if (kind === "next" && plan.next.length < 2) plan.next.push({ label });
  }
  plan.next.forEach((phase, i) => {
    phase.agentId = roles[i] ? findAgentByRole(roles[i], agents)?.id : undefined;
  });
  // Thrown inside the hook's request, so it surfaces as an error and keeps the last good plan.
  if (!plan.intent && plan.next.length === 0) throw new Error("Couldn't read a flow from the model's reply");
  return plan;
}

const EMPTY_PLAN: FlowPlan = { intent: "", next: [], actions: [] };

export function useConversationFlow(agents: PipelineStep[]) {
  const roles = [...new Set(agents.flatMap((a) => (a.role ? [a.role] : [])))];
  return useTranscriptAnalysis(flowTask(roles), (output) => parsePlan(output, agents), EMPTY_PLAN);
}

/**
 * Early draft of the flow, between Key points and the chat once the intent is
 * clear: the current intent on its own row, then the two most likely next
 * phases side by side (dashed: proposed, not decided), each offering a switch
 * to the agent suited to it.
 */
export function ConversationFlow({
  plan,
  status,
  error,
  fallback,
  agents,
  currentAgentId,
  onSwitchAgent,
}: {
  plan: FlowPlan;
  status: AnalysisStatus;
  error?: string;
  fallback?: AnalysisFallback;
  agents: PipelineStep[];
  currentAgentId: string;
  onSwitchAgent: (agentId: string) => void;
}) {
  const hasPlan = plan.intent !== "" || plan.next.length > 0;
  const firstNext = plan.intent ? 2 : 1;

  return (
    <section
      aria-label="Draft flow"
      aria-busy={status === "loading"}
      className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="shrink-0 text-xs font-medium text-zinc-500">
          Flow <span className="font-normal text-zinc-400 dark:text-zinc-600">· now › likely next</span>
        </h3>
        {hasPlan && <AnalysisStatusNote status={status} error={error} fallback={fallback} />}
      </div>
      {hasPlan ? (
        <ol className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {plan.intent && (
            <li className="col-span-2 flex min-w-0">
              <span
                title={`Current intent: ${plan.intent}`}
                className="flex min-w-0 items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <span className="tabular-nums text-zinc-400 dark:text-zinc-500">1</span>
                <span className="truncate">{plan.intent}</span>
              </span>
            </li>
          )}
          {plan.next.map((phase, i) => (
            <PhaseCard
              key={i}
              number={firstNext + i}
              phase={phase}
              agent={agents.find((a) => a.id === phase.agentId)}
              currentAgentId={currentAgentId}
              onSwitchAgent={onSwitchAgent}
            />
          ))}
        </ol>
      ) : status === "loading" ? (
        <div aria-label="Sketching flow" className="mt-2 grid grid-cols-2 gap-2">
          <span className="col-span-2 h-6 w-32 rounded-full bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          {[0, 1].map((i) => (
            <span key={i} className="h-16 rounded-lg bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        status === "error" && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}

function PhaseCard({
  number,
  phase,
  agent,
  currentAgentId,
  onSwitchAgent,
}: {
  number: number;
  phase: FlowPhase;
  agent?: PipelineStep;
  currentAgentId: string;
  onSwitchAgent: (agentId: string) => void;
}) {
  return (
    <li className="flex min-w-0 flex-col justify-between gap-2 rounded-lg border border-dashed border-zinc-300 px-2.5 py-2 dark:border-zinc-700">
      <span title={`Likely next phase: ${phase.label}`} className="flex min-w-0 gap-1.5 text-zinc-500 dark:text-zinc-400">
        <span className="tabular-nums text-zinc-400 dark:text-zinc-500">{number}</span>
        <span className="line-clamp-2">{phase.label}</span>
      </span>
      {agent &&
        (agent.id === currentAgentId ? (
          <span
            title={`${agent.name} is already answering`}
            className="flex min-w-0 items-center justify-between gap-2 px-2 py-1 text-[11px] text-zinc-400 dark:text-zinc-600"
          >
            <span className="truncate">{agent.name}</span>
            <span className="shrink-0">Current</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onSwitchAgent(agent.id)}
            aria-label={`Switch to ${agent.name}`}
            title={`Switch to ${agent.name} (${formatCostModel(agent.cost)})`}
            className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <span className="truncate">{agent.name}</span>
            <span className="shrink-0 font-medium">Switch</span>
          </button>
        ))}
    </li>
  );
}

/** Recommended next instructions, just above the composer. Clicking one sends it. */
export function NextActions({ actions, onSelect }: { actions: string[]; onSelect: (action: string) => void }) {
  return (
    <div role="group" aria-label="Recommended next actions" className="mb-2 flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action}
          type="button"
          title={action}
          onClick={() => onSelect(action)}
          className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
