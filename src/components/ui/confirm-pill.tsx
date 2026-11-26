"use client";

import { useEffect, useRef } from "react";

/**
 * A small inline confirmation: a short question, a check to confirm and an X to
 * close. It opens where the person clicked (e.g. on a list row), so picking takes
 * one click to open and one to confirm. Escape closes it too, and focus moves to
 * the check when it opens. Clicks inside it don't reach the row underneath.
 * While nothing saves the choice, pass `unbuilt("action", …)` as `confirmProps`.
 */
export function ConfirmPill({
  prompt,
  confirmLabel,
  onConfirm,
  onClose,
  confirmProps,
}: {
  /** One or two words, e.g. "Add?". */
  prompt: string;
  /** What the check does, in full, for screen readers, e.g. "Add GPT-5.4 to my Agents Departments". */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmProps?: Record<string, string>;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <span
      role="group"
      aria-label={confirmLabel}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white py-0.5 pl-2 pr-0.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{prompt}</span>
      <button
        ref={confirmRef}
        type="button"
        aria-label={confirmLabel}
        title={confirmLabel}
        {...confirmProps}
        onClick={onConfirm}
        className="inline-flex size-6 items-center justify-center rounded bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={onClose}
        className="inline-flex size-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </span>
  );
}
