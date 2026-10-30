"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export const FILTER_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
    <path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.25V8.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

export const SORT_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
    <path
      d="M5 13V3M5 3L2.5 5.5M5 3l2.5 2.5M11 3v10M11 13l-2.5-2.5M11 13l2.5-2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Square icon button that opens a small right-aligned popover. A dot marks a non-default setting. */
export function IconMenu({
  label,
  icon,
  active = false,
  children,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex size-9 items-center justify-center rounded-lg border transition-colors ${
          open || active
            ? "border-zinc-400 text-black dark:border-zinc-500 dark:text-zinc-50"
            : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        {icon}
        {active && <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-white bg-black dark:border-zinc-950 dark:bg-white" />}
      </button>
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
