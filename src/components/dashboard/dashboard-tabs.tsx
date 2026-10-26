import Link from "next/link";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/product", label: "Product" },
] as const;

/** Switches between the Dashboard's screens; styled as a smaller sibling of the app nav. */
export function DashboardTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Dashboard screens" className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
            tab.href === active
              ? "border-black text-black dark:border-white dark:text-zinc-50"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
