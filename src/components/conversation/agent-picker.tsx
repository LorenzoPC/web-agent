"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatCostModel } from "@/lib/pipeline-data";
import type { PipelineStep } from "@/lib/types";

/** The composer's model-selector slot — picks which agent answers the next message. Opens upward. */
export function AgentPicker({
  agents,
  value,
  onChange,
}: {
  agents: PipelineStep[];
  value: PipelineStep;
  onChange: (agentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

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
      className="relative min-w-0"
      onKeyDown={(e) => {
        // Close the picker without also closing the panel behind it.
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Choose agent"
          className="absolute bottom-full left-0 mb-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          {agents.map((agent) => {
            const selected = agent.id === value.id;
            return (
              <button
                key={agent.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(agent.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-900 dark:text-zinc-100">{agent.name}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {agent.role ? `${agent.role} · ` : ""}
                    {formatCostModel(agent.cost)}
                  </span>
                </span>
                {selected && (
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0 text-zinc-900 dark:text-zinc-100">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        aria-label={`Agent: ${value.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <span className="truncate">{value.name}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={`size-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
