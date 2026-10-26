"use client";

import type { RefObject } from "react";
import type { PipelineStep } from "@/lib/types";
import { AgentPicker } from "./agent-picker";

/**
 * Two-line message box with a footer row, modeled on Claude Code's input —
 * except the footer's model selector is an agent selector. Enter sends,
 * Shift+Enter adds a line. The draft is controlled by the panel so starter
 * cards can fill it in.
 */
export function ConversationComposer({
  agents,
  agent,
  onAgentChange,
  value,
  onChange,
  pending,
  onSend,
  onStop,
  inputRef,
}: {
  agents: PipelineStep[];
  agent: PipelineStep;
  onAgentChange: (agentId: string) => void;
  value: string;
  onChange: (value: string) => void;
  pending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const canSend = value.trim().length > 0 && !pending;

  function submit() {
    if (canSend) onSend(value.trim());
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-zinc-300 bg-white shadow-sm transition-colors focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-500"
    >
      <textarea
        ref={inputRef}
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        aria-label="Message"
        placeholder={`Message ${agent.name}…`}
        className="block w-full resize-none bg-transparent px-3.5 pt-3 text-sm text-black placeholder:text-zinc-400 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-500"
      />
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <AgentPicker agents={agents} value={agent} onChange={onAgentChange} />
        {pending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <span className="size-2.5 rounded-[2px] bg-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-black text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
              <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
