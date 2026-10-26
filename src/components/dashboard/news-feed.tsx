import type {
  MockNotification,
  MockNotificationKind,
  MockNotificationTone,
  MockRun,
  MockRunStatus,
} from "@/lib/mock-data";
import { SectionHeading } from "./section-heading";

const KIND_LABELS: Record<MockNotificationKind, string> = {
  approval: "Approval",
  alert: "Alert",
  insight: "Insight",
  agent: "Agent",
  run: "Run",
  release: "Release",
  escalation: "Escalation",
  deal: "Deal",
};

/** `source`, when set, replaces the kind on the chip — e.g. the function a product signal came from. */
export type FeedItem = MockNotification & { source?: string };

const TONE_STYLES: Record<MockNotificationTone, string> = {
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  good: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const RUN_HEADERS: Record<MockRunStatus, { verb: string; tone: MockNotificationTone }> = {
  success: { verb: "Run completed", tone: "good" },
  partial: { verb: "Run partially completed", tone: "warning" },
  error: { verb: "Run failed", tone: "critical" },
};

/** Pipeline runs surface on the Dashboard as feed headers rather than a separate list. */
export function runNotification(run: MockRun): MockNotification {
  const { verb, tone } = RUN_HEADERS[run.status];
  return {
    id: run.id,
    kind: "run",
    title: `${verb}: ${run.rootInput}`,
    tone,
    unread: false,
    createdAt: run.completedAt,
  };
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NewsFeed({
  notifications,
  description = "Approvals, alerts, and run results from your agents.",
  className = "",
}: {
  notifications: FeedItem[];
  description?: string;
  className?: string;
}) {
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <SectionHeading title="Newsfeed" description={description}>
        {unreadCount > 0 && (
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {unreadCount} unread
          </span>
        )}
      </SectionHeading>

      {/* On wide screens the list is taken out of flow so the metric tiles set the row height and the feed scrolls to match. */}
      <div className="relative min-h-44 flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {notifications.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
            Nothing new. Approvals, alerts, and run results will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-y-auto max-lg:max-h-80 lg:absolute lg:inset-0 dark:divide-zinc-900">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-3 py-1.5">
                <span
                  aria-hidden="true"
                  className={`size-1.5 shrink-0 rounded-full ${n.unread ? "bg-indigo-600 dark:bg-indigo-400" : ""}`}
                />
                <span
                  className={`w-16 shrink-0 rounded-full py-0.5 text-center text-[11px] font-medium ${TONE_STYLES[n.tone]}`}
                >
                  {n.source ?? KIND_LABELS[n.kind]}
                </span>
                <p
                  title={n.title}
                  className={`min-w-0 flex-1 truncate text-sm ${
                    n.unread
                      ? "font-medium text-black dark:text-zinc-50"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {n.unread && <span className="sr-only">Unread: </span>}
                  {n.title}
                </p>
                <time
                  dateTime={n.createdAt}
                  className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500"
                >
                  {formatTimestamp(n.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
