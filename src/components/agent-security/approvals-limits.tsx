"use client";

import { Segmented } from "@/components/tools/form-controls";
import { formatDollars } from "@/lib/agent-security";
import { EXPIRY_OPTIONS, type ExpiryId, type SecuritySettings } from "@/lib/mock-agent-security-data";
import { unbuilt } from "@/lib/unbuilt";
import { GroupPicker, SubHeading } from "./controls";

const BUDGET_OPTIONS = [
  { id: "stop", label: "Stop agents" },
  { id: "alert", label: "Alert only" },
] as const;

function DollarInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <span className="flex w-40 items-center rounded-md border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900">
        <span className="text-sm text-zinc-500">$</span>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className="w-full bg-transparent px-1 py-1.5 text-sm text-black outline-none dark:text-zinc-50"
        />
      </span>
    </label>
  );
}

/** Who answers approval requests, how long they wait, and what agents may spend. */
export function ApprovalsAndLimits({
  settings,
  groups,
  monthSpend,
  onChange,
}: {
  settings: SecuritySettings;
  groups: string[];
  monthSpend: number;
  onChange: (patch: Partial<SecuritySettings>) => void;
}) {
  const share = settings.monthlyBudget > 0 ? monthSpend / settings.monthlyBudget : 1;
  const percent = Math.round(share * 100);
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div>
            <SubHeading>Who approves</SubHeading>
            <p className="mt-0.5 text-xs text-zinc-500">Anyone in these groups can answer. No one approves their own request.</p>
          </div>
          <GroupPicker label="Approver groups" groups={groups} value={settings.approvers} onChange={(approvers) => onChange({ approvers })} />
          {settings.approvers.length === 0 && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              No approvers: every action that needs one will be declined.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Segmented<ExpiryId>
            label="Unanswered requests expire after"
            options={EXPIRY_OPTIONS}
            value={settings.approvalExpiry}
            onChange={(approvalExpiry) => onChange({ approvalExpiry })}
          />
          <p className="text-xs text-zinc-500">An expired request is declined, never approved.</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <DollarInput
            label="Per person, per day"
            value={settings.personDailyLimit}
            onChange={(personDailyLimit) => onChange({ personDailyLimit })}
          />
          <DollarInput
            label="Whole organization, per month"
            value={settings.monthlyBudget}
            onChange={(monthlyBudget) => onChange({ monthlyBudget })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Segmented
            label="When the monthly budget runs out"
            options={BUDGET_OPTIONS}
            value={settings.onBudgetOut}
            onChange={(onBudgetOut) => onChange({ onBudgetOut })}
          />
          <p className="text-xs text-zinc-500">
            {settings.onBudgetOut === "stop" ? (
              "Recommended. We warn your admins at 80%."
            ) : (
              <>
                Recommended: <span className="font-medium text-zinc-700 dark:text-zinc-300">Stop agents</span>. Not alert
                only: one stolen sign-in could keep spending.
              </>
            )}
          </p>
        </div>
        <div {...unbuilt("panel", "usage metering")} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-sm text-black dark:text-zinc-50">
            {formatDollars(monthSpend)} of {formatDollars(settings.monthlyBudget)} spent this month
            <span className="text-zinc-500"> · {percent}%</span>
          </p>
          <div
            role="meter"
            aria-label="Monthly budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percent, 100)}
            className="relative mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"
          >
            <div
              className={`h-2 rounded-full ${share >= 1 ? "bg-red-600" : share >= 0.8 ? "bg-amber-500" : "bg-zinc-900 dark:bg-zinc-100"}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
            <div aria-hidden="true" className="absolute top-[-3px] h-3.5 w-px bg-zinc-500" style={{ left: "80%" }} />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">The mark is the 80% warning.</p>
        </div>
      </div>
    </div>
  );
}
