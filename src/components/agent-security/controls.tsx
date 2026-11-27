"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { OUTCOME_CLASS, OVERSIGHT_LABEL, OVERSIGHT_ORDER, type Outcome } from "@/lib/agent-security";
import type { Oversight } from "@/lib/mock-agent-security-data";

export const SMALL_BUTTON_CLASS =
  "shrink-0 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

export const PRIMARY_BUTTON_CLASS =
  "shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

export const SELECT_CLASS =
  "w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function SettingsSection({
  id,
  title,
  hint,
  action,
  children,
}: {
  id: string;
  title: string;
  hint: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="font-medium text-black dark:text-zinc-50">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">{hint}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-medium text-black dark:text-zinc-50">{children}</h3>;
}

export function Chip({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

export function OutcomeChip({ outcome, children }: { outcome: Outcome; children: ReactNode }) {
  return <Chip className={OUTCOME_CLASS[outcome]}>{children}</Chip>;
}

/** On/off switch. Extra props (such as an `unbuilt()` marker) go on the button. */
export function Switch({
  checked,
  label,
  hideLabel = false,
  onChange,
  ...rest
}: {
  checked: boolean;
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  onChange: (on: boolean) => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 rounded-full py-1 pr-1 pl-3 text-sm font-medium text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300"
      {...rest}
    >
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
          checked ? "bg-black dark:bg-white" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white transition-transform dark:bg-black ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

/** Toggle chips for the identity provider's groups. Keeps the groups in directory order. */
export function GroupPicker({
  label,
  groups,
  value,
  onChange,
}: {
  label: string;
  groups: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {groups.map((group) => {
        const on = value.includes(group);
        return (
          <button
            key={group}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(groups.filter((g) => (g === group ? !on : value.includes(g))))}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              on
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
            }`}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pick one oversight level. Levels below `floor` show but can't be picked, with
 * the reason as their tooltip, so the admin sees the built-in minimum.
 */
export function OversightPicker({
  label,
  value,
  onChange,
  floor,
  floorWhy,
}: {
  label: string;
  value: Oversight;
  onChange: (level: Oversight) => void;
  floor?: Oversight;
  floorWhy?: string;
}) {
  const floorIndex = floor ? OVERSIGHT_ORDER.indexOf(floor) : 0;
  return (
    <div role="group" aria-label={label} className="flex w-fit flex-wrap gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800">
      {OVERSIGHT_ORDER.map((level, i) => {
        const locked = i < floorIndex;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={value === level}
            disabled={locked}
            title={locked ? floorWhy : undefined}
            onClick={() => onChange(level)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:text-zinc-300 disabled:line-through dark:disabled:text-zinc-700 ${
              value === level
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {OVERSIGHT_LABEL[level]}
          </button>
        );
      })}
    </div>
  );
}
