"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConversationPanel } from "@/components/conversation/conversation-panel";
import type { MockStarterInstruction } from "@/lib/mock-data";
import type { PipelineStep } from "@/lib/types";
import { useSidePanel } from "./side-panel";

// Items with neither an href nor a panel to open have no screen yet and render
// as disabled "Soon" rows.
const ACTIONS: { label: string; href?: string; opens?: "conversation"; hint?: string }[] = [
  { label: "Start Conversation", opens: "conversation" },
  { label: "Create Agent", href: "/builder", hint: "Builder" },
  { label: "See Dashboard", href: "/" },
  { label: "Create Tool", href: "/tools/new" },
  { label: "Create Skill" },
];

/**
 * Floating bottom-left launcher — takes the spot of the Next.js dev
 * indicator (disabled in next.config.ts) and, unlike it, ships to production.
 */
export function QuickActions({
  agents,
  roleInstructions,
}: {
  agents: PipelineStep[];
  roleInstructions: Record<string, MockStarterInstruction[]>;
}) {
  const [open, setOpen] = useState(false);
  const { panel, setPanel } = useSidePanel();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/* On small screens the panels are full-width, so the launcher steps aside rather than cover their footers. */}
      <div
        ref={rootRef}
        className={`fixed bottom-5 left-5 z-50 flex flex-col items-start gap-2 ${panel ? "max-md:hidden" : ""}`}
      >
        {open && (
          <div
            id="quick-actions-menu"
            role="menu"
            aria-label="Quick actions"
            className="w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          >
            {ACTIONS.map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  role="menuitem"
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  {action.label}
                  {action.hint && <span className="text-xs text-zinc-500">{action.hint}</span>}
                </Link>
              ) : action.opens ? (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setPanel("conversation");
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  {action.label}
                  {action.hint && <span className="text-xs text-zinc-500">{action.hint}</span>}
                </button>
              ) : (
                <div
                  key={action.label}
                  role="menuitem"
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
                >
                  {action.label}
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
                    Soon
                  </span>
                </div>
              ),
            )}
          </div>
        )}
        <button
          type="button"
          aria-label="Quick actions"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="quick-actions-menu"
          onClick={() => setOpen((o) => !o)}
          className="flex size-10 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-black"
        >
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className={`size-4 transition-transform duration-200 ${open ? "rotate-45" : ""}`}
          >
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <ConversationPanel
        open={panel === "conversation"}
        onClose={() => setPanel(null)}
        agents={agents}
        roleInstructions={roleInstructions}
      />
    </>
  );
}
