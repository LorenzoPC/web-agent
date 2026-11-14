import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDING_FONT_VARIABLES } from "@/components/landing/fonts";
import { LandingHeading } from "@/components/landing/landing-heading";
import { CostEstimator } from "@/components/services/cost-estimator";
import { ServiceRow, ServiceStatusBadge } from "@/components/services/service-row";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { formatCost } from "@/lib/pipeline-data";
import { getService, PERSON, RUN_OPTIONS, SERVICES, STEP_PHASE_LABELS } from "@/lib/mock-services-data";

// Same buttons and section rhythm as the landing page (src/app/page.tsx).
const PRIMARY_LINK =
  "rounded-lg bg-coral-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-coral-800";
const SECTION = "mx-auto w-full max-w-6xl px-6 py-16 lg:py-24";
// Heading on the left third, content on the right two thirds.
const SPLIT = "grid gap-8 lg:grid-cols-3 lg:gap-12";
const RULED_LIST = "divide-y divide-steel-100 border-y border-steel-100 dark:divide-white/10 dark:border-white/10";
// On the light blue band, rules and pills use the band's own blues.
const BAND_LIST = "divide-y divide-brand-200 border-y border-brand-200 dark:divide-white/10 dark:border-white/10";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

function DisabledAction({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className="flex items-center gap-2 rounded-lg border border-coral-300 px-5 py-3 font-semibold text-steel-600 dark:border-white/20 dark:text-steel-400"
    >
      {label}
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-steel-600 dark:bg-white/5 dark:text-steel-300">
        Soon
      </span>
    </span>
  );
}

/**
 * One service's public page (sitemap: /services/[slug]): what it does, how a
 * task flows through it and where people step in, what it's built from,
 * where it can run and what that costs, and the controls that come with it.
 * Styled with the landing theme.
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
    <div
      className={`${LANDING_FONT_VARIABLES} flex flex-1 flex-col bg-white font-body text-steel-950 dark:bg-steel-950 dark:text-white`}
    >
      <main className="flex flex-col">
        <section className="bg-coral-200 dark:bg-coral-800/20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-8 pb-16 lg:pb-24">
            <Link
              href="/services"
              className="self-start text-sm font-semibold text-coral-800 underline-offset-4 hover:underline dark:text-coral-300"
            >
              ← All services
            </Link>

            <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  {team && (
                    <Link
                      href={`/services?team=${team.id}#catalog`}
                      className="text-sm font-semibold text-coral-800 underline-offset-4 hover:underline dark:text-coral-300"
                    >
                      {team.name}
                    </Link>
                  )}
                  <ServiceStatusBadge status={service.status} />
                </div>
                <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
                  {service.name}
                </h1>
                <p className="text-lg text-steel-700 dark:text-steel-200">{service.description}</p>
                <p className="text-sm text-steel-700 dark:text-steel-300">
                  <span className="font-semibold text-steel-950 dark:text-white">Used by</span> {service.usedBy.join(" · ")}
                </p>
                <div className="flex flex-wrap gap-3">
                  {service.status === "soon" ? (
                    <DisabledAction label="Join the waitlist" />
                  ) : (
                    <Link href="/app/onboarding" className={PRIMARY_LINK}>
                      Get started
                    </Link>
                  )}
                  <DisabledAction label="Book a walkthrough" />
                </div>
              </div>

              <dl className="divide-y divide-steel-100 rounded-2xl bg-white px-6 py-2 shadow-sm dark:divide-white/10 dark:bg-steel-900">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 py-4">
                    <dt className="text-sm text-steel-600 dark:text-steel-300">{fact.label}</dt>
                    <dd>
                      <span className="block font-display text-2xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                        {fact.value}
                      </span>
                      <span className="block text-sm text-steel-600 dark:text-steel-300">{fact.detail}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className={`${SECTION} ${SPLIT}`}>
          <LandingHeading title="How it works" description="One task, start to finish. People decide at the marked steps." />
          <ol className={`${RULED_LIST} lg:col-span-2`}>
            {service.steps.map((step, i) => (
              <li
                key={step.title}
                className={`grid grid-cols-[3rem_1fr] gap-x-4 px-4 py-5 ${
                  step.checkpoint ? "bg-coral-50 dark:bg-coral-800/20" : ""
                }`}
              >
                <span
                  className={`font-display text-3xl font-bold tabular-nums ${
                    step.checkpoint ? "text-coral-700 dark:text-coral-300" : "text-brand-700 dark:text-brand-300"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{step.title}</span>
                  <span className="block text-sm text-steel-600 dark:text-steel-300">{step.detail}</span>
                  <span className="mt-2 block text-sm">
                    <span className="text-steel-500 dark:text-steel-400">{STEP_PHASE_LABELS[step.phase]} · </span>
                    {step.actor === PERSON ? (
                      <span className="font-semibold text-coral-800 dark:text-coral-300">A person decides</span>
                    ) : (
                      <span className="font-medium">{step.actor}</span>
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-brand-100 dark:bg-brand-950/50">
          <div className={`${SECTION} grid gap-16 lg:grid-cols-2`}>
            <div className="flex flex-col gap-8">
              <LandingHeading title="Built from" description="Shared components from the hub's catalog." />
              <ul className={BAND_LIST}>
                {service.components.map((component) => (
                  <li key={component.name} className="grid grid-cols-[6.5rem_1fr] gap-4 py-4">
                    <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">{component.kind}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{component.name}</span>
                      <span className="block text-sm text-steel-600 dark:text-steel-300">{component.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/app/marketplace"
                className="self-start font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
              >
                Browse every agent in the Marketplace →
              </Link>
            </div>

            <div className="flex flex-col gap-8">
              <LandingHeading title="Connects to" description="The systems it reads from and writes to." />
              <ul className={BAND_LIST}>
                {service.connectsTo.map((system) => (
                  <li key={system.name} className="flex items-center justify-between gap-4 py-4">
                    <span
                      className={
                        system.available ? "font-semibold" : "font-semibold text-steel-500 dark:text-steel-400"
                      }
                    >
                      {system.name}
                    </span>
                    {system.available ? (
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Available</span>
                    ) : (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-steel-600 dark:bg-white/5 dark:text-steel-300">
                        Soon
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Full width rather than split, so the three run options get room side by side. */}
        <section className={`${SECTION} flex flex-col gap-10`}>
          <LandingHeading
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

        <section className="border-t border-steel-100 dark:border-white/10">
          <div className={`${SECTION} ${SPLIT}`}>
            <LandingHeading title="Before you start" description="What comes with it, and what we'll ask for." />
            <div className="grid gap-10 sm:grid-cols-2 lg:col-span-2">
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-xl font-bold">Controls</h3>
                <p className="text-sm text-steel-600 dark:text-steel-300">On top of what every service includes.</p>
                <ul className={RULED_LIST}>
                  {service.controls.map((control) => (
                    <li key={control} className="py-3">
                      {control}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-xl font-bold">What we&apos;ll ask for</h3>
                <p className="text-sm text-steel-600 dark:text-steel-300">When you switch it on.</p>
                <ul className={RULED_LIST}>
                  {service.prerequisites.map((item) => (
                    <li key={item} className="py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-brand-950">
          <div className={`${SECTION} ${SPLIT}`}>
            <div className="flex flex-col items-start gap-6">
              <LandingHeading
                title={team ? `More for ${team.name}` : "More services"}
                description="Other services the same team can switch on."
                onDark
              />
              <Link href="/services#catalog" className="font-semibold text-white underline-offset-4 hover:underline">
                All services →
              </Link>
            </div>
            <div className="flex flex-col gap-8 lg:col-span-2">
              {related.length > 0 && (
                <ul className="divide-y divide-white/20 border-y border-white/20">
                  {related.map((other) => (
                    <ServiceRow key={other.slug} service={other} onDark />
                  ))}
                </ul>
              )}
              <p className="text-xs text-brand-200">
                Mockup: results, prices and connectors are placeholders. Nothing here is live yet.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
