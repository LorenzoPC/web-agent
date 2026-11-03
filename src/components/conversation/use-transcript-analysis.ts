"use client";

import { useRef, useState } from "react";
import { actualCost } from "@/lib/pipeline-data";
import type { ActualUsage, PipelineStep } from "@/lib/types";
import { formatTranscript, type ChatMessage } from "./transcript";

/**
 * A prompt that analyzes the conversation (key points, draft flow). The model
 * isn't part of it: /api/conversation/analyze picks it server-side, the free
 * local one by default, so keeping these current normally adds no cost.
 */
export interface AnalysisTask {
  name: string;
  systemPrompt: string;
}

/** Set when the analysis model failed and the chat agent's model stood in, at that agent's rate. */
export interface AnalysisFallback {
  agentName: string;
  cost: number;
}

const LIST_MARKER = /^(?:[-*•]|\d+[.)])\s+/;

// Small local models don't always follow the format. Take the bulleted/numbered
// lines when there are any (dropping a "Here are the key points:" preamble),
// otherwise every non-empty line.
export function parseListLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const marked = lines.filter((l) => LIST_MARKER.test(l));
  return (marked.length > 0 ? marked : lines).map((l) => l.replace(LIST_MARKER, "").replaceAll("**", ""));
}

export type AnalysisStatus = "idle" | "loading" | "error";

/**
 * Runs `task` over the whole conversation via /api/conversation/analyze and
 * parses the output. A newer refresh supersedes one still in flight, and the
 * last good result stays available while a refresh runs.
 */
export function useTranscriptAnalysis<T>(task: AnalysisTask, parse: (output: string) => T, initial: T) {
  const [result, setResult] = useState<T>(initial);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string>();
  /** Describes `result`, so it's kept alongside it when a refresh fails. */
  const [fallback, setFallback] = useState<AnalysisFallback>();
  const requestRef = useRef<AbortController | null>(null);

  /** `agent` is the one chatting now. Its model is only used if the analysis model fails. */
  async function refresh(messages: ChatMessage[], agent: PipelineStep) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const isCurrent = () => requestRef.current === controller;
    setStatus("loading");

    try {
      const res = await fetch("/api/conversation/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: task.systemPrompt,
          input: `Conversation:\n\n${formatTranscript(messages)}`,
          fallbackAgent: agent,
        }),
        signal: controller.signal,
      });
      const data = (await res.json()) as { output?: string; usage?: ActualUsage; usedFallback?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (!isCurrent()) return;
      setResult(parse(data.output ?? ""));
      setFallback(data.usedFallback ? { agentName: agent.name, cost: actualCost(agent, data.usage ?? {}) } : undefined);
      setStatus("idle");
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : `${task.name} failed`);
      setStatus("error");
    } finally {
      if (isCurrent()) requestRef.current = null;
    }
  }

  function reset() {
    const request = requestRef.current;
    requestRef.current = null;
    request?.abort();
    setResult(initial);
    setFallback(undefined);
    setStatus("idle");
    setError(undefined);
  }

  return { result, status, error, fallback, refresh, reset };
}
