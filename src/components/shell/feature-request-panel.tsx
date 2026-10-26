"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { INPUT_CLASS } from "@/components/tools/form-controls";
import { Orb } from "@/components/ui/orb";
import {
  answeredCount,
  EMPTY_FEATURE_ANSWERS,
  FEATURE_REQUEST_FIELDS,
  type FeatureRequest,
  type FeatureRequestAnswers,
  featureRequestMarkdown,
  featureRequestTitle,
} from "@/lib/feature-request";
import { pageLabel } from "./app-nav";
import { useSidePanel } from "./side-panel";

const REVIEW_STEP = FEATURE_REQUEST_FIELDS.length;

const PRIMARY_BUTTON =
  "rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200";
const SECONDARY_BUTTON =
  "rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200";
const HEADER_BUTTON =
  "rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800";

/**
 * Right-hand "Ask a feature" panel, opened from the nav. Asks the six prompts
 * one at a time, then shows a review before submitting. Shares the right-hand
 * slot with the Conversation panel and, like it, is non-modal and stays mounted
 * while closed, so a half-written request survives a close/reopen.
 */
export function FeatureRequestPanel({ userName }: { userName: string }) {
  const { panel, setPanel } = useSidePanel();
  const open = panel === "feature-request";
  const page = pageLabel(usePathname());
  const [answers, setAnswers] = useState<FeatureRequestAnswers>(EMPTY_FEATURE_ANSWERS);
  /** Index into FEATURE_REQUEST_FIELDS, or REVIEW_STEP. */
  const [step, setStep] = useState(0);
  /** Set when a question is opened from the review's Edit link, so it returns there instead of moving on. */
  const [editing, setEditing] = useState(false);
  /** Newest first. Mockup: kept in component state only, not persisted or sent. */
  const [submitted, setSubmitted] = useState<FeatureRequest[]>([]);
  const [justSent, setJustSent] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Review and confirmation have no input; their heading takes focus so keyboard users land in the new view.
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) (inputRef.current ?? headingRef.current)?.focus();
  }, [open, step, justSent]);

  const answered = answeredCount(answers);
  const canSubmit = FEATURE_REQUEST_FIELDS.every((f) => !f.required || answers[f.id].trim());
  const latest = justSent ? submitted[0] : undefined;

  const field = FEATURE_REQUEST_FIELDS[step];
  const hasAnswer = field ? answers[field.id].trim() !== "" : false;
  const canAdvance = field ? hasAnswer || !field.required : false;
  const advanceLabel = editing
    ? "Back to review"
    : !hasAnswer && !field?.required
      ? "Skip"
      : step === REVIEW_STEP - 1
        ? "Review"
        : "Next";

  function goTo(next: number) {
    setStep(next);
    setEditing(false);
  }

  function advance() {
    if (canAdvance) goTo(editing ? REVIEW_STEP : step + 1);
  }

  function submit() {
    const request: FeatureRequest = {
      id: crypto.randomUUID(),
      title: featureRequestTitle(answers.need),
      answers,
      requestedBy: userName,
      page,
      createdAt: new Date().toISOString(),
    };
    setSubmitted((prev) => [request, ...prev]);
    setAnswers(EMPTY_FEATURE_ANSWERS);
    goTo(0);
    setCopy("idle");
    setJustSent(true);
  }

  function startOver() {
    setAnswers(EMPTY_FEATURE_ANSWERS);
    goTo(0);
  }

  async function copyMarkdown(request: FeatureRequest) {
    try {
      await navigator.clipboard.writeText(featureRequestMarkdown(request));
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <aside
      id="feature-request-panel"
      aria-label="Ask a feature"
      inert={!open}
      onKeyDown={(e) => {
        if (e.key === "Escape") setPanel(null);
      }}
      // Same slide-in as ConversationPanel; see the note there on why visibility only transitions on close.
      className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-zinc-200 bg-white duration-200 ease-out motion-reduce:transition-none md:w-1/3 md:min-w-96 dark:border-zinc-800 dark:bg-zinc-950 ${
        open
          ? "visible translate-x-0 shadow-xl transition-[translate]"
          : "invisible translate-x-full transition-[translate,visibility]"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Ask a feature</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startOver}
            disabled={latest !== undefined || (answered === 0 && step === 0)}
            className={HEADER_BUTTON}
          >
            Start over
          </button>
          <button type="button" onClick={() => setPanel(null)} aria-label="Close feature request" className={HEADER_BUTTON}>
            Close
          </button>
        </div>
      </header>

      {latest ? (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <Orb />
            <div>
              <h3 ref={headingRef} tabIndex={-1} className="text-base font-medium text-black focus:outline-none dark:text-zinc-50">
                Request submitted
              </h3>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">“{latest.title}”</p>
              <p className="mt-1 text-xs text-zinc-500">
                {answeredCount(latest.answers)} of {FEATURE_REQUEST_FIELDS.length} questions answered · from {latest.page}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => copyMarkdown(latest)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {copy === "copied" ? "Copied" : copy === "failed" ? "Couldn't copy" : "Copy as Markdown"}
              </button>
              <button type="button" onClick={() => setJustSent(false)} className={PRIMARY_BUTTON}>
                Ask another
              </button>
            </div>
            <p className="max-w-xs text-xs text-zinc-400 dark:text-zinc-600">
              Mockup: requests stay in this tab and aren&apos;t sent anywhere yet. Copy the Markdown into your tracker to
              share one.
            </p>
          </div>
          {submitted.length > 1 && (
            <section className="mt-8">
              <h4 className="text-xs font-medium text-zinc-500">Submitted this session</h4>
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
                {submitted.map((request) => (
                  <li key={request.id} className="py-2">
                    <p className="truncate text-sm text-zinc-800 dark:text-zinc-200">{request.title}</p>
                    <p className="text-xs text-zinc-500">
                      {request.page} ·{" "}
                      {new Date(request.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="border-b border-zinc-200 px-4 pt-2 pb-3 dark:border-zinc-800">
            <ol aria-label="Questions" className="flex gap-1">
              {FEATURE_REQUEST_FIELDS.map((f, i) => {
                const done = answers[f.id].trim() !== "";
                return (
                  <li key={f.id} className="flex-1">
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === step ? "step" : undefined}
                      aria-label={`${i + 1}. ${f.title}${done ? ", answered" : ""}`}
                      title={f.title}
                      className="block w-full py-1.5"
                    >
                      <span
                        className={`block h-1 rounded-full transition-colors ${
                          i === step
                            ? "bg-black dark:bg-white"
                            : done
                              ? "bg-zinc-400 dark:bg-zinc-500"
                              : "bg-zinc-200 dark:bg-zinc-800"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-zinc-500">
              {field ? `Question ${step + 1} of ${REVIEW_STEP}` : "Review"} · {answered} answered
            </p>
          </div>

          {field ? (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                {step === 0 && (
                  <p className="mb-5 text-sm text-zinc-500">
                    Six short questions to shape your idea. Only the first is required, so skip any you&apos;re unsure
                    about.
                  </p>
                )}
                <div className="flex items-start gap-3">
                  <Orb />
                  <div className="min-w-0 pt-0.5">
                    <h3 id="feature-question" className="text-base font-medium text-black dark:text-zinc-50">
                      {field.question}
                      {field.required && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 align-middle text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          Required
                        </span>
                      )}
                    </h3>
                    <p id="feature-hint" className="mt-1 text-sm text-zinc-500">
                      {field.hint}
                    </p>
                  </div>
                </div>
                <textarea
                  ref={inputRef}
                  rows={6}
                  value={answers[field.id]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      advance();
                    }
                  }}
                  aria-labelledby="feature-question"
                  aria-describedby="feature-hint"
                  placeholder={field.placeholder}
                  className={`${INPUT_CLASS} mt-4 resize-y placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
                />
                <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-600">⌘/Ctrl + Enter to continue</p>
              </div>
              <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0} className={SECONDARY_BUTTON}>
                  Back
                </button>
                <button type="button" onClick={advance} disabled={!canAdvance} className={PRIMARY_BUTTON}>
                  {advanceLabel}
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <h3 ref={headingRef} tabIndex={-1} className="text-base font-medium text-black focus:outline-none dark:text-zinc-50">
                  Review your request
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Edit anything before you submit. Your name and the page you&apos;re on are attached automatically.
                </p>
                <ul className="mt-5 flex flex-col gap-3">
                  {FEATURE_REQUEST_FIELDS.map((f, i) => {
                    const answer = answers[f.id].trim();
                    return (
                      <li key={f.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-zinc-500">{f.title}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(i);
                              setEditing(true);
                            }}
                            aria-label={`Edit ${f.title}`}
                            className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            Edit
                          </button>
                        </div>
                        <p
                          className={`mt-1 whitespace-pre-wrap text-sm ${
                            answer
                              ? "text-zinc-800 dark:text-zinc-200"
                              : f.required
                                ? "text-red-600 dark:text-red-400"
                                : "italic text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {answer || (f.required ? "Required before you can submit." : "Not answered")}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs text-zinc-500">
                  Attached: {userName} · {page}
                </p>
              </div>
              <footer className="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <button type="button" onClick={() => goTo(REVIEW_STEP - 1)} className={SECONDARY_BUTTON}>
                  Back
                </button>
                <button type="button" onClick={submit} disabled={!canSubmit} className={PRIMARY_BUTTON}>
                  Submit request
                </button>
              </footer>
            </>
          )}
        </>
      )}
    </aside>
  );
}
