import { CoverageSection } from "@/components/dashboard/coverage-section";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { MetricTiles } from "@/components/dashboard/metric-tiles";
import { NewsFeed, type FeedItem } from "@/components/dashboard/news-feed";
import { PriorityCards } from "@/components/dashboard/priority-cards";
import { SystemHeartbeat } from "@/components/dashboard/system-heartbeat";
import { MOCK_BUSINESS_UNITS } from "@/lib/mock-data";
import {
  ALL_FUNCTIONS,
  MOCK_CUSTOMER_COVERAGE,
  MOCK_LENSES,
  MOCK_PRODUCT_METRICS,
  MOCK_PRODUCT_NOTIFICATIONS,
  MOCK_PRODUCT_PRIORITIES,
  MOCK_SYSTEMS,
  MOCK_TEAM_COVERAGE,
} from "@/lib/mock-product-data";

type CoverageView = "customers" | "team";

const COVERAGE_VIEWS: Record<
  CoverageView,
  { label: string; description: string; rowHeader: string; totalLabel: string }
> = {
  customers: {
    label: "Our customers",
    description: "Share of customer workspaces with an agent live or in pilot on each use case's processes, by phase.",
    rowHeader: "Use case",
    totalLabel: "All use cases",
  },
  team: {
    label: "Our team",
    description: "Share of our own teams' task-processes running on an agent, live or in pilot, by phase.",
    rowHeader: "Team",
    totalLabel: "All teams",
  },
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function productHref(lensId: string, coverage?: CoverageView): string {
  const query = new URLSearchParams();
  if (lensId !== ALL_FUNCTIONS) query.set("lens", lensId);
  if (coverage) query.set("coverage", coverage);
  const qs = query.toString();
  return qs ? `/product?${qs}` : "/product";
}

export default async function ProductDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const lens = MOCK_LENSES.find((l) => l.id === firstParam(params.lens)) ?? MOCK_LENSES[0];
  const isAll = lens.id === ALL_FUNCTIONS;

  // The PM starts from customer adoption; a function manager from their own team.
  const requestedView = firstParam(params.coverage);
  const coverageView: CoverageView =
    requestedView === "customers" || requestedView === "team" ? requestedView : isAll ? "customers" : "team";
  const view = COVERAGE_VIEWS[coverageView];

  const shortNames = new Map(MOCK_LENSES.map((l) => [l.id, l.short]));
  const feed: FeedItem[] = MOCK_PRODUCT_NOTIFICATIONS.filter(
    (n) => isAll || !n.functionId || n.functionId === lens.id,
  )
    .map((n) => ({ ...n, source: shortNames.get(n.functionId ?? ALL_FUNCTIONS) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const priorities = MOCK_PRODUCT_PRIORITIES.filter(
    (p) => isAll || p.businessUnitId === lens.id || p.affects.includes(lens.id),
  ).slice(0, 5);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col gap-6 py-8 px-6">
        <DashboardTabs active="/product" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">Product</h1>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {isAll
                ? "How the agentic product is doing, across every supporting function."
                : `How the agentic product is doing, seen from ${lens.name}.`}
            </p>
          </div>
          <LinkToggle
            label="Function lens"
            active={lens.id}
            options={MOCK_LENSES.map((l) => ({ id: l.id, label: l.name, href: productHref(l.id) }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-4">
          <MetricTiles
            metrics={MOCK_PRODUCT_METRICS[lens.id] ?? []}
            description={isAll ? "Product health." : `${lens.name} KPIs.`}
            className="lg:col-span-4"
          />
          <NewsFeed
            notifications={feed}
            description={isAll ? "Signals from every function." : "Yours, plus product-wide."}
            className="lg:col-span-5"
          />
          <SystemHeartbeat systems={MOCK_SYSTEMS} className="lg:col-span-3" />
        </div>

        <PriorityCards
          priorities={priorities}
          businessUnits={MOCK_BUSINESS_UNITS}
          plusLabel={isAll ? "Add to roadmap" : "Delegate to an agent"}
          orgWideLabel="Product-wide"
        />

        <CoverageSection
          coverage={coverageView === "customers" ? MOCK_CUSTOMER_COVERAGE : MOCK_TEAM_COVERAGE}
          description={view.description}
          rowHeader={view.rowHeader}
          totalLabel={view.totalLabel}
          cellFormat={coverageView === "customers" ? "percent" : "counts"}
          highlightId={isAll ? undefined : lens.id}
        >
          <LinkToggle
            label="Coverage view"
            active={coverageView}
            options={(Object.keys(COVERAGE_VIEWS) as CoverageView[]).map((id) => ({
              id,
              label: COVERAGE_VIEWS[id].label,
              href: productHref(lens.id, id),
            }))}
          />
        </CoverageSection>
      </main>
    </div>
  );
}
