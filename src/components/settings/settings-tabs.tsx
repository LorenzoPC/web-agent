import Link from "next/link";

// The Client workspace settings screens built so far (docs/prds/sitemap.html, /app/settings).
const TABS = [
  { href: "/app/settings/mcp", label: "MCP connection" },
  { href: "/app/settings/security", label: "Agent security" },
] as const;

/** Tabs between the organization's settings screens. */
export function SettingsTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Settings" className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab.href === current
              ? "border-black text-black dark:border-white dark:text-zinc-50"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
