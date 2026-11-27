import { AgentSecuritySettings } from "@/components/agent-security/security-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  AGENTS,
  DECISION_LOG,
  INITIAL_SETTINGS,
  MONTH_SPEND,
  PENDING_APPROVALS,
  PEOPLE,
} from "@/lib/mock-agent-security-data";
import { ORG, ORG_GROUPS } from "@/lib/mock-mcp-connection-data";

const PRINCIPLES = [
  {
    title: "Agents act as a person",
    text: "The person who starts an agent, or the owner of a scheduled one. An agent never reaches more than that person can, in any system.",
  },
  {
    title: "Your rules are the ceiling",
    text: "You decide what each kind of action needs. An agent can be stricter than your rules, never looser, and built-in minimums always apply.",
  },
  {
    title: "Every action is logged",
    text: "Who it ran for, what it did, and the rule that decided it.",
  },
];

/**
 * Client workspace settings: a client organization's admin decides what its
 * agents may do on their own, what needs a person, and which data and models
 * they may use. The customer-admin side of ADR-0003 (decisions 6, 17, 28–32).
 */
export default function AgentSecurityPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 py-16 px-6">
        <SettingsTabs current="/app/settings/security" />
        <div>
          <p className="text-sm text-zinc-500">Settings · {ORG.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Agent security</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Decide what your agents may do on their own, what needs a person, and which data and models they can use.
            Your rules apply to every agent at {ORG.name}.
          </p>
        </div>
        <dl className="grid gap-x-8 gap-y-4 border-t border-zinc-200 pt-5 sm:grid-cols-3 dark:border-zinc-800">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title}>
              <dt className="text-sm font-medium text-black dark:text-zinc-50">{principle.title}</dt>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{principle.text}</dd>
            </div>
          ))}
        </dl>
        <AgentSecuritySettings
          groups={ORG_GROUPS}
          agents={AGENTS}
          people={PEOPLE}
          initialSettings={INITIAL_SETTINGS}
          monthSpend={MONTH_SPEND}
          pendingApprovals={PENDING_APPROVALS}
          log={DECISION_LOG}
        />
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Mockup: nothing here is saved. The agents, people and their permissions, spending and the decision log are mock
          data, and no rule is enforced yet.
        </p>
      </main>
    </div>
  );
}
