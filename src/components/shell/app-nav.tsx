"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/builder", label: "Builder" },
] as const;

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-black">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-black dark:text-zinc-50">Web Agent</span>
        <nav className="flex gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
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
      <span className="text-sm text-zinc-500 dark:text-zinc-500">{userName}</span>
    </header>
  );
}
