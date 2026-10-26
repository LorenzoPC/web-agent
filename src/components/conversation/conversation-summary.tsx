"use client";

import type { PipelineStep } from "@/lib/types";
import { LOCAL_ANALYSIS_MODEL, parseListLines, useTranscriptAnalysis, type AnalysisStatus } from "./use-transcript-analysis";

const SUMMARY_STEP: PipelineStep = {
  ...LOCAL_ANALYSIS_MODEL,
  id: "conversation-summary",
  name: "Conversation summary",
  description: "Condenses a conversation into its key points",
  // Leading with the user's goal and constraints, and saying "the whole conversation",
  // stops the small local model from just summarizing the latest reply.
  systemPrompt:
    "You keep a running summary of a conversation between a user and an AI agent. " +
    'Reply with 3 to 5 short bullet points, each starting with "- ". ' +
    "The first bullet states what the user is trying to do, including any constraints they stated. " +
    "The other bullets capture the key answers and decisions so far, as of the latest messages, plus any open questions. " +
    "Cover the whole conversation, not just the last message. Don't invent details. No preamble, no closing remarks.",
};

const NO_POINTS: string[] = [];

export function useConversationSummary() {
  return useTranscriptAnalysis(SUMMARY_STEP, parseListLines, NO_POINTS);
}

/** Top 30% of the panel once a conversation starts. Keeps the last good summary on screen while updating. */
export function ConversationSummary({
  points,
  status,
  error,
}: {
  points: string[];
  status: AnalysisStatus;
  error?: string;
}) {
  return (
    <section
      aria-label="Key points"
      aria-busy={status === "loading"}
      className="h-[30%] shrink-0 overflow-y-auto border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-zinc-500">Key points</h3>
        {points.length > 0 && status === "loading" && (
          <span className="text-[11px] text-zinc-400 dark:text-zinc-600">Updating…</span>
        )}
        {points.length > 0 && status === "error" && (
          <span title={error} className="text-[11px] text-red-600 dark:text-red-400">
            Couldn&apos;t update
          </span>
        )}
      </div>
      {points.length > 0 ? (
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-sm text-zinc-800 marker:text-zinc-400 dark:text-zinc-200 dark:marker:text-zinc-600">
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      ) : status === "loading" ? (
        <div aria-label="Summarizing" className="mt-3 flex flex-col gap-2.5">
          {["w-11/12", "w-4/5", "w-2/3"].map((width) => (
            <span key={width} className={`h-3 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-800 ${width}`} />
          ))}
        </div>
      ) : status === "error" ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-600">Key points will appear after the first reply.</p>
      )}
    </section>
  );
}
