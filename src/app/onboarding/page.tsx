import { CopyButton } from "@/components/onboarding/copy-button";
import { CLIENT_GUIDES, MCP_URL, SETUP_STEPS } from "@/lib/mock-onboarding-data";

/**
 * Self-serve onboarding for existing clients, partners and resellers: add one
 * MCP URL to the AI client they already use and sign in. Signing in matches
 * them to their company's account, so there's no form here.
 */
export default function OnboardingPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 py-20 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">Web Agent MCP</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-black dark:text-zinc-50">
            Run your agents from Claude, ChatGPT &amp; Copilot
          </h1>
          <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
            Connect once, then paste a prompt. Use our agents, MCP servers and tools without opening Web Agent.
          </p>
        </div>

        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1.5 pl-3 dark:border-zinc-800 dark:bg-zinc-950">
          <code className="min-w-0 flex-1 truncate text-left font-mono text-sm text-zinc-800 dark:text-zinc-200">
            {MCP_URL}
          </code>
          <CopyButton
            text={MCP_URL}
            label="Copy URL"
            className="shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          />
        </div>

        <ol className="grid w-full gap-3 text-left sm:grid-cols-3">
          {SETUP_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-black text-xs font-medium text-white dark:bg-white dark:text-black">
                {i + 1}
              </span>
              <div>
                <h2 className="text-sm font-medium text-black dark:text-zinc-50">{step.title}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{step.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex w-full max-w-xl flex-col gap-2 text-left">
          {CLIENT_GUIDES.map((guide) => (
            <details
              key={guide.id}
              className="group rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-black dark:text-zinc-50 [&::-webkit-details-marker]:hidden">
                Exact steps for {guide.name}
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-3.5 text-zinc-400 transition-transform group-open:rotate-180"
                >
                  <path
                    d="m4 6 4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <ol className="flex list-decimal flex-col gap-1.5 pr-4 pb-4 pl-9 text-sm text-zinc-600 marker:text-zinc-400 dark:text-zinc-400">
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>

        <div className="flex flex-col gap-1 text-xs text-zinc-500">
          <p>
            For client, partner and reseller accounts — sign in with your work email. Access mirrors your own
            permissions.
          </p>
          <p className="text-zinc-400 dark:text-zinc-600">Mockup: the URL and sign-in aren&apos;t live yet.</p>
        </div>
      </main>
    </div>
  );
}
