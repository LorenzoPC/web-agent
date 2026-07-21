import type { ReactNode } from "react";

const SELECTED_WIDTH = 200;
const UNSELECTED_WIDTH = 100;

export function SelectableCard({
  as: Component = "div",
  selected,
  onSelect,
  header,
  children,
}: {
  as?: "div" | "li";
  selected: boolean;
  onSelect: () => void;
  header: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Component
      style={{ width: selected ? SELECTED_WIDTH : UNSELECTED_WIDTH }}
      className={`shrink-0 overflow-hidden rounded-lg border p-3 transition-all duration-150 ${
        selected
          ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        {header}
      </button>
      {selected && children}
    </Component>
  );
}
