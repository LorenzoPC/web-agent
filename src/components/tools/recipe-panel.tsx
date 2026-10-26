import type { MockToolRecipe } from "@/lib/mock-data";
import { checkRecipe, toModelDefinition, type RecipeCheck } from "@/lib/tool-recipe";

const CHECK_ICON: Record<RecipeCheck["level"], { glyph: string; className: string; srLabel: string }> = {
  pass: { glyph: "✓", className: "text-emerald-600 dark:text-emerald-400", srLabel: "Passing:" },
  warn: { glyph: "!", className: "text-amber-600 dark:text-amber-400", srLabel: "Warning:" },
  fail: { glyph: "✕", className: "text-red-600 dark:text-red-400", srLabel: "Required:" },
};

/** Live recipe lint + the model-facing definition, beside the form. */
export function RecipePanel({
  recipe,
  createdName,
  onCreate,
}: {
  recipe: MockToolRecipe;
  createdName: string | null;
  onCreate: () => void;
}) {
  const checks = checkRecipe(recipe);
  const passing = checks.filter((c) => c.level === "pass").length;
  const blocked = checks.some((c) => c.level === "fail");

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-black dark:text-zinc-50">Recipe check</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {passing}/{checks.length} passing
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-1.5">
          {checks.map((check) => {
            const icon = CHECK_ICON[check.level];
            return (
              <li key={check.label} className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span aria-hidden="true" className={`w-3 shrink-0 text-center font-semibold ${icon.className}`}>
                  {icon.glyph}
                </span>
                <span>
                  <span className="sr-only">{icon.srLabel} </span>
                  {check.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {createdName ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Created <span className="font-mono">{createdName}</span>. Not persisted yet — this draft only lives in
              this browser session.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={onCreate}
                disabled={blocked}
                className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Create tool
              </button>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                {blocked
                  ? "Fix the ✕ items to create this tool."
                  : "Not persisted yet — this draft only lives in this browser session."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-medium text-black dark:text-zinc-50">Sent to the model</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Execution, auth, guardrails, and cost stay on the server. This is all the model ever sees.
        </p>
        <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {JSON.stringify(toModelDefinition(recipe), null, 2)}
        </pre>
      </div>
    </aside>
  );
}
