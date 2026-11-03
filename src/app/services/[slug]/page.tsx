import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { CostEstimator } from "@/components/services/cost-estimator";
import { ServiceCard, ServiceStatusBadge } from "@/components/services/service-card";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { formatCost } from "@/lib/pipeline-data";
import {
  getService,
  PERSON,
  RUN_OPTIONS,
  SERVICES,
  STEP_PHASE_LABELS,
  type ServiceComponentKind,
} from "@/lib/mock-services-data";

const PRIMARY_LINK =
  "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
const CARD = "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";
const SOON_PILL = "rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-normal text-zinc-500 dark:bg-zinc-900";

const KIND_STYLES: Record<ServiceComponentKind, string> = {
  Agent: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  Model: "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  Tool: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "MCP server": "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  Knowledge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

function DisabledAction({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
    >
      {label}
      <span className={SOON_PILL}>Soon</span>
    </span>
  );
}

/**
 * One service's public page (sitemap: /services/[slug]): what it does, how a
 * task flows through it and where people step in, what it's built from,
 * where it can run and what that costs, and the controls that come with it.
 */
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const team = MOCK_ROLE_POOLS.find((pool) => pool.id === service.teamId);
  const related = SERVICES.filter((other) => other.teamId === service.teamId && other.slug !== service.slug);
  const runOptions = RUN_OPTIONS.filter((option) => service.runsOn.includes(option.id)).map((option) => ({
    ...option,
    perTask: option.id === "our-cloud" ? service.pricePerTask : service.platformFee,
  }));

  const facts = [
    { label: "Typical result", value: service.result.value, detail: service.result.label },
    { label: "Price", value: formatCost(service.pricePerTask), detail: `per ${service.unit}, models included` },
    { label: "Time to go live", value: service.timeToLive, detail: "from connecting to the first task" },
    {
      label: "Runs on",
      value: `${runOptions.length} of ${RUN_OPTIONS.length} options`,
      detail: runOptions.map((option, i) => (i === 0 ? option.label : option.label.toLowerCase())).join(", "),
    },
  ];

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-12 py-10 px-6">
        <Link
          href="/services"
          className="self-start text-sm text-zinc-500 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← All services
        </Link>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {team && (
                <Link
                  href={`/services?team=${team.id}#catalog`}
                  className="text-xs font-semibold tracking-widest text-zinc-500 uppercase hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  {team.name}
                </Link>
              )}
              <ServiceStatusBadge status={service.status} />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-black dark:text-zinc-50">
              {service.name}
            </h1>
            <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">{service.description}</p>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
              Used by
              {service.usedBy.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  {role}
                </span>
              ))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {service.status === "soon" ? (
              <DisabledAction label="Join the waitlist" />
            ) : (
              <Link href="/onboarding" className={PRIMARY_LINK}>
                Get started
              </Link>
            )}
            <DisabledAction label="Book a walkthrough" />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className={CARD}>
                <dt className="text-xs text-zinc-500">{fact.label}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-black dark:text-zinc-50">{fact.value}</dd>
                <dd className="text-xs text-zinc-500">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading
            title="How it works"
            description="One task, start to finish. People decide at the marked steps."
          />
          <ol className="flex flex-col gap-2">
            {service.steps.map((step, i) => (
              <li
                key={step.title}
                className={`flex gap-4 rounded-lg border p-4 ${
                  step.checkpoint
                    ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <span className="flex w-14 shrink-0 flex-col items-start gap-1">
                  <span className="flex size-6 items-center justify-center rounded-full bg-black text-xs font-medium text-white dark:bg-white dark:text-black">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-zinc-500">{STEP_PHASE_LABELS[step.phase]}</span>
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-black dark:text-zinc-50">{step.title}</h3>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{step.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      step.actor === PERSON
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    {step.actor}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionHeading title="Built from" description="Shared components from the hub's catalog." />
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {service.components.map((component) => (
                <li key={component.name} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span
                    className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-medium ${KIND_STYLES[component.kind]}`}
                  >
                    {component.kind}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-black dark:text-zinc-50">{component.name}</span>
                    <span className="block text-xs text-zinc-500">{component.role}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/marketplace"
              className="self-start text-xs font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              Browse every agent in the Marketplace →
            </Link>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading title="Connects to" description="The systems it reads from and writes to." />
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
              {service.connectsTo.map((system) => (
                <li key={system.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span
                    className={`text-sm ${
                      system.available ? "text-black dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {system.name}
                  </span>
                  {system.available ? (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Available</span>
                  ) : (
                    <span className={SOON_PILL}>Soon</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="flex flex-col gap-3">
          <SectionHeading
            title="Where it runs and what it costs"
            description="Pick an option and a monthly volume to estimate your bill."
          />
          <CostEstimator
            unit={service.unit}
            units={service.units}
            typicalVolume={service.typicalVolume}
            options={runOptions}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <SectionHeading title="Controls" description="On top of what every service includes." />
            <ul className={`${CARD} flex list-disc flex-col gap-1.5 pl-8 text-sm text-zinc-700 marker:text-zinc-400 dark:text-zinc-300`}>
              {service.controls.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-3">
            <SectionHeading title="Before you start" description="What we'll ask for when you switch it on." />
            <ul className={`${CARD} flex list-disc flex-col gap-1.5 pl-8 text-sm text-zinc-700 marker:text-zinc-400 dark:text-zinc-300`}>
              {service.prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        {team && related.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading title={`More for ${team.name}`}>
              <Link
                href="/services#catalog"
                className="text-xs font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
              >
                All services →
              </Link>
            </SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {related.map((other) => (
                <ServiceCard key={other.slug} service={other} />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Mockup: results, prices and connectors are placeholders. Nothing here is live yet.
        </p>
      </main>
    </div>
  );
}
