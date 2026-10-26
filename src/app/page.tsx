import { CoverageSection } from "@/components/dashboard/coverage-section";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { MetricTiles } from "@/components/dashboard/metric-tiles";
import { NewsFeed, runNotification } from "@/components/dashboard/news-feed";
import { PriorityCards } from "@/components/dashboard/priority-cards";
import { getCurrentUser } from "@/lib/auth";
import {
  MOCK_BUSINESS_UNITS,
  MOCK_METRICS,
  MOCK_NOTIFICATIONS,
  MOCK_PRIORITIES,
  MOCK_RUNS,
  MOCK_UNIT_COVERAGE,
} from "@/lib/mock-data";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const feed = [...MOCK_NOTIFICATIONS, ...MOCK_RUNS.map(runNotification)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col gap-6 py-8 px-6">
        <DashboardTabs active="/" />

        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Welcome back, {user.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            Your agents at a glance — what changed, what needs you, and where they&apos;re working.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-4">
          <MetricTiles metrics={MOCK_METRICS} />
          <NewsFeed notifications={feed} className="lg:col-span-2" />
        </div>

        <PriorityCards priorities={MOCK_PRIORITIES} businessUnits={MOCK_BUSINESS_UNITS} />

        <CoverageSection coverage={MOCK_UNIT_COVERAGE} />
      </main>
    </div>
  );
}
