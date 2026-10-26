import type { MockSystem, MockSystemStatus } from "@/lib/mock-product-data";
import { SectionHeading } from "./section-heading";

// Rows sort worst-first so a problem is visible without scrolling. Color is never
// the only signal: problem rows spell out their status, and every dot has a label.
const STATUS: Record<MockSystemStatus, { label: string; rank: number; dot: string; text: string }> = {
  down: { label: "Down", rank: 0, dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  degraded: { label: "Degraded", rank: 1, dot: "bg-yellow-400", text: "text-amber-700 dark:text-amber-400" },
  operational: { label: "Operational", rank: 2, dot: "bg-green-500", text: "text-zinc-500 dark:text-zinc-500" },
};

const SUMMARY_ORDER: MockSystemStatus[] = ["operational", "degraded", "down"];

function StatusDot({ status }: { status: MockSystemStatus }) {
  return (
    <span aria-hidden="true" className="relative flex size-2 shrink-0">
      {status === "down" && (
        <span className="absolute inline-flex size-full rounded-full bg-red-500 opacity-75 motion-safe:animate-ping" />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${STATUS[status].dot}`} />
    </span>
  );
}

export function SystemHeartbeat({ systems, className = "" }: { systems: MockSystem[]; className?: string }) {
  const sorted = [...systems].sort((a, b) => STATUS[a.status].rank - STATUS[b.status].rank);

  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <SectionHeading title="Systems heartbeat">
        <ul className="flex gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
          {SUMMARY_ORDER.map((status) => {
            const count = systems.filter((s) => s.status === status).length;
            if (count === 0) return null;
            return (
              <li key={status} title={STATUS[status].label} className="flex items-center gap-1">
                <span aria-hidden="true" className={`size-2 rounded-full ${STATUS[status].dot}`} />
                {count}
                <span className="sr-only"> {STATUS[status].label.toLowerCase()}</span>
              </li>
            );
          })}
        </ul>
      </SectionHeading>

      {/* Out of flow on wide screens, like the newsfeed, so the metric tiles set the row height. */}
      <div className="relative min-h-44 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-100 overflow-y-auto max-lg:max-h-80 lg:absolute lg:inset-0 dark:divide-zinc-900">
          {sorted.map((system) => {
            const status = STATUS[system.status];
            const healthy = system.status === "operational";
            return (
              <li key={system.id} className="flex items-center gap-2.5 px-3 py-1.5">
                <StatusDot status={system.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm text-black dark:text-zinc-50">{system.name}</span>
                    {healthy && (
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                        <span className="sr-only">{status.label}, </span>
                        {system.detail}
                      </span>
                    )}
                  </div>
                  {!healthy && (
                    <p className={`truncate text-xs ${status.text}`}>
                      <span className="font-medium">{status.label}</span> · {system.detail}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
