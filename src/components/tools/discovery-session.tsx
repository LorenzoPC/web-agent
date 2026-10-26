"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Orb } from "@/components/ui/orb";
import type { MockDiscoveryTurn } from "@/lib/mock-data";
import type { RecipePatch, RecipeSection } from "@/lib/tool-discovery";
import { INPUT_CLASS } from "./form-controls";

// Frontend mockup of the Discovery session (docs/adr/0001-discovery-session-realtime-voice.md):
// plays a scripted interview on timers instead of a realtime voice session, but
// fills the form through the same patch contract the real one will use.

const SECTION_LABELS: Record<RecipeSection, string> = {
  identity: "Identity",
  inputs: "Inputs",
  execution: "Execution",
  auth: "Authentication",
  output: "Output",
  guardrails: "Guardrails",
  cost: "Cost",
};

const LISTEN_MS = 1600;
const FILL_MS = 700;

// The interview as a sequence of timed beats: the interviewer speaks, the
// user is "heard", and then (if the answer settled something) the form fills.
type Beat =
  | { kind: "speak"; turn: number; ms: number }
  | { kind: "listen"; turn: number; ms: number }
  | { kind: "fill"; turn: number; ms: number; patch: RecipePatch };

function buildBeats(script: MockDiscoveryTurn[]): Beat[] {
  return script.flatMap((turn, i): Beat[] => {
    if (turn.speaker === "interviewer") {
      const words = turn.text.split(/\s+/).length;
      return [{ kind: "speak", turn: i, ms: Math.min(Math.max(words * 110, 1400), 4000) }];
    }
    const listen: Beat = { kind: "listen", turn: i, ms: LISTEN_MS };
    return turn.patch ? [listen, { kind: "fill", turn: i, ms: FILL_MS, patch: turn.patch }] : [listen];
  });
}

type Phase = "idle" | "running" | "ended" | "done";

export function DiscoverySession({
  script,
  onPatch,
  onReset,
}: {
  script: MockDiscoveryTurn[];
  /** Merges a patch into the form and returns the sections it touched. Must be stable. */
  onPatch: (patch: RecipePatch) => RecipeSection[];
  /** Puts the form back to blank before an interview starts. */
  onReset: () => void;
}) {
  const beats = useMemo(() => buildBeats(script), [script]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [filledByTurn, setFilledByTurn] = useState<Record<number, RecipeSection[]>>({});
  const [typedByTurn, setTypedByTurn] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const current = phase === "running" ? beats[step] : undefined;

  // Advance one beat at a time. A fill beat writes its patch into the form when it completes.
  useEffect(() => {
    if (phase !== "running") return;
    const beat = beats[step];
    if (!beat) return;
    const timer = setTimeout(() => {
      if (beat.kind === "fill") {
        const sections = onPatch(beat.patch);
        setFilledByTurn((prev) => ({ ...prev, [beat.turn]: sections }));
      }
      if (step + 1 >= beats.length) setPhase("done");
      setStep(step + 1);
    }, beat.ms);
    return () => clearTimeout(timer);
  }, [phase, step, beats, onPatch]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [step]);

  function start() {
    onReset();
    setStep(0);
    setFilledByTurn({});
    setTypedByTurn({});
    setDraft("");
    setPhase("running");
  }

  function skipToEnd() {
    const filled = { ...filledByTurn };
    beats.slice(step).forEach((beat) => {
      if (beat.kind === "fill") filled[beat.turn] = onPatch(beat.patch);
    });
    setFilledByTurn(filled);
    setStep(beats.length);
    setPhase("done");
  }

  // A typed answer stands in for the current spoken one; the scripted patch still applies.
  function sendTyped(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || current?.kind !== "listen") return;
    setTypedByTurn((prev) => ({ ...prev, [current.turn]: text }));
    setDraft("");
    setStep(step + 1);
  }

  // A turn shows once its first beat has started: finished beats, plus the one in progress.
  const lines = script
    .map((turn, i) => ({ turn, i, first: beats.findIndex((b) => b.turn === i) }))
    .filter(({ i, first }) => first !== -1 && (first < step || current?.turn === i));

  const statusLabel =
    current?.kind === "speak"
      ? "Interviewer speaking"
      : current?.kind === "listen"
        ? "Listening"
        : current?.kind === "fill"
          ? "Updating the recipe"
          : phase === "done"
            ? "Interview complete. Review the form below, then create the tool."
            : phase === "ended"
              ? "Interview ended. Whatever was filled in stays in the form."
              : null;

  return (
    <section className="rounded-lg border border-indigo-200 bg-white p-5 dark:border-indigo-900 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start gap-4">
        <Orb className={current?.kind === "speak" ? "animate-pulse" : ""} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-black dark:text-zinc-50">Discovery session</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Mockup
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
            A short spoken interview. The interviewer asks about the job the tool should do and fills in the recipe
            below as you answer. Nothing is created until you click Create tool.
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
            Simulated: this plays a scripted example interview. No audio is recorded or sent anywhere.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase === "running" ? (
            <>
              <button
                type="button"
                onClick={skipToEnd}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                Skip to end
              </button>
              <button
                type="button"
                onClick={() => setPhase("ended")}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                End interview
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={start}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              {phase === "idle" ? "Start interview" : "Restart interview"}
            </button>
          )}
        </div>
      </div>

      {phase !== "idle" && (
        <div className="mt-4 flex flex-col gap-3">
          {statusLabel && (
            <p aria-live="polite" className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {current?.kind === "listen" ? (
                <MicLevel />
              ) : (
                current && <span aria-hidden="true" className="size-2 rounded-full bg-indigo-500" />
              )}
              {statusLabel}
            </p>
          )}
          <div
            ref={transcriptRef}
            className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
          >
            {lines.map(({ turn, i }) => {
              const isListening = current?.kind === "listen" && current.turn === i;
              const isFilling = current?.kind === "fill" && current.turn === i;
              const filled = filledByTurn[i];
              return (
                <div key={i} className="motion-safe:animate-fade-in">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="mr-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      {turn.speaker === "user" ? "You" : "Interviewer"}
                    </span>
                    {isListening ? (
                      <span className="text-zinc-400 dark:text-zinc-600">…</span>
                    ) : (
                      (typedByTurn[i] ?? turn.text)
                    )}
                  </p>
                  {isFilling && (
                    <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">Updating the recipe…</p>
                  )}
                  {filled && filled.length > 0 && (
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500 dark:text-zinc-500">
                      Filled in
                      {filled.map((section) => (
                        <span
                          key={section}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        >
                          {SECTION_LABELS[section]}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {phase === "running" && (
            <form onSubmit={sendTyped} className="flex gap-2">
              <input
                type="text"
                aria-label="Type an answer"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={current?.kind === "listen" ? "Or type your answer…" : "Wait for the next question…"}
                disabled={current?.kind !== "listen"}
                className={`${INPUT_CLASS} min-w-0 flex-1 disabled:opacity-60`}
              />
              <button
                type="submit"
                disabled={current?.kind !== "listen" || !draft.trim()}
                className="shrink-0 rounded-lg px-3 text-sm font-medium text-black hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}

/** Fake input level meter shown while the interviewer is "listening". */
function MicLevel() {
  return (
    <span aria-hidden="true" className="inline-flex h-3 items-end gap-0.5">
      {[0, 180, 90, 270].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="h-full w-0.5 origin-bottom rounded-full bg-emerald-500 motion-safe:animate-mic-level"
        />
      ))}
    </span>
  );
}
