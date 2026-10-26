"use client";

import type { PipelineStep } from "@/lib/types";
import { LOCAL_ANALYSIS_MODEL, useTranscriptAnalysis, type AnalysisStatus } from "./use-transcript-analysis";

// One call for the whole plan: the model writes the NEXT phases before the
// ACTIONs, so the actions follow from those phases. Asking for exactly 3
// actions framed as tasks for the agent (verb-first, with an example) keeps the
// small local model at 2–4 requests in the user's voice, rather than questions
// from the agent or advice to the user ("Make sure to proofread…").
const FLOW_STEP: PipelineStep = {
  ...LOCAL_ANALYSIS_MODEL,
  id: "conversation-flow",
  name: "Draft flow",
  description: "Maps the current intent, the likely next phases, and actions toward them",
  systemPrompt:
    "You map where a conversation between a user and an AI agent is heading. Reply in exactly this format and nothing else:\n" +
    "INTENT: <what the user's most recent message asks for, 2 to 5 words>\n" +
    "NEXT: <the most likely next phase of their work, 2 to 5 words>\n" +
    "NEXT: <the second most likely next phase, 2 to 5 words>\n" +
    "ACTION: <a task the user could ask the agent to do next>\n" +
    "ACTION: <another>\n" +
    "ACTION: <another>\n" +
    "INTENT covers the most recent user message only. Write exactly 3 ACTION lines, each moving the work into one of the two NEXT phases. " +
    "Each ACTION is a task for the agent to do for the user — not advice to the user — under 10 words, " +
    'starting with a verb like Draft, Write, List, Compare, Estimate, or Find, e.g. "Estimate the cost of each item". ' +
    "Never write questions from the agent. No parentheses, no numbering, no extra text.",
};

export interface FlowPlan {
  /** What the most recent message asks for. */
  intent: string;
  /** The two most likely next phases, most likely first. */
  next: string[];
  /** 2–4 instructions the user could send to move into those phases. */
  actions: string[];
}

const PLAN_LINE = /^(?:[-*•]|\d+[.)])?\s*(intent|next|action)\s*\d*\s*:\s*(.+)$/i;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Chip-sized: cuts the ": detail", "(e.g. …)" and " — aside" tails the model adds anyway. */
const shortLabel = (text: string) => capitalize(text.split(/[:(]| [-–—] /)[0].replace(/\.$/, "").trim());

const asAction = (text: string) => capitalize(text.replace(/^["']|["']$/g, "").replace(/\.$/, "").trim());

function parsePlan(output: string): FlowPlan {
  const plan: FlowPlan = { intent: "", next: [], actions: [] };
  for (const line of output.split("\n")) {
    const match = line.replaceAll("**", "").trim().match(PLAN_LINE);
    if (!match) continue;
    const kind = match[1].toLowerCase();
    if (kind === "action") {
      const action = asAction(match[2]);
      if (action && plan.actions.length < 4 && !plan.actions.includes(action)) plan.actions.push(action);
      continue;
    }
    const label = shortLabel(match[2]);
    if (!label) continue;
    if (kind === "intent" && !plan.intent) plan.intent = label;
    else if (kind === "next" && plan.next.length < 2) plan.next.push(label);
  }
  // Thrown inside the hook's request, so it surfaces as an error and keeps the last good plan.
  if (!plan.intent && plan.next.length === 0) throw new Error("Couldn't read a flow from the model's reply");
  return plan;
}

const EMPTY_PLAN: FlowPlan = { intent: "", next: [], actions: [] };

export function useConversationFlow() {
  return useTranscriptAnalysis(FLOW_STEP, parsePlan, EMPTY_PLAN);
}

const CHIP = "flex min-w-0 max-w-56 items-center gap-1.5 rounded-full border px-2.5 py-1";

/**
 * Early draft of the flow, between Key points and the chat once the intent is
 * clear: the current intent, then the two most likely next phases (dashed —
 * proposed, not decided).
 */
export function ConversationFlow({
  plan,
  status,
  error,
}: {
  plan: FlowPlan;
  status: AnalysisStatus;
  error?: string;
}) {
  const items = [
    ...(plan.intent ? [{ label: plan.intent, current: true }] : []),
    ...plan.next.map((label) => ({ label, current: false })),
  ];

  return (
    <section
      aria-label="Draft flow"
      aria-busy={status === "loading"}
      className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-zinc-500">
          Flow <span className="font-normal text-zinc-400 dark:text-zinc-600">· now › likely next</span>
        </h3>
        {items.length > 0 && status === "loading" && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">Updating…</span>
        )}
        {items.length > 0 && status === "error" && (
          <span title={error} className="text-[11px] text-red-600 dark:text-red-400">
            Couldn&apos;t update
          </span>
        )}
      </div>
      {items.length > 0 ? (
        <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs">
          {items.map((item, i) => (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-zinc-400 dark:text-zinc-600">
                  ›
                </span>
              )}
              <span
                title={`${item.current ? "Current intent" : "Likely next phase"}: ${item.label}`}
                className={
                  item.current
                    ? `${CHIP} border-zinc-300 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100`
                    : `${CHIP} border-dashed border-zinc-300 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400`
                }
              >
                <span className="tabular-nums text-zinc-400 dark:text-zinc-500">{i + 1}</span>
                <span className="truncate">{item.label}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : status === "loading" ? (
        <div aria-label="Sketching flow" className="mt-2 flex gap-2">
          {["w-28", "w-24", "w-24"].map((width, i) => (
            <span key={i} className={`h-6 rounded-full bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${width}`} />
          ))}
        </div>
      ) : (
        status === "error" && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
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
