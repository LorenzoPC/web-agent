export function HistoryTab() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No run history yet</p>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-500">
        Past pipeline runs will show up here once run persistence is wired up (Neon Postgres —
        see the backlog).
      </p>
    </div>
  );
}
