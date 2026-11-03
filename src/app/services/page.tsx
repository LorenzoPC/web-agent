import Link from "next/link";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { SectionHeading } from "@/components/dashboard/section-heading";
import { ServiceCard } from "@/components/services/service-card";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import { HUB_STEPS, SERVICE_FOUNDATIONS, SERVICES } from "@/lib/mock-services-data";

const PRIMARY_LINK =
  "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
const OUTLINE_LINK =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900";
const CARD = "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Public catalog of services (sitemap: /services). The hub in one page: how
 * it works, the services by team, and what every service includes.
 * The team filter lives in ?team=, so a filtered view can be linked to.
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
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-16 py-16 px-6">
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Services</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-black dark:text-zinc-50">
            One hub of AI services, ready for every team
          </h1>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
            Each service does one job end to end, built from our agents, tools and MCP servers. Connect once, then
            switch services on team by team.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/onboarding" className={PRIMARY_LINK}>
              Get started
            </Link>
            <a href="#catalog" className={OUTLINE_LINK}>
              Browse services
            </a>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="How the hub works" />
          <ol className="grid gap-3 sm:grid-cols-3">
            {HUB_STEPS.map((step, i) => (
              <li key={step.title} className={`${CARD} flex gap-3`}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white dark:bg-white dark:text-black">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-medium text-black dark:text-zinc-50">{step.title}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="catalog" className="flex scroll-mt-6 flex-col gap-6">
          <SectionHeading
            title="Services"
            description={`${SERVICES.length} services for ${MOCK_ROLE_POOLS.length} teams. Prices are per task on our cloud, models included.`}
          >
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
          </SectionHeading>

          {teams.map((team) => {
            const services = SERVICES.filter((service) => service.teamId === team.id);
            return (
              <div key={team.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-sm font-medium text-black dark:text-zinc-50">{team.name}</h3>
                  <p className="text-xs text-zinc-500">{services.length} services</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <ServiceCard key={service.slug} service={service} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="Every service includes" description="Whichever team uses it." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICE_FOUNDATIONS.map((item) => (
              <li key={item.title} className={CARD}>
                <p className="text-sm font-medium text-black dark:text-zinc-50">{item.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} flex flex-wrap items-center justify-between gap-4 p-6`}>
          <div className="max-w-xl">
            <h2 className="font-medium text-black dark:text-zinc-50">Don&apos;t see your process?</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Tell us what your team does by hand today. We&apos;ll scope a service with you, usually from components we
              already have.
            </p>
          </div>
          <span
            aria-disabled="true"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600"
          >
            Request a service
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-normal text-zinc-500 dark:bg-zinc-900">
              Soon
            </span>
          </span>
        </section>

        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Mockup: services, results and prices are placeholders. Nothing here is live yet.
        </p>
      </main>
    </div>
  );
}
