/**
 * Generalized from the Ecosystem builder's "Search something else" card —
 * a dashed-border "+" affordance. Pass `width` for a fixed-size card in a
 * flex-wrap row (matches SelectableCard's sizing); omit it to fill the
 * parent grid cell instead.
 */
export function CreateNewCard({
  label,
  onClick,
  width,
}: {
  label: string;
  onClick: () => void;
  width?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={width ? { width } : undefined}
      className={`flex h-full min-h-[64px] ${width ? "shrink-0" : "w-full"} flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300`}
    >
      <span className="text-base leading-none">+</span>
      {label}
    </button>
  );
}
