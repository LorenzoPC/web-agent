"use client";

import { OVERSIGHT_LABEL } from "@/lib/agent-security";
import { ACTION_KINDS, type ActionKind, type Oversight } from "@/lib/mock-agent-security-data";
import { OversightPicker } from "./controls";

/** One rule per kind of action, for every agent, with the value to pick beside each. */
export function ActionRules({
  rules,
  onChange,
}: {
  rules: Record<ActionKind, Oversight>;
  onChange: (kind: ActionKind, level: Oversight) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
        {ACTION_KINDS.map((kind) => {
          const value = rules[kind.id];
          const offRecommendation = value !== kind.recommended;
          return (
            <div key={kind.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              <dt className="min-w-0 lg:max-w-xs">
                <span className="text-sm font-medium text-black dark:text-zinc-50">{kind.label}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{kind.examples}</span>
              </dt>
              <dd className="flex min-w-0 flex-col gap-1.5 lg:items-end">
                <OversightPicker
                  label={kind.label}
                  value={value}
                  onChange={(level) => onChange(kind.id, level)}
                  floor={kind.floor?.value}
                  floorWhy={kind.floor ? `Built in: ${kind.floor.why}` : undefined}
                />
                <p className="text-xs text-zinc-500 lg:text-right">
                  {kind.floor ? (
                    <>Built in: {kind.floor.why}</>
                  ) : offRecommendation ? (
                    <>
                      Recommended:{" "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{OVERSIGHT_LABEL[kind.recommended]}</span>.
                      {kind.not?.value === value && (
                        <>
                          {" "}
                          Not {OVERSIGHT_LABEL[value].toLowerCase()}: {kind.not.why}.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Recommended.
                      {kind.not && (
                        <>
                          {" "}
                          Not {OVERSIGHT_LABEL[kind.not.value].toLowerCase()}: {kind.not.why}.
                        </>
                      )}
                    </>
                  )}
                </p>
              </dd>
            </div>
          );
        })}
      </dl>
      <ul className="flex flex-col gap-1 text-xs text-zinc-500">
        <li>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Asks the person first:</span> the agent shows the
          exact action and waits for the person who started it. Agents that run on a schedule have no one to ask, so an
          approver answers instead.
        </li>
        <li>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Needs an approver:</span> the action waits for
          someone in your approver groups, under Approvals and limits.
        </li>
      </ul>
    </div>
  );
}
