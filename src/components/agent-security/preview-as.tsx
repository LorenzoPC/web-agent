"use client";

import { useState } from "react";
import {
  actingPerson,
  agentState,
  canStart,
  decideFor,
  outcomeLabel,
  type Pauses,
} from "@/lib/agent-security";
import type { Agent, Person, SecuritySettings } from "@/lib/mock-agent-security-data";
import { unbuilt } from "@/lib/unbuilt";
import { OutcomeChip, SELECT_CLASS } from "./controls";

/**
 * What one agent would do for one person, tool by tool, and which rule decides
 * each action. Reads the page's draft, so unsaved changes show here first.
 */
export function PreviewAs({
  agents,
  people,
  settings,
  pauses,
}: {
  agents: Agent[];
  people: Person[];
  settings: SecuritySettings;
  pauses: Pauses;
}) {
  const [personId, setPersonId] = useState(people[0].id);
  const [agentId, setAgentId] = useState(agents.find((a) => a.trigger.kind === "person")?.id ?? agents[0].id);
  const agent = agents.find((a) => a.id === agentId)!;
  const chosen = people.find((p) => p.id === personId)!;
  const scheduled = agent.trigger.kind === "schedule";
  const person = actingPerson(agent, settings, people, chosen);
  const state = agentState(agent, settings, pauses);
  const allowed = scheduled || canStart(agent, settings, chosen);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Agent</span>
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={SELECT_CLASS}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Person</span>
          {scheduled ? (
            <select disabled value={person?.id} className={`${SELECT_CLASS} opacity-60`}>
              {person && (
                <option value={person.id}>
                  {person.name}, its owner
                </option>
              )}
            </select>
          ) : (
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className={SELECT_CLASS}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.group})
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      <div {...unbuilt("panel", "directory and source-system permissions")} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800" aria-live="polite">
        {state.kind !== "running" ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <OutcomeChip outcome={state.kind === "paused" ? "paused" : "blocked"}>
              {state.kind === "paused" ? "Paused" : "Blocked"}
            </OutcomeChip>{" "}
            {agent.name} doesn&apos;t run for anyone. {state.reason}
          </p>
        ) : !allowed ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <OutcomeChip outcome="blocked">Can&apos;t start</OutcomeChip> {chosen.name} is in {chosen.group}, and only{" "}
            {settings.agents[agent.id].usedBy.join(", ") || "no one"} can start {agent.name}.
          </p>
        ) : !person ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{agent.name} has no owner to act as.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {scheduled ? (
                <>
                  {agent.name} runs {agent.trigger.kind === "schedule" && agent.trigger.when.toLowerCase()} as{" "}
                  <span className="font-medium text-black dark:text-zinc-50">{person.name}</span>, {person.title}.
                </>
              ) : (
                <>
                  What {agent.name} does when{" "}
                  <span className="font-medium text-black dark:text-zinc-50">{person.name}</span>, {person.title}, starts
                  it.
                </>
              )}
            </p>
            <ul className="mt-3 flex flex-col divide-y divide-zinc-200/70 dark:divide-zinc-800">
              {agent.tools.map((tool) => {
                const decision = decideFor(agent, tool, settings, person);
                return (
                  <li key={tool.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:gap-4">
                    <div className="flex min-w-0 items-start justify-between gap-3 sm:w-64 sm:shrink-0 sm:flex-col sm:justify-start sm:gap-1">
                      <span className="text-sm text-black dark:text-zinc-50">{tool.label}</span>
                      <OutcomeChip outcome={decision.outcome}>{outcomeLabel(decision.outcome, person)}</OutcomeChip>
                    </div>
                    <ol className="flex min-w-0 flex-col gap-0.5 text-xs text-zinc-500">
                      {decision.effective.steps.map((step, i) => (
                        <li key={i} className={step === decision.effective.decidedBy && decision.outcome !== "blocked" ? "font-medium text-zinc-800 dark:text-zinc-200" : undefined}>
                          {step.label} · {step.text}
                        </li>
                      ))}
                      {decision.effective.level !== "off" && (
                        <li
                          className={
                            decision.personCheck.ok
                              ? undefined
                              : "font-medium text-red-700 dark:text-red-400"
                          }
                        >
                          {decision.personCheck.text}
                        </li>
                      )}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
