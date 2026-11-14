import Link from "next/link";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { LANDING_FONT_VARIABLES } from "@/components/landing/fonts";
import { LandingHeading } from "@/components/landing/landing-heading";
import { ServiceRow } from "@/components/services/service-row";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { HUB_STEPS, SERVICE_FOUNDATIONS, SERVICES } from "@/lib/mock-services-data";

// Same buttons and section rhythm as the landing page (src/app/page.tsx).
const PRIMARY_LINK =
  "rounded-lg bg-coral-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-coral-800";
const OUTLINE_LINK =
  "rounded-lg border border-coral-700 bg-white px-5 py-3 font-semibold text-coral-700 transition-colors hover:bg-coral-50 dark:border-coral-300 dark:bg-transparent dark:text-coral-300 dark:hover:bg-coral-800/20";
const SECTION = "mx-auto w-full max-w-6xl px-6 py-16 lg:py-24";
// Heading on the left third, content on the right two thirds.
const SPLIT = "grid gap-8 lg:grid-cols-3 lg:gap-12";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Public catalog of services (sitemap: /services). The hub in one page: how
 * it works, the services by team, and what every service includes.
 * Styled with the landing theme. The team filter lives in ?team=, so a
 * filtered view can be linked to.
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const requested = firstParam(params.team);
  const activeTeam = MOCK_ROLE_POOLS.find((team) => team.id === requested)?.id ?? "all";
  const teams = MOCK_ROLE_POOLS.filter((team) => activeTeam === "all" || team.id === activeTeam);

  return (
    <div
      className={`${LANDING_FONT_VARIABLES} flex flex-1 flex-col bg-white font-body text-steel-950 dark:bg-steel-950 dark:text-white`}
    >
      <main className="flex flex-col">
        <section className="bg-coral-200 dark:bg-coral-800/20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-24">
            <div className="flex flex-col gap-6">
              <p className="text-sm font-semibold text-coral-800 dark:text-coral-300">Services</p>
              <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                One hub of AI services, ready for every team
              </h1>
              <p className="max-w-xl text-lg text-steel-700 dark:text-steel-200">
                Each service does one job end to end, built from our agents, tools and MCP servers. Connect once, then
                switch services on team by team.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/app/onboarding" className={PRIMARY_LINK}>
                  Get started
                </Link>
                <a href="#catalog" className={OUTLINE_LINK}>
                  Browse services
                </a>
              </div>
            </div>

            <div className="rounded-2xl bg-white px-6 pt-5 pb-2 shadow-sm dark:bg-steel-900">
              <h2 className="font-display text-lg font-bold">How the hub works</h2>
              <ol className="divide-y divide-steel-100 dark:divide-white/10">
                {HUB_STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-5 py-4">
                    <span className="w-8 shrink-0 font-display text-4xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{step.title}</span>
                      <span className="block text-sm text-steel-600 dark:text-steel-300">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="catalog" className={`${SECTION} flex scroll-mt-6 flex-col gap-12`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <LandingHeading
              title="Services"
              description={`${SERVICES.length} services for ${MOCK_ROLE_POOLS.length} teams. Prices are per task on our cloud, models included.`}
            />
            <LinkToggle
              label="Filter services by team"
              active={activeTeam}
              options={[
                { id: "all", label: "All teams", href: "/services#catalog" },
                ...MOCK_ROLE_POOLS.map((team) => ({
                  id: team.id,
                  label: team.name,
                  href: `/services?team=${team.id}#catalog`,
                })),
              ]}
            />
          </div>

          {teams.map((team) => {
            const services = SERVICES.filter((service) => service.teamId === team.id);
            return (
              <div key={team.id} className={SPLIT}>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-xl font-bold">{team.name}</h3>
                  <p className="text-sm text-steel-600 dark:text-steel-300">{services.length} services</p>
                </div>
                <ul className="divide-y divide-steel-100 border-y border-steel-100 lg:col-span-2 dark:divide-white/10 dark:border-white/10">
                  {services.map((service) => (
                    <ServiceRow key={service.slug} service={service} />
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="bg-brand-100 dark:bg-brand-950/50">
          <div className={`${SECTION} ${SPLIT}`}>
            <LandingHeading title="Every service includes" description="Whichever team uses it." />
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-2">
              {SERVICE_FOUNDATIONS.map((item) => (
                <li key={item.title} className="border-t border-brand-200 pt-4 dark:border-white/15">
                  <p className="font-display text-xl font-bold">{item.title}</p>
                  <p className="text-sm text-steel-600 dark:text-steel-300">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-brand-950">
          <div className={`${SECTION} ${SPLIT}`}>
            <LandingHeading title="Don't see your process?" onDark />
            <div className="flex flex-col items-start gap-6 lg:col-span-2">
              <p className="max-w-2xl text-lg text-brand-100">
                Tell us what your team does by hand today. We&apos;ll scope a service with you, usually from components
                we already have.
              </p>
              <span
                aria-disabled="true"
                className="flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 font-semibold text-white/60"
              >
                Request a service
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-brand-100">Soon</span>
              </span>
              <p className="text-xs text-brand-200">
                Mockup: services, results and prices are placeholders. Nothing here is live yet.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
