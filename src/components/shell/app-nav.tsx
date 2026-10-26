"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Orb } from "@/components/ui/orb";
import { useSidePanel } from "./side-panel";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/patterns", label: "Patterns" },
  { href: "/prompts", label: "Prompts" },
  { href: "/builder", label: "Builder" },
  { href: "/onboarding", label: "Get started" },
] as const;

// Sub-screens that keep their parent nav item highlighted.
const NAV_PARENTS: Record<string, string> = { "/product": "/" };

/** Nav label for a path, falling back to the path itself for screens outside the nav (e.g. /tools/new). */
export function pageLabel(pathname: string): string {
  return LINKS.find((link) => link.href === pathname)?.label ?? pathname;
}

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { panel, setPanel } = useSidePanel();
  const featureOpen = panel === "feature-request";

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Orb />
          <span className="text-sm font-semibold text-black dark:text-zinc-50">Web Agent</span>
        </div>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = (NAV_PARENTS[pathname] ?? pathname) === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-black text-black dark:border-white dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {/* The full-height panel slides in over this corner, and its own Close button takes over from here. */}
        <button
          type="button"
          aria-expanded={featureOpen}
          aria-controls="feature-request-panel"
          onClick={() => setPanel(featureOpen ? null : "feature-request")}
          className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
            <path
              d="M6 13.5h4M6.75 15h2.5M8 1.5a4.5 4.5 0 0 0-2.5 8.24V11.5h5V9.74A4.5 4.5 0 0 0 8 1.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="max-sm:sr-only">Ask a feature</span>
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-500">{userName}</span>
      </div>
    </header>
  );
}
