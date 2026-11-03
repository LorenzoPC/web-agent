import Link from "next/link";
import { formatCost } from "@/lib/pipeline-data";
import { SERVICE_STATUS_LABELS, type Service, type ServiceStatus } from "@/lib/mock-services-data";

const STATUS_STYLES: Record<ServiceStatus, string> = {
  available: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  beta: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  soon: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}>
      {SERVICE_STATUS_LABELS[status]}
    </span>
  );
}

/** Catalog card: the outcome, its headline result, and the price per task on our cloud. */
export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-black dark:text-zinc-50">{service.name}</span>
        <ServiceStatusBadge status={service.status} />
      </span>
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{service.summary}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-black dark:text-zinc-50">{service.result.value}</span>
        <span className="text-xs text-zinc-500">{service.result.label}</span>
      </span>
      <span className="mt-auto flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-3 text-xs dark:border-zinc-900">
        <span className="text-zinc-500">
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{formatCost(service.pricePerTask)}</span>{" "}
          per {service.unit}
        </span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Details →</span>
      </span>
    </Link>
  );
}
