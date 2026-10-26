"use client";

import { useEffect, useRef, useState } from "react";
import { Orb } from "@/components/ui/orb";
import type { MockStarterInstruction } from "@/lib/mock-data";
import { actualCost, formatCost } from "@/lib/pipeline-data";
import type { ActualUsage, PipelineStep } from "@/lib/types";
import { ConversationComposer } from "./conversation-composer";
import { ConversationFlow, NextActions, useConversationFlow } from "./conversation-flow";
import { ConversationSummary, useConversationSummary } from "./conversation-summary";
import { formatTranscript, type ChatMessage } from "./transcript";

// Free local model, so a conversation costs nothing until someone picks a paid agent.
const DEFAULT_AGENT_ID = "curated:agent-general";

// The first exchange states the ask; by the second reply the intent is usually
// clear enough to sketch a flow.
const FLOW_AFTER_REPLIES = 2;

// /api/pipeline/run takes a single `input` string, so earlier turns are flattened
// into a transcript ahead of the new message.
function buildInput(history: ChatMessage[], text: string): string {
  const transcript = formatTranscript(history);
  return transcript ? `Conversation so far:\n\n${transcript}\n\nUser: ${text}` : text;
}

/**
 * Right-hand chat sidebar (1/3 of the screen, full width on small screens),
 * opened from the Quick Actions menu. Non-modal — the page stays usable —
 * and stays mounted while closed so the conversation survives a close/reopen.
 * Turns run for real against the chosen agent via /api/pipeline/run, the same
 * execution path as the Builder and the Prompts test panel.
 */
export function ConversationPanel({
  open,
  onClose,
  agents,
  roleInstructions,
}: {
  open: boolean;
  onClose: () => void;
  agents: PipelineStep[];
  /** Starter cards for the empty state, keyed by agent role. */
  roleInstructions: Record<string, MockStarterInstruction[]>;
}) {
  const [agentId, setAgentId] = useState(
    () => agents.find((a) => a.id === DEFAULT_AGENT_ID)?.id ?? agents[0]?.id,
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** Name of the agent currently answering, or null when idle. */
  const [thinking, setThinking] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const summary = useConversationSummary();
  const flow = useConversationFlow();

  const agent = agents.find((a) => a.id === agentId) ?? agents[0];
  const instructions = agent.role ? (roleInstructions[agent.role] ?? []) : [];

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Fills the draft rather than sending — most instructions expect content pasted after them.
  function applyInstruction(instruction: string) {
    setDraft(instruction);
    inputRef.current?.focus();
  }

  async function send(text: string) {
    const step = agent;
    const history = messages;
    const controller = new AbortController();
    requestRef.current = controller;
    // A reset (New) swaps the ref out — a late reply must not land in the new conversation.
    const isCurrent = () => requestRef.current === controller;

    const withUser: ChatMessage[] = [...history, { id: crypto.randomUUID(), role: "user", text }];
    setMessages(withUser);
    setThinking(step.name);

    // Sending is disabled mid-turn and reset fails isCurrent(), so nothing else can
    // change messages before the reply — it's safe to build on withUser directly.
    const reply = (fields: Omit<Extract<ChatMessage, { role: "agent" }>, "id" | "role" | "agentName">) => {
      const next: ChatMessage[] = [...withUser, { id: crypto.randomUUID(), role: "agent", agentName: step.name, ...fields }];
      setMessages(next);
      return next;
    };

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, input: buildInput(history, text) }),
        signal: controller.signal,
      });
      const data = (await res.json()) as { output?: string; usage?: ActualUsage; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (!isCurrent()) return;
      const next = reply({ text: data.output ?? "", status: "done", cost: actualCost(step, data.usage ?? {}) });
      summary.refresh(next);
      if (next.filter((m) => m.role === "agent" && m.status === "done").length >= FLOW_AFTER_REPLIES) {
        flow.refresh(next);
      }
    } catch (error) {
      if (!isCurrent()) return;
      if (controller.signal.aborted) {
        reply({ text: "Stopped.", status: "stopped" });
      } else {
        reply({ text: error instanceof Error ? error.message : "Request failed", status: "error" });
      }
    } finally {
      if (isCurrent()) {
        requestRef.current = null;
        setThinking(null);
      }
    }
  }

  // Recommended actions call send() directly, so a half-typed draft survives them.
  function sendDraft(text: string) {
    setDraft("");
    send(text);
  }

  function stop() {
    requestRef.current?.abort();
  }

  function reset() {
    const request = requestRef.current;
    requestRef.current = null;
    request?.abort();
    setThinking(null);
    setMessages([]);
    summary.reset();
    flow.reset();
  }

  return (
    <aside
      aria-label="Conversation"
      inert={!open}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      // `invisible` waits out the slide-out before hiding, so the closed panel's shadow doesn't
      // peek in. Visibility only transitions on close — on open it must flip at once, or the
      // composer's focus() lands on a still-hidden textarea.
      className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-white duration-200 ease-out motion-reduce:transition-none md:w-1/3 md:min-w-96 dark:border-zinc-800 dark:bg-zinc-950 ${
        open
          ? "visible translate-x-0 shadow-xl transition-[translate]"
          : "invisible translate-x-full transition-[translate,visibility]"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Conversation</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            disabled={messages.length === 0 && !thinking}
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            New
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation"
            className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </header>

      {messages.length > 0 && <ConversationSummary points={summary.result} status={summary.status} error={summary.error} />}
      {(flow.result.intent || flow.result.next.length > 0 || flow.status !== "idle") && (
        <ConversationFlow plan={flow.result} status={flow.status} error={flow.error} />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 && !thinking ? (
          // min-h-full (not h-full) so a short panel scrolls instead of clipping the top.
          <div className="flex min-h-full flex-col items-center justify-center gap-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <Orb />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{agent.name}</p>
                <p className="mt-1 max-w-xs text-sm text-zinc-500">{agent.description}</p>
              </div>
            </div>
            {instructions.length > 0 && (
              <div role="group" aria-label={`Common ${agent.role} instructions`} className="grid w-full grid-cols-2 gap-2">
                {instructions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => applyInstruction(item.instruction)}
                    className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <span className="text-sm font-medium text-black dark:text-zinc-50">{item.title}</span>
                    <span className="line-clamp-2 text-xs text-zinc-500">{item.instruction}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-600">
              Switch agents from the picker below — anytime, even mid-conversation.
            </p>
          </div>
        ) : (
          <div role="log" aria-live="polite" className="flex flex-col gap-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-100 px-3.5 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {m.text}
                  </p>
                </div>
              ) : (
                <div key={m.id}>
                  <p className="text-xs font-medium text-zinc-500">
                    {m.agentName}
                    {m.cost !== undefined && <span className="font-normal text-zinc-400 dark:text-zinc-600"> · {formatCost(m.cost)}</span>}
                  </p>
                  <p
                    className={`mt-1 whitespace-pre-wrap text-sm ${
                      m.status === "error"
                        ? "text-red-600 dark:text-red-400"
                        : m.status === "stopped"
                          ? "italic text-zinc-400 dark:text-zinc-600"
                          : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              ),
            )}
            {thinking && (
              <div>
                <p className="text-xs font-medium text-zinc-500">{thinking}</p>
                <span aria-label="Thinking" className="mt-2 flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      style={{ animationDelay: `${delay}ms` }}
                      className="size-1.5 rounded-full bg-zinc-400 motion-safe:animate-pulse dark:bg-zinc-600"
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Only while the plan matches the latest reply — hidden mid-turn and while it re-derives. */}
        {!thinking && flow.status === "idle" && flow.result.actions.length > 0 && (
          <NextActions actions={flow.result.actions} onSelect={send} />
        )}
        <ConversationComposer
          agents={agents}
          agent={agent}
          onAgentChange={setAgentId}
          value={draft}
          onChange={setDraft}
          pending={thinking !== null}
          onSend={sendDraft}
          onStop={stop}
          inputRef={inputRef}
        />
        <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </aside>
  );
}
