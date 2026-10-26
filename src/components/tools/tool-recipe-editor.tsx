"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MockDiscoveryTurn, MockToolRecipe, MockToolTemplate, ToolHttpMethod } from "@/lib/mock-data";
import { applyRecipePatch, type RecipePatch, type RecipeSection } from "@/lib/tool-discovery";
import { AUTH_DEFAULTS, EXECUTION_DEFAULTS } from "@/lib/tool-recipe";
import { DiscoverySession } from "./discovery-session";
import { Checkbox, Field, INPUT_CLASS, MONO_INPUT_CLASS, Section, Segmented } from "./form-controls";
import { ParameterList } from "./parameter-list";
import { RecipePanel } from "./recipe-panel";

const DISCOVERY = "Discovery session";

const HTTP_METHODS: ToolHttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const EXECUTION_KINDS = [
  { id: "http", label: "HTTP request" },
  { id: "mcp", label: "MCP server" },
  { id: "function", label: "Function" },
] as const;

const AUTH_KINDS = [
  { id: "none", label: "None" },
  { id: "apiKey", label: "API key" },
  { id: "bearer", label: "Bearer token" },
] as const;

export function ToolRecipeEditor({
  templates,
  blankRecipe,
  discoveryScript,
}: {
  templates: MockToolTemplate[];
  /** What a Discovery session starts from and fills in. */
  blankRecipe: MockToolRecipe;
  /** Scripted interview the Discovery session mockup plays. */
  discoveryScript: MockDiscoveryTurn[];
}) {
  const [startedFrom, setStartedFrom] = useState(templates[0].label);
  const [recipe, setRecipe] = useState(templates[0].recipe);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [filledSections, setFilledSections] = useState<ReadonlySet<RecipeSection>>(new Set());

  // A Discovery session can send several patches before React re-renders
  // (e.g. "Skip to end"), so each one builds on this rather than on rendered state.
  const latestRecipe = useRef(recipe);
  useEffect(() => {
    latestRecipe.current = recipe;
  }, [recipe]);

  function update(patch: Partial<MockToolRecipe>) {
    setRecipe((prev) => ({ ...prev, ...patch }));
    setCreatedName(null);
  }

  function startFrom(label: string, startingRecipe: MockToolRecipe) {
    setStartedFrom(label);
    setRecipe(startingRecipe);
    setFilledSections(new Set());
    setCreatedName(null);
  }

  // Stable identities: the Discovery session's beat timer depends on them.
  const applyInterview = useCallback((patch: RecipePatch): RecipeSection[] => {
    const { recipe: next, sections } = applyRecipePatch(latestRecipe.current, patch);
    latestRecipe.current = next;
    setRecipe(next);
    setFilledSections((prev) => new Set([...prev, ...sections]));
    setCreatedName(null);
    return sections;
  }, []);

  const resetForInterview = useCallback(() => {
    latestRecipe.current = blankRecipe;
    setRecipe(blankRecipe);
    setFilledSections(new Set());
    setCreatedName(null);
  }, [blankRecipe]);

  const { execution, auth, cost } = recipe;
  const startOptions = [
    { label: DISCOVERY, recipe: blankRecipe },
    ...templates.map((t) => ({ label: t.label, recipe: t.recipe })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Start from" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Start from</span>
        {startOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={option.label === startedFrom}
            onClick={() => startFrom(option.label, option.recipe)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              option.label === startedFrom
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {startedFrom === DISCOVERY && <DiscoverySession script={discoveryScript} onPatch={applyInterview} onReset={resetForInterview} />}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Section
            step={1}
            title="Identity"
            hint="The model decides whether to call a tool from its name and description alone, so this matters most."
            filledByInterview={filledSections.has("identity")}
          >
            <Field label="Name" hint="The snake_case identifier the model calls, e.g. search_web.">
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="search_web"
                spellCheck={false}
                className={MONO_INPUT_CLASS}
              />
            </Field>
            <Field label="Description" hint="What it does, when to use it, and when not to.">
              <textarea
                value={recipe.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={4}
                placeholder="Search the live web and return the top results. Use it for current events… Don't use it for…"
                className={INPUT_CLASS}
              />
            </Field>
          </Section>

          <Section
            step={2}
            title="Inputs"
            filledByInterview={filledSections.has("inputs")}
            hint="The typed arguments the model fills in. Input descriptions are part of the prompt, so describe each one."
          >
            <ParameterList parameters={recipe.parameters} onChange={(parameters) => update({ parameters })} />
            <Checkbox
              label="Strict mode"
              hint="On providers that support it, generated input always matches the schema exactly."
              checked={recipe.strict}
              onChange={(strict) => update({ strict })}
            />
            <Field label="Example input" hint="One representative call as JSON, shown to the model as an example.">
              <textarea
                value={recipe.inputExample}
                onChange={(e) => update({ inputExample: e.target.value })}
                rows={4}
                placeholder={'{\n  "query": "NBA game results last night"\n}'}
                spellCheck={false}
                className={MONO_INPUT_CLASS}
              />
            </Field>
          </Section>

          <Section
            step={3}
            title="Execution"
            filledByInterview={filledSections.has("execution")}
            hint="What actually runs when the model calls the tool."
          >
            <Segmented
              label="Runs as"
              options={EXECUTION_KINDS}
              value={execution.kind}
              onChange={(kind) => update({ execution: EXECUTION_DEFAULTS[kind] })}
            />
            {execution.kind === "http" && (
              <div>
                <div className="flex gap-2">
                  <select
                    aria-label="HTTP method"
                    value={execution.method}
                    onChange={(e) => update({ execution: { ...execution, method: e.target.value as ToolHttpMethod } })}
                    className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    {HTTP_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    aria-label="URL"
                    value={execution.url}
                    onChange={(e) => update({ execution: { ...execution, url: e.target.value } })}
                    placeholder="https://api.example.com/v1/search"
                    spellCheck={false}
                    className={`${MONO_INPUT_CLASS} min-w-0 flex-1`}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  Put an input in the URL with <span className="font-mono">{"{input_name}"}</span>. Other inputs go in
                  the query string for GET and the JSON body otherwise.
                </p>
              </div>
            )}
            {execution.kind === "mcp" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Field label="Server URL">
                  <input
                    type="url"
                    value={execution.serverUrl}
                    onChange={(e) => update({ execution: { ...execution, serverUrl: e.target.value } })}
                    placeholder="https://example.com/mcp/"
                    spellCheck={false}
                    className={MONO_INPUT_CLASS}
                  />
                </Field>
                <Field label="Tool on that server">
                  <input
                    type="text"
                    value={execution.toolName}
                    onChange={(e) => update({ execution: { ...execution, toolName: e.target.value } })}
                    placeholder="create_issue"
                    spellCheck={false}
                    className={MONO_INPUT_CLASS}
                  />
                </Field>
              </div>
            )}
            {execution.kind === "function" && (
              <Field
                label="Code"
                hint="Receives the validated input object and returns a JSON-serializable result."
              >
                <textarea
                  value={execution.code}
                  onChange={(e) => update({ execution: { ...execution, code: e.target.value } })}
                  rows={6}
                  spellCheck={false}
                  className={MONO_INPUT_CLASS}
                />
              </Field>
            )}
          </Section>

          <Section
            step={4}
            title="Authentication"
            filledByInterview={filledSections.has("auth")}
            hint="Secrets are referenced by environment variable name and resolved on the server. They are never stored in the recipe or shown to the model."
          >
            <Segmented
              label="Credentials"
              options={AUTH_KINDS}
              value={auth.kind}
              onChange={(kind) => update({ auth: AUTH_DEFAULTS[kind] })}
            />
            {auth.kind !== "none" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {auth.kind === "apiKey" && (
                  <Field label="Header">
                    <input
                      type="text"
                      value={auth.header}
                      onChange={(e) => update({ auth: { ...auth, header: e.target.value } })}
                      spellCheck={false}
                      className={MONO_INPUT_CLASS}
                    />
                  </Field>
                )}
                <Field label="Env var" hint={auth.kind === "bearer" ? "Sent as Authorization: Bearer …" : undefined}>
                  <input
                    type="text"
                    value={auth.envVar}
                    onChange={(e) => update({ auth: { ...auth, envVar: e.target.value } })}
                    placeholder="EXAMPLE_API_KEY"
                    spellCheck={false}
                    className={MONO_INPUT_CLASS}
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section
            step={5}
            title="Output"
            filledByInterview={filledSections.has("output")}
            hint="What comes back, and how much of it the agent gets to read."
          >
            <Field label="What it returns">
              <textarea
                value={recipe.outputDescription}
                onChange={(e) => update({ outputDescription: e.target.value })}
                rows={2}
                placeholder="A list of results, each with title, url, and a short excerpt."
                className={INPUT_CLASS}
              />
            </Field>
            <Field
              label="Max result size (characters)"
              hint="Longer results are cut off before the model reads them, which protects the context window."
            >
              <input
                type="number"
                min={100}
                step={100}
                value={recipe.maxOutputChars}
                onChange={(e) => update({ maxOutputChars: Number(e.target.value) })}
                className={`${INPUT_CLASS} sm:max-w-48`}
              />
            </Field>
          </Section>

          <Section
            step={6}
            title="Guardrails"
            filledByInterview={filledSections.has("guardrails")}
            hint="What the tool is allowed to do, and what happens when it fails."
          >
            <Segmented
              label="Side effects"
              options={[
                { id: "read", label: "Read-only" },
                { id: "write", label: "Writes data" },
              ]}
              value={recipe.sideEffects}
              onChange={(sideEffects) => update({ sideEffects })}
            />
            <Checkbox
              label="Require approval"
              hint="Pause the run and ask a person before every call."
              checked={recipe.requiresApproval}
              onChange={(requiresApproval) => update({ requiresApproval })}
            />
            <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
              <Field label="Timeout (seconds)">
                <input
                  type="number"
                  min={1}
                  value={recipe.timeoutMs / 1000}
                  onChange={(e) => update({ timeoutMs: Number(e.target.value) * 1000 })}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Retries">
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={recipe.retries}
                  onChange={(e) => update({ retries: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </Section>

          <Section
            step={7}
            title="Cost"
            filledByInterview={filledSections.has("cost")}
            hint="Added to the step's projected cost for every call, on top of the model's own token or hardware cost."
          >
            <Segmented
              label="Pricing"
              options={[
                { id: "free", label: "Free" },
                { id: "perRequest", label: "Per call" },
              ]}
              value={cost.kind}
              onChange={(kind) =>
                update({ cost: kind === "free" ? { kind } : { kind, dollarsPerRequest: 0.001 } })
              }
            />
            {cost.kind === "perRequest" && (
              <Field label="Dollars per call">
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={cost.dollarsPerRequest}
                  onChange={(e) => update({ cost: { ...cost, dollarsPerRequest: Number(e.target.value) } })}
                  className={`${INPUT_CLASS} sm:max-w-48`}
                />
              </Field>
            )}
          </Section>
        </div>

        <RecipePanel recipe={recipe} createdName={createdName} onCreate={() => setCreatedName(recipe.name)} />
      </div>
    </div>
  );
}
