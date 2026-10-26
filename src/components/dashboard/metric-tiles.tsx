import type { MockMetric } from "@/lib/mock-data";
import { SectionHeading } from "./section-heading";

function formatValue(metric: MockMetric): string {
  switch (metric.format) {
    case "percent":
      return `${metric.value.toFixed(1)}%`;
    case "score":
      return metric.value.toFixed(0);
    case "seconds":
      return `${metric.value.toFixed(1)}s`;
    case "usd":
      // Unit costs need their fractions of a cent; totals read as whole dollars, compact past six figures.
      return metric.value.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        ...(metric.value >= 100_000
          ? { notation: "compact" }
          : { maximumFractionDigits: metric.value < 1 ? 3 : 0 }),
      });
    case "count":
      // Full figures read better than "1.3K" until the number gets long.
      return metric.value.toLocaleString(undefined, metric.value >= 10_000 ? { notation: "compact" } : {});
  }
}

function formatChange(metric: MockMetric): string {
  const sign = metric.change > 0 ? "+" : metric.change < 0 ? "−" : "";
  const magnitude = Math.abs(metric.change);
  if (metric.format === "percent") return `${sign}${magnitude.toFixed(1)} pts`;
  if (metric.format === "score") return `${sign}${magnitude.toFixed(0)} pts`;
  return `${sign}${Math.round(magnitude * 100)}%`;
}

function MetricTile({ metric }: { metric: MockMetric }) {
  const good = metric.change === 0 ? null : metric.change > 0 === metric.higherIsBetter;
  const tone =
    good === null
      ? "text-zinc-500 dark:text-zinc-500"
      : good
        ? "text-green-700 dark:text-green-400"
        : "text-red-700 dark:text-red-400";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs text-zinc-500 dark:text-zinc-500">{metric.label}</p>
      <p className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
        {formatValue(metric)}
      </p>
      <p className="text-xs">
        <span className={`font-medium ${tone}`}>
          {metric.change !== 0 && (
            <span aria-hidden="true">{metric.change > 0 ? "▲" : "▼"} </span>
          )}
          {formatChange(metric)}
        </span>
        <span className="text-zinc-500 dark:text-zinc-500"> vs {metric.comparedTo}</span>
      </p>
    </div>
  );
}

export function MetricTiles({
  metrics,
  description = "Across all agents and units.",
  className = "",
}: {
  metrics: MockMetric[];
  description?: string;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <SectionHeading title="Metrics" description={description} />
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <MetricTile key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
}
