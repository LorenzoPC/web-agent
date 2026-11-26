/**
 * A call to action in an opened card's details: a checkbox that picks the item,
 * e.g. for the organization's Agents Departments. `PickedMark` repeats the pick
 * on the card itself, so picks stay visible once the details close. While
 * nothing saves the pick, pass `unbuilt("action", …)` through `props`.
 */
export function PickCheckbox({
  label,
  checked,
  onChange,
  props,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  props?: Record<string, string>;
}) {
  return (
    <label
      {...props}
      className="flex cursor-pointer items-center gap-2.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-black dark:accent-white"
      />
      <span>{label}</span>
    </label>
  );
}

/** A small check on a card whose item is picked. `label` is the tooltip and what screen readers hear. */
export function PickedMark({ label }: { label: string }) {
  return (
    <span
      title={label}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 8.5l3 3 6-7" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
