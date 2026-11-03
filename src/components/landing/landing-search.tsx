"use client";

import Link from "next/link";
import { useState } from "react";
import type { SearchEntry } from "@/lib/mock-landing-data";

const MAX_RESULTS = 6;

const KIND_LABEL = "text-xs text-steel-500 dark:text-steel-300";

/** Instant search over components and docs. Mockup: matches titles in a fixed index. */
export function LandingSearch({ index }: { index: SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q ? index.filter((entry) => entry.title.toLowerCase().includes(q)).slice(0, MAX_RESULTS) : [];

  return (
    <div className="relative w-full max-w-xl">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-steel-500 dark:text-steel-300"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="m13 13 4 4" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        aria-label="Search components and docs"
        placeholder="Search components and docs…"
        className="w-full rounded-xl border border-steel-200 bg-white py-3 pr-4 pl-11 text-sm text-steel-950 shadow-sm transition-shadow outline-none placeholder:text-steel-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-steel-900 dark:text-white dark:placeholder:text-steel-300 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
      />
      {q && (
        <ul className="absolute inset-x-0 top-full z-10 mt-2 rounded-xl border border-steel-100 bg-white p-1.5 text-left shadow-xl shadow-brand-950/10 dark:border-white/10 dark:bg-steel-900 dark:shadow-black/40">
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-steel-500 dark:text-steel-300">No matches for “{query.trim()}”</li>
          )}
          {results.map((entry) =>
            entry.href ? (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-steel-950 transition-colors hover:bg-brand-50 hover:text-brand-800 dark:text-white dark:hover:bg-white/5 dark:hover:text-brand-200"
                >
                  {entry.title}
                  <span className={KIND_LABEL}>{entry.kind}</span>
                </Link>
              </li>
            ) : (
              <li
                key={entry.id}
                className="flex items-center justify-between px-3 py-2 text-sm text-steel-400 dark:text-steel-500"
              >
                {entry.title}
                <span className="rounded-full bg-steel-50 px-2 py-0.5 text-[11px] text-steel-600 dark:bg-white/5 dark:text-steel-300">
                  Soon
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
