import Link from "next/link";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { formatCost } from "@/lib/pipeline-data";
import { SERVICE_STATUS_LABELS, type Service, type ServiceStatus } from "@/lib/mock-services-data";

const teamNames = new Map(MOCK_ROLE_POOLS.map((team) => [team.id, team.name]));

const STATUS_STYLES: Record<ServiceStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  beta: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
  soon: "bg-steel-100 text-steel-600 dark:bg-white/5 dark:text-steel-300",
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-body text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * One service as a row in a ruled list (landing theme): name, outcome and
 * price on the left, the headline result on the right. Only Beta and
 * Coming soon get a badge, since Available is the norm. `onDark` is for the
 * navy band. Put rows in a `divide-y` list.
 */
export function ServiceRow({
  service,
  showTeam = false,
  onDark = false,
}: {
  service: Service;
  showTeam?: boolean;
  onDark?: boolean;
}) {
  const muted = onDark ? "text-brand-200" : "text-steel-600 dark:text-steel-300";
  const accent = onDark ? "text-white" : "text-brand-700 dark:text-brand-300";

  return (
    <li>
      <Link href={`/services/${service.slug}`} className="group grid gap-x-8 gap-y-3 py-5 sm:grid-cols-[1fr_10rem]">
        <span className="min-w-0">
          {showTeam && <span className={`block text-sm font-semibold ${accent}`}>{teamNames.get(service.teamId)}</span>}
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={`font-display text-lg font-bold ${
                onDark
                  ? "text-white group-hover:text-brand-200"
                  : "group-hover:text-brand-700 dark:group-hover:text-brand-300"
              }`}
            >
              {service.name}
            </span>
            {service.status !== "available" && <ServiceStatusBadge status={service.status} />}
          </span>
          <span className={`block text-sm ${muted}`}>{service.summary}</span>
          <span className={`mt-1 block text-sm ${muted}`}>
            <span className={`font-semibold tabular-nums ${onDark ? "text-white" : "text-steel-950 dark:text-white"}`}>
              {formatCost(service.pricePerTask)}
            </span>{" "}
            per {service.unit}
          </span>
        </span>
        <span className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0 sm:text-right">
          <span className={`font-display text-2xl font-bold tabular-nums ${accent}`}>{service.result.value}</span>
          <span className={`text-sm ${muted}`}>{service.result.label}</span>
        </span>
      </Link>
    </li>
  );
}
