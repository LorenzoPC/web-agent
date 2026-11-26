"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Orb } from "@/components/ui/orb";
import { AdminMenu, ADMIN_LINKS } from "./admin-menu";
import { useSidePanel } from "./side-panel";

// Client workspace screens. The Admin screens sit behind the Admin menu at the end of the nav.
const LINKS = [
  { href: "/app/onboarding", label: "Get started" },
  { href: "/app", label: "Dashboards" },
  { href: "/app/marketplace", label: "Marketplaces" },
] as const;

/** Nav or Admin menu label for a path, falling back to the path itself for screens in neither (e.g. /services). */
export function pageLabel(pathname: string): string {
  if (pathname === "/") return "Home";
  return [...LINKS, ...ADMIN_LINKS].find((link) => link.href === pathname)?.label ?? pathname;
}

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const { panel, setPanel } = useSidePanel();
  const featureOpen = panel === "feature-request";

  // On phones the tabs scroll sideways, so bring the current one into view after each navigation.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector(":scope > [aria-current]");
    if (!nav || !current) return;
    const navBox = nav.getBoundingClientRect();
    const box = current.getBoundingClientRect();
    if (box.right > navBox.right) nav.scrollLeft += box.right - navBox.right;
    else if (box.left < navBox.left) nav.scrollLeft -= navBox.left - box.left;
  }, [pathname]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6 dark:border-zinc-800 dark:bg-black">
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        {/* The brand goes to the landing page. */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Orb />
          <span className="text-sm font-semibold text-black max-sm:sr-only dark:text-zinc-50">Web Agent</span>
        </Link>
        {/* On narrow screens the links scroll sideways inside the nav, so the page doesn't. `relative` keeps any
            absolutely positioned sr-only text inside that scroll area, and pb-px stops it clipping the -mb-px underline. */}
        <nav ref={navRef} className="relative flex min-w-0 gap-1 overflow-x-auto pb-px">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "border-black text-black dark:border-white dark:text-zinc-50"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <AdminMenu />
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-3">
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
        <span className="text-sm text-zinc-500 max-sm:hidden dark:text-zinc-500">{userName}</span>
      </div>
    </header>
  );
}
