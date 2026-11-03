import Link from "next/link";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { LANDING_FONT_VARIABLES } from "@/components/landing/fonts";
import { LandingHeading } from "@/components/landing/landing-heading";
import { LandingSearch } from "@/components/landing/landing-search";
import { getCurrentUser } from "@/lib/auth";
import { MOCK_ROLE_POOLS } from "@/lib/mock-data";
import {
  COMPONENT_TYPES,
  DOC_ENTRIES,
  MOCK_LANDING_ACCOUNT,
  PLACEHOLDER_QUOTE,
  RELEASE_NOTES,
  SEARCH_INDEX,
  SUCCESS_STORIES,
  TRUST_POINTS,
} from "@/lib/mock-landing-data";

const teamNames = new Map(MOCK_ROLE_POOLS.map((team) => [team.id, team.name]));

// Sherweb's buttons use coral-600, but white text on it is only 4.4:1. One step darker clears 4.5:1.
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

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * The front door the Web Agent brand links to: one line on what the platform
 * is, the way in (Get started), the catalog at a glance, then what's new,
 * success stories, documentation and trust. Signed in, it adds the visitor's account.
 * Styled with the landing theme (Sherweb's palette, see globals.css).
 * Mockup: ?view=signed-in stands in for a real session.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const signedIn = firstParam(params.view) === "signed-in";
  const user = await getCurrentUser();
  const newInPlan = RELEASE_NOTES.filter((note) => note.inPlan).length;

  return (
    <div
      className={`${LANDING_FONT_VARIABLES} flex flex-1 flex-col bg-white font-body text-steel-950 dark:bg-steel-950 dark:text-white`}
    >
      <main className="flex flex-col">
        <section className="bg-coral-200 dark:bg-coral-800/20">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-6 pb-16 lg:pb-24">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs text-steel-700 dark:text-steel-300">Mockup preview</span>
              <div className="rounded-lg bg-white dark:bg-steel-950">
                <LinkToggle
                  label="Preview signed out or signed in"
                  active={signedIn ? "signed-in" : "signed-out"}
                  options={[
                    { id: "signed-out", label: "Signed out", href: "/" },
                    { id: "signed-in", label: "Signed in", href: "/?view=signed-in" },
                  ]}
                />
              </div>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
              <div className="flex flex-col gap-6">
                <p className="text-sm font-semibold text-coral-800 dark:text-coral-300">
                  {signedIn ? `Welcome back, ${user.name.split(" ")[0]}` : "AI enabled coworker to your teams"}
                </p>
                <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
                  Agentic Coworking, we got an AI ready playground to help you run your business
                </h1>
                <p className="text-lg text-steel-700 dark:text-steel-200">
                  An iteratively growing toolbox set for modern businesses.
                </p>
                <p className="-mt-3 max-w-xl text-sm leading-relaxed text-steel-700 dark:text-steel-300">
                  Every capacity is supported from onboarding to the output, and works with open source models, or stacks
                  that you prefer from Augure, Azure, Anthropic, Gemini, Mistral and OpenAI ready for you to connect.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/onboarding" className={PRIMARY_LINK}>
                    {signedIn ? "Connect via MCP" : "Get started"}
                  </Link>
                  <Link href="/marketplace" className={OUTLINE_LINK}>
                    Browse the catalog
                  </Link>
                </div>
                {signedIn && (
                  <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-coral-300 pt-4 text-sm text-steel-700 dark:border-white/10 dark:text-steel-300">
                    <span>
                      <span className="font-semibold text-steel-950 dark:text-white">{MOCK_LANDING_ACCOUNT.company}</span> ·{" "}
                      {MOCK_LANDING_ACCOUNT.type} · {MOCK_LANDING_ACCOUNT.plan}
                    </span>
                    <span>Account manager: {MOCK_LANDING_ACCOUNT.accountManager}</span>
                    <a
                      href="#whats-new"
                      className="font-semibold text-coral-800 underline underline-offset-4 dark:text-coral-300"
                    >
                      {newInPlan} new in your plan
                    </a>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 pt-2 pb-6 shadow-sm dark:bg-steel-900">
                <ul className="divide-y divide-steel-100 dark:divide-white/10">
                  {COMPONENT_TYPES.map((type) => (
                    <li key={type.id}>
                      <Link href={type.href} className="group flex items-center gap-5 py-4">
                        <span className="w-14 shrink-0 font-display text-4xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
                          {type.count}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg font-bold group-hover:text-brand-700 dark:group-hover:text-brand-300">
                            {type.label}
                          </span>
                          <span className="block text-sm text-steel-600 dark:text-steel-300">{type.description}</span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-brand-700 transition-transform group-hover:translate-x-1 dark:text-brand-300"
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <LandingSearch index={SEARCH_INDEX} />
              </div>
            </div>
          </div>
        </section>

        <section id="whats-new" className={`${SECTION} ${SPLIT} scroll-mt-6`}>
          <LandingHeading title="What's new" description="Released or updated in the last month." />
          <ul className="divide-y divide-steel-100 border-y border-steel-100 lg:col-span-2 dark:divide-white/10 dark:border-white/10">
            {RELEASE_NOTES.map((note) => (
              <li key={note.id} className="grid grid-cols-[5.5rem_1fr] gap-x-4 py-5 sm:grid-cols-[7rem_1fr_auto]">
                <span className="flex flex-col">
                  <span className="font-label text-sm font-medium tabular-nums">{formatDate(note.date)}</span>
                  <span className="text-xs text-steel-500 dark:text-steel-300">{note.kind}</span>
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{note.title}</span>
                  <span className="block text-sm text-steel-600 dark:text-steel-300">{note.summary}</span>
                </span>
                {signedIn && note.inPlan && (
                  <span className="col-start-2 mt-2 self-start justify-self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 sm:col-start-3 sm:mt-0 dark:bg-emerald-950 dark:text-emerald-300">
                    In your plan
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-brand-100 dark:bg-brand-950/50">
          <div className={`${SECTION} flex flex-col gap-10`}>
            <LandingHeading title="Success stories from these teams" description="Placeholder stories for the draft." />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SUCCESS_STORIES.map((story) => (
                <li key={story.teamId} className="flex flex-col gap-3 rounded-2xl bg-white p-6 dark:bg-steel-900">
                  <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
                    {teamNames.get(story.teamId)}
                  </span>
                  <span className="font-display text-xl leading-snug font-bold">{story.outcome}</span>
                  <span className="text-sm text-steel-600 dark:text-steel-300">{story.story}</span>
                  <span className="mt-auto pt-3 text-sm font-medium">{story.customer}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`${SECTION} ${SPLIT}`}>
          <LandingHeading title="Documentation" description="Start here." />
          <ul className="divide-y divide-steel-100 border-y border-steel-100 lg:col-span-2 dark:divide-white/10 dark:border-white/10">
            {DOC_ENTRIES.map((doc) => (
              <li key={doc.id}>
                {doc.href ? (
                  <Link href={doc.href} className="group grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <span className="font-display text-lg font-bold text-brand-700 group-hover:underline group-hover:underline-offset-4 dark:text-brand-300">
                      {doc.title} →
                    </span>
                    <span className="text-steel-600 dark:text-steel-300">{doc.description}</span>
                  </Link>
                ) : (
                  <div aria-disabled="true" className="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-4">
                    <span className="flex items-center gap-2 font-display text-lg font-bold text-steel-400 dark:text-steel-500">
                      {doc.title}
                      <span className="rounded-full bg-steel-100 px-2 py-0.5 font-body text-xs font-medium text-steel-600 dark:bg-white/5 dark:text-steel-300">
                        Soon
                      </span>
                    </span>
                    <span className="text-steel-400 dark:text-steel-500">{doc.description}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-brand-950">
          <div className={`${SECTION} flex flex-col gap-16`}>
            <div className={SPLIT}>
              <LandingHeading title="Trust & proof" description="Our goals for next year." onDark />
              <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-2">
                {TRUST_POINTS.map((point) => (
                  <li key={point.label} className="border-t border-white/20 pt-4">
                    <p className="font-display text-xl font-bold text-white">{point.label}</p>
                    <p className="text-sm text-brand-200">{point.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
            <figure className="max-w-3xl border-l-4 border-coral-500 pl-6 lg:ml-[calc(33.333%+1rem)]">
              <blockquote className="font-display text-2xl leading-snug font-medium text-white lg:text-3xl">
                “{PLACEHOLDER_QUOTE.quote}”
              </blockquote>
              <figcaption className="mt-4 text-sm text-brand-200">
                <span className="font-semibold text-white">{PLACEHOLDER_QUOTE.name}</span>, {PLACEHOLDER_QUOTE.title} ·
                placeholder quote
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
    </div>
  );
}
