"use client";

import { useState, type ReactNode } from "react";
import { agentState, changedAreas, formatDollars, trifecta, type Pauses } from "@/lib/agent-security";
import type { Agent, AgentPolicy, LogEntry, Person, SecuritySettings } from "@/lib/mock-agent-security-data";
import { unbuilt } from "@/lib/unbuilt";
import { ActionRules } from "./action-rules";
import { AgentsSection } from "./agents-section";
import { ApprovalsAndLimits } from "./approvals-limits";
import { PRIMARY_BUTTON_CLASS, SMALL_BUTTON_CLASS, SettingsSection } from "./controls";
import { DataAndModels } from "./data-and-models";
import { DecisionLog } from "./decision-log";
import { PreviewAs } from "./preview-as";

const SECTIONS = [
  { id: "rules", label: "What agents may do" },
  { id: "agents", label: "Agents" },
  { id: "preview", label: "Preview as" },
  { id: "data", label: "Data and models" },
  { id: "approvals", label: "Approvals and limits" },
  { id: "log", label: "Recent decisions" },
] as const;

function SummaryItem({ label, needs, children }: { label: string; needs: string; children: ReactNode }) {
  return (
    <div {...unbuilt("panel", needs)} className="flex min-w-0 flex-col gap-1 bg-white p-4 dark:bg-zinc-950">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm text-black dark:text-zinc-50">{children}</dd>
    </div>
  );
}

/**
 * The organization's agent security settings. Edits go into a draft that
 * Preview as reads; Save would store it. Pausing isn't part of the draft: it
 * applies at once, as an emergency stop should.
 */
export function AgentSecuritySettings({
  groups,
  agents,
  people,
  initialSettings,
  monthSpend,
  pendingApprovals,
  log,
}: {
  /** Groups from the organization's identity provider. */
  groups: string[];
  agents: Agent[];
  people: Person[];
  initialSettings: SecuritySettings;
  monthSpend: number;
  pendingApprovals: number;
  log: LogEntry[];
}) {
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [pauses, setPauses] = useState<Pauses>({ all: false, agents: {} });
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0].id);
  const [justSaved, setJustSaved] = useState(false);

  const changes = changedAreas(saved, draft, agents);
  const running = agents.filter((a) => agentState(a, draft, pauses).kind === "running").length;
  const flagged = agents.filter((a) => trifecta(a, draft));

  function update(patch: Partial<SecuritySettings>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setJustSaved(false);
  }

  function updateAgent(id: string, patch: Partial<AgentPolicy>) {
    setDraft((prev) => ({ ...prev, agents: { ...prev.agents, [id]: { ...prev.agents[id], ...patch } } }));
    setJustSaved(false);
  }

  function openAgent(id: string) {
    setSelectedAgentId(id);
    document.getElementById("agents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-zinc-500 underline-offset-2 hover:text-black hover:underline dark:hover:text-zinc-50"
            >
              {section.label}
            </a>
          ))}
        </nav>
        {!pauses.all && (
          <button
            type="button"
            {...unbuilt("action", "agent runtime controls")}
            onClick={() => setPauses((p) => ({ ...p, all: true }))}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Pause all agents
          </button>
        )}
      </div>

      {pauses.all && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium text-black dark:text-zinc-50">All agents are paused.</span> Nothing runs, and
            scheduled runs are skipped, until you resume.
          </p>
          <button
            type="button"
            {...unbuilt("action", "agent runtime controls")}
            onClick={() => setPauses((p) => ({ ...p, all: false }))}
            className={PRIMARY_BUTTON_CLASS}
          >
            Resume agents
          </button>
        </div>
      )}

      <dl className="grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
        <SummaryItem label="Agents running" needs="agent registry">
          {running} of {agents.length}
        </SummaryItem>
        <SummaryItem label="Waiting for an approver" needs="approvals queue">
          {pendingApprovals} {pendingApprovals === 1 ? "request" : "requests"}
        </SummaryItem>
        <SummaryItem label="Always checked before sending" needs="agent registry">
          {flagged.length} {flagged.length === 1 ? "agent" : "agents"}
        </SummaryItem>
        <SummaryItem label="Spent this month" needs="usage metering">
          {formatDollars(monthSpend)} <span className="text-zinc-500">of {formatDollars(draft.monthlyBudget)}</span>
        </SummaryItem>
      </dl>

      {flagged.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-zinc-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-zinc-300">
          <p>
            <span className="font-medium text-black dark:text-zinc-50">
              {flagged.length === 1 ? "1 agent reads" : `${flagged.length} agents read`} text written outside the company
              and private data, and can reach outside.
            </span>{" "}
            Text in a ticket or on a web page could tell an agent to send private data out. So everything these agents
            send out is checked first, whatever your rules say.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {flagged.map((agent) => (
              <button key={agent.id} type="button" onClick={() => openAgent(agent.id)} className={SMALL_BUTTON_CLASS}>
                {agent.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <SettingsSection
        id="rules"
        title="What agents may do"
        hint="One rule for each kind of action, for every agent. An agent can be stricter on its own settings, never looser."
      >
        <ActionRules rules={draft.rules} onChange={(kind, level) => update({ rules: { ...draft.rules, [kind]: level } })} />
      </SettingsSection>

      <SettingsSection
        id="agents"
        title="Agents"
        hint="The agents running for your organization: who can start each one, who it acts as, and where it's stricter than your rules."
      >
        <AgentsSection
          agents={agents}
          settings={draft}
          pauses={pauses}
          people={people}
          groups={groups}
          selectedId={selectedAgentId}
          onSelect={setSelectedAgentId}
          onPolicyChange={updateAgent}
          onPause={(id, paused) => setPauses((p) => ({ ...p, agents: { ...p.agents, [id]: paused } }))}
        />
      </SettingsSection>

      <SettingsSection
        id="preview"
        title="Preview as"
        hint="See what an agent would do for one person, and the rule that decides each action. It includes your unsaved changes."
      >
        <PreviewAs agents={agents} people={people} settings={draft} pauses={pauses} />
      </SettingsSection>

      <SettingsSection
        id="data"
        title="Data and models"
        hint="What agents never see, where your data is processed, and which model providers may process it."
      >
        <DataAndModels settings={draft} agents={agents} onChange={update} />
      </SettingsSection>

      <SettingsSection
        id="approvals"
        title="Approvals and limits"
        hint="Who answers when an action needs an approver, how long a request waits, and what agents may spend."
      >
        <ApprovalsAndLimits settings={draft} groups={groups} monthSpend={monthSpend} onChange={update} />
      </SettingsSection>

      <SettingsSection
        id="log"
        title="Recent decisions"
        hint="Every action an agent takes is logged with the rule that decided it, as that rule stood at the time. Kept for 12 months."
        action={
          <button type="button" {...unbuilt("action", "decision log export")} className={SMALL_BUTTON_CLASS}>
            Export log
          </button>
        }
      >
        <DecisionLog entries={log} agents={agents} people={people} />
      </SettingsSection>

      {(changes.length > 0 || justSaved) && (
        <div
          role="status"
          className="sticky bottom-4 z-20 ml-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 shadow-lg max-sm:ml-16 dark:border-zinc-700 dark:bg-zinc-950"
        >
          {changes.length > 0 ? (
            <>
              <p className="min-w-0 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium text-black dark:text-zinc-50">Unsaved:</span> {changes.join(", ")}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDraft(saved)} className={SMALL_BUTTON_CLASS}>
                  Discard
                </button>
                <button
                  type="button"
                  {...unbuilt("action", "security settings store")}
                  onClick={() => {
                    setSaved(draft);
                    setJustSaved(true);
                  }}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  Save changes
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Saved for this visit only. Agents would follow the new rules from their next action.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
