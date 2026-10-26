import type { ReactNode } from "react";
import type { MockPhaseCoverage, MockUnitCoverage } from "@/lib/mock-data";
import { SectionHeading } from "./section-heading";

const PHASES = [
  { id: "pre", label: "Pre", hint: "Before work happens — a user asks, or a system notices something" },
  { id: "work", label: "Work", hint: "The work done in direct response to that trigger" },
  { id: "post", label: "Post", hint: "Follow-up or enhancement work, uncalled for by the user" },
] as const;

// One indigo ramp, darker = further along (inverted in dark mode, where brighter
// reads as more). Live/pilot steps were validated for CVD separation and 3:1
// contrast against the card surface in both modes; "not covered" is the track.
const SEGMENTS = [
  { key: "live", label: "Live", className: "bg-indigo-700 dark:bg-indigo-400" },
  { key: "pilot", label: "Piloting", className: "bg-indigo-400 dark:bg-indigo-600" },
  { key: "uncovered", label: "Not covered", className: "bg-indigo-100 dark:bg-indigo-950" },
] as const;

type CellFormat = "counts" | "percent";

function sumCoverage(items: MockPhaseCoverage[]): MockPhaseCoverage {
  return items.reduce(
    (acc, c) => ({ live: acc.live + c.live, pilot: acc.pilot + c.pilot, total: acc.total + c.total }),
    { live: 0, pilot: 0, total: 0 },
  );
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** Stacked live / piloting / not-covered bar; the numbers it draws are always printed beside it. */
function CoverageBar({ coverage, thick = false }: { coverage: MockPhaseCoverage; thick?: boolean }) {
  const counts = {
    live: coverage.live,
    pilot: coverage.pilot,
    uncovered: coverage.total - coverage.live - coverage.pilot,
  };
  return (
    <div
      aria-hidden="true"
      title={`Live ${counts.live} · Piloting ${counts.pilot} · Not covered ${counts.uncovered}`}
      className={`flex w-full gap-0.5 overflow-hidden rounded-full ${thick ? "h-2.5" : "h-1.5"}`}
    >
      {SEGMENTS.map(
        (segment) =>
          counts[segment.key] > 0 && (
            <span
              key={segment.key}
              style={{ flexGrow: counts[segment.key] }}
              className={`basis-0 ${segment.className}`}
            />
          ),
      )}
    </div>
  );
}

// Fixed-width text column so the overall bars line up across rows.
function OverallCell({ coverage, format }: { coverage: MockPhaseCoverage; format: CellFormat }) {
  return (
    <div
      className="flex items-center gap-3"
      title={format === "counts" ? `${coverage.total} processes` : undefined}
    >
      <CoverageBar coverage={coverage} thick />
      <p className="w-36 shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-black dark:text-zinc-50">
          {percent(coverage.live, coverage.total)}% live
        </span>{" "}
        · {percent(coverage.pilot, coverage.total)}% piloting
      </p>
    </div>
  );
}

function PhaseCell({ coverage, format }: { coverage: MockPhaseCoverage; format: CellFormat }) {
  if (coverage.total === 0) {
    return <p className="text-xs text-zinc-400 dark:text-zinc-600">No processes mapped</p>;
  }
  return (
    <>
      <CoverageBar coverage={coverage} />
      <p className="mt-1 text-xs tabular-nums text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-black dark:text-zinc-50">
          {format === "counts"
            ? `${coverage.live}/${coverage.total}`
            : `${percent(coverage.live, coverage.total)}%`}
        </span>{" "}
        live ·{" "}
        {format === "counts" ? coverage.pilot : `${percent(coverage.pilot, coverage.total)}%`} pilot
      </p>
    </>
  );
}

export function CoverageSection({
  coverage,
  description = "Share of each business unit's task-processes with an agent live or in pilot, by phase.",
  rowHeader = "Business unit",
  totalLabel = "All units",
  cellFormat = "counts",
  highlightId,
  children,
}: {
  coverage: MockUnitCoverage[];
  description?: string;
  rowHeader?: string;
  totalLabel?: string;
  /** "counts" prints live/total per phase; "percent" prints shares, for totals too large to read as fractions. */
  cellFormat?: CellFormat;
  /** Row to emphasize — the viewer's own function. */
  highlightId?: string;
  /** Extra heading controls, e.g. a view toggle, shown before the legend. */
  children?: ReactNode;
}) {
  const unitTotals = coverage.map((unit) => sumCoverage(PHASES.map((p) => unit.phases[p.id])));
  const phaseTotals = PHASES.map((p) => sumCoverage(coverage.map((unit) => unit.phases[p.id])));
  const orgTotal = sumCoverage(unitTotals);

  return (
    <section className="flex flex-col gap-2">
      <SectionHeading title="Agentic capability coverage" description={description}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {children}
          <ul className="flex gap-4 text-xs text-zinc-600 dark:text-zinc-400">
            {SEGMENTS.map((segment) => (
              <li key={segment.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2.5 rounded-sm ${segment.className}`} />
                {segment.label}
              </li>
            ))}
          </ul>
        </div>
      </SectionHeading>

      {/* Cell padding (not the container's) carries the side gutters, so a highlighted row's tint spans the full width. */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
              <th scope="col" className="w-48 py-2 pl-3 pr-4 font-semibold">
                {rowHeader}
              </th>
              <th scope="col" className="py-2 pr-6 font-semibold">
                Overall
              </th>
              {PHASES.map((phase) => (
                <th key={phase.id} scope="col" title={phase.hint} className="w-36 py-2 pr-4 font-semibold last:pr-3">
                  {phase.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {coverage.map((unit, i) => {
              const highlighted = unit.businessUnitId === highlightId;
              return (
                <tr key={unit.businessUnitId} className={highlighted ? "bg-indigo-50/60 dark:bg-indigo-950/30" : ""}>
                  <th
                    scope="row"
                    className={`py-2 pl-3 pr-4 text-left font-medium text-black dark:text-zinc-50 ${
                      highlighted
                        ? "shadow-[inset_3px_0_0_var(--color-indigo-700)] dark:shadow-[inset_3px_0_0_var(--color-indigo-400)]"
                        : ""
                    }`}
                  >
                    {unit.name}
                    {highlighted && <span className="sr-only"> (yours)</span>}
                  </th>
                  <td className="py-2 pr-6">
                    <OverallCell coverage={unitTotals[i]} format={cellFormat} />
                  </td>
                  {PHASES.map((phase) => (
                    <td key={phase.id} className="py-2 pr-4 last:pr-3">
                      <PhaseCell coverage={unit.phases[phase.id]} format={cellFormat} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="row" className="py-2 pl-3 pr-4 text-left font-medium text-black dark:text-zinc-50">
                {totalLabel}
              </th>
              <td className="py-2 pr-6">
                <OverallCell coverage={orgTotal} format={cellFormat} />
              </td>
              {phaseTotals.map((total, i) => (
                <td key={PHASES[i].id} className="py-2 pr-4 last:pr-3">
                  <PhaseCell coverage={total} format={cellFormat} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
