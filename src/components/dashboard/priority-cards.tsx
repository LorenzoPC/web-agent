import Link from "next/link";
import type { MockBusinessUnit, MockPriority, MockPriorityAction } from "@/lib/mock-data";
import { SectionHeading } from "./section-heading";

// The first text action reads as primary, the second as secondary.
const ACTION_STYLES = ["font-medium text-black dark:text-zinc-50", "text-zinc-600 dark:text-zinc-400"];

function TextAction({ action, className }: { action: MockPriorityAction; className: string }) {
  const classes = `text-xs underline-offset-4 hover:underline ${className}`;
  return action.href ? (
    <Link href={action.href} className={classes}>
      {action.label}
    </Link>
  ) : (
    <button type="button" className={classes}>
      {action.label}
    </button>
  );
}

export function PriorityCards({
  priorities,
  businessUnits,
  plusLabel = "Delegate to an agent",
  orgWideLabel = "All units",
}: {
  priorities: MockPriority[];
  businessUnits: MockBusinessUnit[];
  /** What the "+" button does, shown as its tooltip and accessible name. */
  plusLabel?: string;
  /** Eyebrow for priorities without a business unit. */
  orgWideLabel?: string;
}) {
  const unitNames = new Map(businessUnits.map((unit) => [unit.id, unit.name]));

  return (
    <section className="flex flex-col gap-2">
      <SectionHeading title="Top priorities" description="What needs your attention first, ranked." />

      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {priorities.map((priority, index) => (
          <li
            key={priority.id}
            className="flex flex-col rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
              {index + 1} ·{" "}
              {priority.businessUnitId ? unitNames.get(priority.businessUnitId) : orgWideLabel}
            </p>
            <h3 className="mt-0.5 text-sm font-medium leading-5 text-black dark:text-zinc-50">{priority.title}</h3>
            <p className="mt-1 line-clamp-5 text-xs leading-4.5 text-zinc-600 dark:text-zinc-400">
              {priority.context}
            </p>

            <div className="mt-auto flex items-center gap-3 pt-2">
              {priority.actions.map((action, i) => (
                <TextAction key={action.label} action={action} className={ACTION_STYLES[i]} />
              ))}
              <button
                type="button"
                aria-label={`${plusLabel}: ${priority.title}`}
                title={plusLabel}
                className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-zinc-500 hover:text-black dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
