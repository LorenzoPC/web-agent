import Link from "next/link";

export const MARKETPLACE_VIEWS = [
  {
    id: "agents",
    label: "Agent Marketplace",
    href: "/marketplace",
    description: "Browse agent pools by role or capability, or pick an individual agent persona below.",
  },
  {
    id: "models",
    label: "Model Marketplace",
    href: "/marketplace?view=models",
    description: "The models a flow's steps can run on, grouped by what they generate. You pick one per step in the Builder.",
  },
  {
    id: "mcp-tools",
    label: "MCP & Tools Marketplace",
    href: "/marketplace?view=mcp-tools",
    description: "Connect agents to the systems your team already uses, or give them single actions like search and email.",
  },
] as const;

export type MarketplaceView = (typeof MARKETPLACE_VIEWS)[number]["id"];

/**
 * The page title doubles as the switcher: the current marketplace is the h1
 * and the other two sit beside it as muted links. The choice lives in ?view=,
 * so each marketplace can be linked to.
 */
export function MarketplaceHeader({ active }: { active: MarketplaceView }) {
  const current = MARKETPLACE_VIEWS.find((view) => view.id === active) ?? MARKETPLACE_VIEWS[0];

  return (
    <div>
      <nav aria-label="Marketplaces" className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {MARKETPLACE_VIEWS.map((view) =>
          view.id === current.id ? (
            <h1
              key={view.id}
              className="border-b-2 border-black pb-1 text-xl font-semibold tracking-tight text-black sm:text-2xl dark:border-white dark:text-zinc-50"
            >
              {view.label}
            </h1>
          ) : (
            <Link
              key={view.id}
              href={view.href}
              className="border-b-2 border-transparent pb-1 text-xl font-semibold tracking-tight text-zinc-400 transition-colors hover:text-zinc-700 sm:text-2xl dark:text-zinc-600 dark:hover:text-zinc-300"
            >
              {view.label}
            </Link>
          ),
        )}
      </nav>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{current.description}</p>
    </div>
  );
}
