"use client";

import { useState } from "react";
import type { MockPrompt } from "@/lib/mock-data";
import type { PipelineStep } from "@/lib/types";

type TestState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; output: string }
  | { status: "error"; message: string };

export function PromptTestModal({
  prompt,
  agents,
  onClose,
}: {
  prompt: MockPrompt;
  agents: PipelineStep[];
  onClose: () => void;
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [sampleInput, setSampleInput] = useState("");
  const [state, setState] = useState<TestState>({ status: "idle" });

  const agent = agents.find((a) => a.id === agentId);

  async function run() {
    if (!agent) return;
    setState({ status: "running" });
    const input = sampleInput.trim() ? `${prompt.body}\n\n${sampleInput.trim()}` : prompt.body;
    try {
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: agent, input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setState({ status: "done", output: data.output });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Test failed" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Test &ldquo;{prompt.name}&rdquo;</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Runs for real against the chosen agent&apos;s model — same execution path as the Builder.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Agent</label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.role ? ` — ${a.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prompt body</label>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {prompt.body}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sample input <span className="font-normal text-zinc-400 dark:text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              rows={3}
              placeholder="Paste sample content the prompt should act on…"
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <button
            onClick={run}
            disabled={!agent || state.status === "running"}
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {state.status === "running" ? "Running…" : "Run test"}
          </button>

          {state.status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          )}
          {state.status === "done" && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Output</h3>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                {state.output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
