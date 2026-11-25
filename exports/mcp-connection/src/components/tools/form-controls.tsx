import type { ReactNode } from "react";

export const INPUT_CLASS =
  "w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
export const MONO_INPUT_CLASS = `${INPUT_CLASS} font-mono`;

export function Section({
  step,
  title,
  hint,
  filledByInterview = false,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  /** Marks sections a Discovery session wrote into, so the user knows what to review. */
  filledByInterview?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border bg-white p-5 dark:bg-zinc-950 ${
        filledByInterview
          ? "border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-800 dark:ring-indigo-950"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">{step}</span>
        <h2 className="font-medium text-black dark:text-zinc-50">{title}</h2>
        {filledByInterview && (
          <span className="ml-auto rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            Filled by interview
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{hint}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Label + optional hint wrapping a single control (the label is associated implicitly). */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

/** Same pill toggle as the Marketplace's Capabilities/Roles switch. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="mt-2 flex w-fit flex-wrap gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              value === option.id
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Checkbox({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        {hint && <span className="block text-xs text-zinc-500 dark:text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}
