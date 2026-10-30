import Link from "next/link";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { SectionHeading } from "@/components/dashboard/section-heading";
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

const PRIMARY_LINK =
  "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
const OUTLINE_LINK =
  "rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900";
const CARD = "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

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
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-col gap-16 py-8 px-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-zinc-500">Mockup preview</span>
          <LinkToggle
            label="Preview signed out or signed in"
            active={signedIn ? "signed-in" : "signed-out"}
            options={[
              { id: "signed-out", label: "Signed out", href: "/" },
              { id: "signed-in", label: "Signed in", href: "/?view=signed-in" },
            ]}
          />
        </div>

        <section className="flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
            {signedIn ? `Welcome back, ${user.name.split(" ")[0]}` : "AI enabled coworker to your teams"}
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-black dark:text-zinc-50">
            Agentic Coworking, we got an AI ready playground to help you run your business
          </h1>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">An iteratively growing toolbox set for modern businesses.</p>
          <p className="-mt-3 max-w-xl text-sm text-zinc-500">
            Every capacity is supported from onboarding to the output, and works with open source models, or stacks that
            you prefer from Augure, Azure, Anthropic, Gemini, Mistral and OpenAI ready for you to connect.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/onboarding" className={PRIMARY_LINK}>
              {signedIn ? "Connect via MCP" : "Get started"}
            </Link>
            <Link href="/marketplace" className={OUTLINE_LINK}>
              Browse the catalog
            </Link>
          </div>
          {signedIn && (
            <p className="flex flex-wrap justify-center gap-x-3 gap-y-1 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{MOCK_LANDING_ACCOUNT.company}</span> ·{" "}
                {MOCK_LANDING_ACCOUNT.type} · {MOCK_LANDING_ACCOUNT.plan}
              </span>
              <span>Account manager: {MOCK_LANDING_ACCOUNT.accountManager}</span>
              <a href="#whats-new" className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
                {newInPlan} new in your plan →
              </a>
            </p>
          )}
        </section>

        <section className="flex flex-col items-center gap-6">
          <div className="grid w-full gap-3 sm:grid-cols-3">
            {COMPONENT_TYPES.map((type) => (
              <Link
                key={type.id}
                href={type.href}
                className={`${CARD} flex flex-col gap-1 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600`}
              >
                <span className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">{type.label}</span>
                  <span className="text-2xl font-semibold tabular-nums text-black dark:text-zinc-50">{type.count}</span>
                </span>
                <span className="text-xs text-zinc-500">{type.description}</span>
                <span className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">Browse →</span>
              </Link>
            ))}
          </div>
          <LandingSearch index={SEARCH_INDEX} />
        </section>

        <section id="whats-new" className="flex scroll-mt-6 flex-col gap-3">
          <SectionHeading title="What's new" description="Released or updated in the last month." />
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {RELEASE_NOTES.map((note) => (
              <li key={note.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-3">
                <span className="w-14 shrink-0 text-xs tabular-nums text-zinc-500">{formatDate(note.date)}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">{note.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">{note.kind}</span>
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">{note.summary}</span>
                </span>
                {signedIn && note.inPlan && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    In your plan
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="Success stories from these teams" description="Placeholder stories for the draft." />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SUCCESS_STORIES.map((story) => (
              <li key={story.teamId} className={`${CARD} flex flex-col gap-2`}>
                <span className="text-[11px] font-medium text-zinc-500">{teamNames.get(story.teamId)}</span>
                <span className="text-base leading-snug font-semibold text-black dark:text-zinc-50">{story.outcome}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{story.story}</span>
                <span className="mt-auto pt-1 text-xs text-zinc-500">{story.customer}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="Documentation" description="Start here." />
          <div className="grid gap-3 sm:grid-cols-3">
            {DOC_ENTRIES.map((doc) =>
              doc.href ? (
                <Link
                  key={doc.id}
                  href={doc.href}
                  className={`${CARD} flex flex-col gap-1 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600`}
                >
                  <span className="text-sm font-medium text-black dark:text-zinc-50">{doc.title} →</span>
                  <span className="text-xs text-zinc-500">{doc.description}</span>
                </Link>
              ) : (
                <div key={doc.id} aria-disabled="true" className={`${CARD} flex flex-col gap-1`}>
                  <span className="flex items-center justify-between text-sm font-medium text-zinc-400 dark:text-zinc-600">
                    {doc.title}
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-normal text-zinc-500 dark:bg-zinc-900">
                      Soon
                    </span>
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">{doc.description}</span>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeading title="Trust & proof" description="Our goals for next year." />
          <div className="grid gap-3 lg:grid-cols-3">
            <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              {TRUST_POINTS.map((point) => (
                <li key={point.label} className={CARD}>
                  <p className="text-sm font-medium text-black dark:text-zinc-50">{point.label}</p>
                  <p className="text-xs text-zinc-500">{point.detail}</p>
                </li>
              ))}
            </ul>
            <figure className={`${CARD} flex flex-col justify-between gap-3`}>
              <blockquote className="text-sm text-zinc-700 dark:text-zinc-300">“{PLACEHOLDER_QUOTE.quote}”</blockquote>
              <figcaption className="text-xs text-zinc-500">
                {PLACEHOLDER_QUOTE.name}, {PLACEHOLDER_QUOTE.title} · placeholder quote
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
    </div>
  );
}
