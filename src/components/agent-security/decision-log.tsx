"use client";

import type { Outcome } from "@/lib/agent-security";
import type { Agent, LogEntry, LogResult, Person } from "@/lib/mock-agent-security-data";
import { unbuilt } from "@/lib/unbuilt";
import { OutcomeChip } from "./controls";

const RESULT: Record<LogResult, { outcome: Outcome; label: string }> = {
  ran: { outcome: "auto", label: "Ran" },
  confirmed: { outcome: "confirm", label: "Confirmed" },
  approved: { outcome: "auto", label: "Approved" },
  waiting: { outcome: "approve", label: "Waiting" },
  declined: { outcome: "off", label: "Declined" },
  blocked: { outcome: "blocked", label: "Blocked" },
};

/** The latest decisions, each with the rule that decided it as it stood at the time. */
export function DecisionLog({ entries, agents, people }: { entries: LogEntry[]; agents: Agent[]; people: Person[] }) {
  return (
    <div {...unbuilt("panel", "decision log")} className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="px-3 py-2 font-normal">When</th>
            <th className="px-3 py-2 font-normal">Person</th>
            <th className="px-3 py-2 font-normal">Agent and tool</th>
            <th className="px-3 py-2 font-normal">Result</th>
            <th className="px-3 py-2 font-normal">Decided by</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {entries.map((entry) => {
            const agent = agents.find((a) => a.id === entry.agentId);
            const person = people.find((p) => p.id === entry.personId);
            const result = RESULT[entry.result];
            return (
              <tr key={entry.id} className="align-top">
                <td className="px-3 py-2.5 whitespace-nowrap text-zinc-500">{entry.when}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-black dark:text-zinc-50">
                  {person?.name}
                  {agent?.trigger.kind === "schedule" && <span className="block text-xs text-zinc-500">as its owner</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-black dark:text-zinc-50">{agent?.name}</span>
                  <code className="block font-mono text-xs text-zinc-500">{entry.toolId}</code>
                </td>
                <td className="px-3 py-2.5">
                  <OutcomeChip outcome={result.outcome}>{result.label}</OutcomeChip>
                  {entry.by && <span className="mt-0.5 block text-xs text-zinc-500">by {entry.by}</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{entry.rule}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
