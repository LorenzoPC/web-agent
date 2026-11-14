"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConversationPanel } from "@/components/conversation/conversation-panel";
import { AUDIENCE_LABEL, routeAudience, type Audience } from "@/lib/audience";
import type { MockStarterInstruction } from "@/lib/mock-data";
import type { PipelineStep } from "@/lib/types";
import { useSidePanel } from "./side-panel";

// Items leading to an Admin or Developer screen (per the sitemap) use that
// area's palette color, with its name as the hint so color isn't the only cue.
const ITEM_TONE: Record<"neutral" | Audience, { fill: string; hover: string; hint: string }> = {
  neutral: { fill: "text-zinc-900 dark:text-zinc-100", hover: "hover:bg-zinc-100 dark:hover:bg-zinc-900", hint: "text-zinc-500" },
  admin: { fill: "bg-admin text-admin-foreground", hover: "hover:bg-admin-hover", hint: "text-admin-foreground/80" },
  developer: { fill: "bg-developer text-developer-foreground", hover: "hover:bg-developer-hover", hint: "text-developer-foreground/80" },
};

// Items with neither an href nor a panel to open have no screen yet and render
// as disabled "Soon" rows. Those set `audience` themselves, since there's no route to look up.
const ACTIONS: { label: string; href?: string; opens?: "conversation"; hint?: string; audience?: Audience }[] = [
  { label: "Start Conversation", opens: "conversation" },
  { label: "Create Agent", href: "/admin/agents/new" },
  { label: "See Dashboard", href: "/app" },
  { label: "Create Tool", href: "/admin/tools/new" },
  { label: "Create MCP Server", href: "/admin/mcp-servers/new" },
  { label: "Create Skill", audience: "admin" },
];

/**
 * Floating bottom-left launcher. It takes the spot of the Next.js dev
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
            {ACTIONS.map((action) => {
              const audience = action.href ? routeAudience(action.href) : action.audience;
              const tone = ITEM_TONE[audience ?? "neutral"];
              const hint = audience ? AUDIENCE_LABEL[audience] : action.hint;
              return action.href ? (
                <Link
                  key={action.label}
                  role="menuitem"
                  href={action.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${tone.fill} ${tone.hover}`}
                >
                  {action.label}
                  {hint && <span className={`text-xs ${tone.hint}`}>{hint}</span>}
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
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${tone.fill} ${tone.hover}`}
                >
                  {action.label}
                  {hint && <span className={`text-xs ${tone.hint}`}>{hint}</span>}
                </button>
              ) : (
                <div
                  key={action.label}
                  role="menuitem"
                  aria-disabled="true"
                  title={audience ? `${AUDIENCE_LABEL[audience]}, not built yet` : undefined}
                  className={`flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    audience ? `opacity-50 ${tone.fill}` : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {action.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      audience ? "bg-white/20" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500"
                    }`}
                  >
                    Soon
                  </span>
                </div>
              );
            })}
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
