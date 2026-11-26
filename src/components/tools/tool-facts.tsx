import type { ToolCredential } from "@/lib/mock-admin-tools-data";

// Cells and classes the Admin lists share (/admin/tools, /admin/mcp-servers), so a fact reads the same
// everywhere. Each list is a table from md up and stacked rows with a label per fact on phones.

export const LIST_CARD = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
export const LIST_HEAD = "px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400";
export const LIST_CELL = "px-4 py-3 align-top";
/** A fact's label in the stacked phone rows. */
export const LIST_LABEL = "text-xs leading-5 text-zinc-500 dark:text-zinc-400";

/** Whether calling it does anything today. The dot is paired with a word, so colour isn't the only signal. */
export function Runs({ live }: { live: boolean }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${live ? "bg-emerald-600 dark:bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"}`}
      />
      <span className={live ? "text-black dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}>
        {live ? "Live" : "Catalog only"}
      </span>
    </span>
  );
}

/** What it needs before it can run. Env vars are named, never shown. */
export function Needs({ credential }: { credential: ToolCredential }) {
  switch (credential.kind) {
    case "none":
      return <span className="text-zinc-500 dark:text-zinc-400">Nothing</span>;
    case "envVar":
      return <code className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{credential.name}</code>;
    case "signIn":
      return <span className="text-zinc-600 dark:text-zinc-400">{credential.label}</span>;
  }
}

export function BetaBadge() {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      Beta
    </span>
  );
}
