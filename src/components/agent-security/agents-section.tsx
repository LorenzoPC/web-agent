"use client";

import {
  OVERSIGHT_LABEL,
  OVERSIGHT_ORDER,
  STATE_CLASS,
  STATE_LABEL,
  agentState,
  effective,
  outcomeLabel,
  privateToName,
  ruleLevel,
  stricter,
  trifecta,
  type Pauses,
  type Trifecta,
} from "@/lib/agent-security";
import {
  DATA_SOURCES,
  PROVIDERS,
  SENSITIVITY_LABEL,
  type Agent,
  type AgentPolicy,
  type Oversight,
  type Person,
  type SecuritySettings,
} from "@/lib/mock-agent-security-data";
import { unbuilt } from "@/lib/unbuilt";
import { Chip, GroupPicker, OutcomeChip, SELECT_CLASS, SubHeading, Switch } from "./controls";

function triggerText(agent: Agent): string {
  return agent.trigger.kind === "person" ? "Started by a person" : agent.trigger.when;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Why the agent's outside actions are always checked, in one paragraph. */
export function TrifectaNote({ found }: { found: Trifecta }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-zinc-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-zinc-300">
      <p>
        <span className="font-medium text-black dark:text-zinc-50">Everything it sends out is checked.</span> It reads text
        written outside the company ({list(found.untrusted.map((s) => s.name.toLowerCase()))}) and private data (
        {list(privateToName(found).map((s) => s.name.toLowerCase()))}), and it can reach outside (
        {list(found.wayOut.map((t) => t.id))}). Text in one of those could tell the agent to send private data out.
      </p>
      <p className="mt-1">
        So its outside actions always ask first, whatever your rule says. To lift this, turn off one of the three for this
        agent.
      </p>
    </div>
  );
}

function AgentDetail({
  agent,
  settings,
  pauses,
  people,
  groups,
  onPolicyChange,
  onPause,
}: {
  agent: Agent;
  settings: SecuritySettings;
  pauses: Pauses;
  people: Person[];
  groups: string[];
  onPolicyChange: (patch: Partial<AgentPolicy>) => void;
  onPause: (paused: boolean) => void;
}) {
  const policy = settings.agents[agent.id];
  const state = agentState(agent, settings, pauses);
  const found = trifecta(agent, settings);
  const owner = people.find((p) => p.id === policy.ownerId);
  const provider = PROVIDERS.find((p) => p.id === agent.model.provider)!;
  const sources = [...new Set(agent.tools.map((t) => t.source))].map((id) => ({
    source: DATA_SOURCES[id],
    writes: agent.tools.some((t) => t.source === id && t.access === "write"),
  }));

  function setOverride(toolId: string, level: Oversight | "") {
    const overrides = { ...policy.overrides };
    if (level) overrides[toolId] = level;
    else delete overrides[toolId];
    onPolicyChange({ overrides });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-black dark:text-zinc-50">{agent.name}</h3>
            <Chip className={STATE_CLASS[state.kind]}>{STATE_LABEL[state.kind]}</Chip>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{agent.purpose}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {agent.team} · {triggerText(agent)} · {agent.model.name} on {provider.name}
          </p>
        </div>
        <Switch
          {...unbuilt("action", "agent runtime controls")}
          label="Pause agent"
          checked={Boolean(pauses.agents[agent.id])}
          onChange={onPause}
          disabled={pauses.all}
        />
      </div>

      {state.kind !== "running" && (
        <p
          className={`text-sm ${state.kind === "blocked" ? "text-red-700 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}
        >
          {state.reason}
          {state.kind === "blocked" && " Allow it under Data and models, or ask us for a model that's allowed."}
        </p>
      )}

      {found && <TrifectaNote found={found} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <SubHeading>Who can start it</SubHeading>
          {agent.trigger.kind === "person" ? (
            <>
              <GroupPicker
                label={`Groups that can start ${agent.name}`}
                groups={groups}
                value={policy.usedBy}
                onChange={(usedBy) => onPolicyChange({ usedBy })}
              />
              {policy.usedBy.length === 0 && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">No one can start this agent.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No one: it runs {agent.trigger.when.toLowerCase()}.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <SubHeading>Acts as</SubHeading>
          {agent.trigger.kind === "person" ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              The person who starts it. It reaches only what they can, in every system.
            </p>
          ) : (
            <>
              <select
                aria-label={`Person ${agent.name} acts as`}
                value={policy.ownerId}
                onChange={(e) => onPolicyChange({ ownerId: e.target.value })}
                className={`${SELECT_CLASS} sm:max-w-xs`}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.title})
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Its owner. It reaches only what {owner?.name ?? "they"} can, in every system.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <SubHeading>What it may do</SubHeading>
          <p className="mt-0.5 text-xs text-zinc-500">Each tool follows your rule for its kind. Here it can be stricter, never looser.</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-zinc-200 px-3 py-2 text-xs text-zinc-500 md:grid dark:border-zinc-800">
            <span>Tool</span>
            <span>This agent</span>
            <span>Result</span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {agent.tools.map((tool) => {
              const base = ruleLevel(tool, settings);
              const override = policy.overrides[tool.id];
              const eff = effective(agent, tool, settings);
              const source = DATA_SOURCES[tool.source];
              const options = OVERSIGHT_ORDER.filter((level) => stricter(level, base));
              return (
                <li
                  key={tool.id}
                  className="grid gap-2 px-3 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-black dark:text-zinc-50">{tool.label}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 [overflow-wrap:anywhere]">
                      <code className="font-mono">{tool.id}</code> · {source.name}
                    </p>
                  </div>
                  <select
                    aria-label={`${tool.label}: this agent`}
                    value={override && stricter(override, base) ? override : ""}
                    onChange={(e) => setOverride(tool.id, e.target.value as Oversight | "")}
                    className={SELECT_CLASS}
                  >
                    <option value="">Your rule ({OVERSIGHT_LABEL[base].toLowerCase()})</option>
                    {options.map((level) => (
                      <option key={level} value={level}>
                        {OVERSIGHT_LABEL[level]}
                      </option>
                    ))}
                  </select>
                  <div className="flex min-w-0 flex-col items-start gap-1">
                    <OutcomeChip outcome={eff.level}>{outcomeLabel(eff.level)}</OutcomeChip>
                    {eff.decidedBy.label !== "Your rule" && eff.decidedBy.label !== "This agent" && (
                      <p className="text-xs text-zinc-500">
                        {eff.decidedBy.label} · {eff.decidedBy.text}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SubHeading>Data it reaches</SubHeading>
        <ul {...unbuilt("panel", "agent registry")} className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 px-3 dark:divide-zinc-900 dark:border-zinc-800">
          {sources.map(({ source, writes }) => (
            <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0 text-sm text-black dark:text-zinc-50">
                {source.name} <span className="text-zinc-500">· {source.system} · {writes ? "reads and changes" : "reads"}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {source.untrusted && (
                  <Chip className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Written outside the company</Chip>
                )}
                <Chip
                  className={
                    source.sensitivity === "general"
                      ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      : "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black"
                  }
                >
                  {SENSITIVITY_LABEL[source.sensitivity]}
                </Chip>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AgentsSection({
  agents,
  settings,
  pauses,
  people,
  groups,
  selectedId,
  onSelect,
  onPolicyChange,
  onPause,
}: {
  agents: Agent[];
  settings: SecuritySettings;
  pauses: Pauses;
  people: Person[];
  groups: string[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPolicyChange: (agentId: string, patch: Partial<AgentPolicy>) => void;
  onPause: (agentId: string, paused: boolean) => void;
}) {
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Agents">
        <ul className="flex flex-col gap-1.5">
          {agents.map((agent) => {
            const state = agentState(agent, settings, pauses);
            const active = agent.id === selected.id;
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  {...unbuilt("panel", "agent registry")}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onSelect(agent.id)}
                  className={`flex w-full flex-col gap-1 rounded-lg border bg-white p-3 text-left transition-colors dark:bg-zinc-950 ${
                    active
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-black dark:text-zinc-50">{agent.name}</span>
                    <Chip className={STATE_CLASS[state.kind]}>{STATE_LABEL[state.kind]}</Chip>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {agent.team} · {triggerText(agent)}
                  </span>
                  {trifecta(agent, settings) && (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Checks everything it sends out</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <AgentDetail
        key={selected.id}
        agent={selected}
        settings={settings}
        pauses={pauses}
        people={people}
        groups={groups}
        onPolicyChange={(patch) => onPolicyChange(selected.id, patch)}
        onPause={(paused) => onPause(selected.id, paused)}
      />
    </div>
  );
}
