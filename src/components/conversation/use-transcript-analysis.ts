"use client";

import { useRef, useState } from "react";
import type { PipelineStep } from "@/lib/types";
import { formatTranscript, type ChatMessage } from "./transcript";

/**
 * Model fields for steps that analyze the conversation (key points, draft flow).
 * Always the free local model, whichever agent is chatting, so keeping them
 * current never adds cost.
 */
export const LOCAL_ANALYSIS_MODEL: Omit<PipelineStep, "id" | "name" | "description" | "systemPrompt"> = {
  sourceType: "local",
  sourceLabel: "Ollama · llama3.2:latest",
  stepKind: "chat",
  modelRef: "local > llama3.2:latest",
  unit: "1K tokens",
  estimatedUnits: 1,
  cost: { kind: "free" },
};

const LIST_MARKER = /^(?:[-*•]|\d+[.)])\s+/;

// Small local models don't always follow the format — take the bulleted/numbered
// lines when there are any (dropping a "Here are the key points:" preamble),
// otherwise every non-empty line.
export function parseListLines(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const marked = lines.filter((l) => LIST_MARKER.test(l));
  return (marked.length > 0 ? marked : lines).map((l) => l.replace(LIST_MARKER, "").replaceAll("**", ""));
}

export type AnalysisStatus = "idle" | "loading" | "error";

/**
 * Runs `step` over the whole conversation via /api/pipeline/run and parses the
 * output. A newer refresh supersedes one still in flight, and the last good
 * result stays available while a refresh runs.
 */
export function useTranscriptAnalysis<T>(step: PipelineStep, parse: (output: string) => T, initial: T) {
  const [result, setResult] = useState<T>(initial);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [error, setError] = useState<string>();
  const requestRef = useRef<AbortController | null>(null);

  async function refresh(messages: ChatMessage[]) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const isCurrent = () => requestRef.current === controller;
    setStatus("loading");

    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, input: `Conversation:\n\n${formatTranscript(messages)}` }),
        signal: controller.signal,
      });
      const data = (await res.json()) as { output?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (!isCurrent()) return;
      setResult(parse(data.output ?? ""));
      setStatus("idle");
    } catch (err) {
      if (!isCurrent()) return;
      setError(err instanceof Error ? err.message : `${step.name} failed`);
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
    setStatus("idle");
    setError(undefined);
  }

  return { result, status, error, refresh, reset };
}
