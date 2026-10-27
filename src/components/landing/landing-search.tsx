"use client";

import Link from "next/link";
import { useState } from "react";
import { INPUT_CLASS } from "@/components/tools/form-controls";
import type { SearchEntry } from "@/lib/mock-landing-data";

const MAX_RESULTS = 6;

/** Instant search over components and docs. Mockup: matches titles in a fixed index. */
export function LandingSearch({ index }: { index: SearchEntry[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q ? index.filter((entry) => entry.title.toLowerCase().includes(q)).slice(0, MAX_RESULTS) : [];

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        aria-label="Search components and docs"
        placeholder="Search components and docs…"
        className={`${INPUT_CLASS} px-4 py-3`}
      />
      {q && (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-zinc-200 bg-white p-1 text-left shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">No matches for “{query.trim()}”</li>}
          {results.map((entry) =>
            entry.href ? (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  {entry.title}
                  <span className="text-xs text-zinc-500">{entry.kind}</span>
                </Link>
              </li>
            ) : (
              <li
                key={entry.id}
                className="flex items-center justify-between px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
              >
                {entry.title}
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-900">Soon</span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
