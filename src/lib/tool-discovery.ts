import { tool } from "ai";
import { z } from "zod";
import type { MockToolRecipe } from "./mock-data";
import { AUTH_DEFAULTS, checkRecipe, EXECUTION_DEFAULTS } from "./tool-recipe";

// Discovery session (docs/adr/0001-discovery-session-realtime-voice.md): a
// voice interview that fills in the Create Tool form through tool calls.
// Only the frontend mockup exists today: it replays MOCK_DISCOVERY_SCRIPT
// through `applyRecipePatch`. The model id, instructions, patch schema, and
// tool definitions below are the contract the realtime version will use, and
// aren't wired to anything yet.

/** Single source for the model id, so the token route and the client can't drift apart. */
export const DISCOVERY_REALTIME_MODEL = "gpt-realtime";

export const DISCOVERY_INSTRUCTIONS = `You are a friendly interviewer helping someone design a tool that an AI agent will call. Keep every turn short: one question at a time, at most two sentences. Start by greeting them and asking what job the tool should do.

Cover these, roughly in order, without reading them out as a checklist:
1. What the tool does, and when an agent should and shouldn't use it. This becomes the name (snake_case) and description.
2. What information the agent must provide. These become inputs, each with a type, whether it's required, and a description. Then one realistic example input.
3. How it runs: an HTTP API (method and URL), an MCP server (URL and tool name), or custom code.
4. Credentials: none, an API key header, or a bearer token. Ask only for the NAME of the environment variable that holds the secret. Never ask for the secret itself, and if the user starts reading one out, stop them and say not to.
5. What comes back.
6. Whether it changes data. If it does, suggest requiring approval and no retries. Also the timeout.
7. Cost per call, if any.

After each answer that settles something, call update_tool_recipe with only those fields. Draft good wording yourself: a description should say what the tool does, when to use it, and when not to. Don't make the user dictate exact text. The result lists what's still required or could be better; use it to choose your next question. Briefly confirm what you filled in, for example "Got it, I've set it up as a read-only GET request."

When the result has nothing left under "required", ask whether they'd like to change anything. When they're done, call finish_discovery and say goodbye in one sentence.`;

const discoveryParamSchema = z.object({
  name: z.string().describe("Input name, e.g. query or start_date"),
  type: z.enum(["string", "number", "integer", "boolean", "enum", "array"]),
  description: z.string().describe("What the input means and its format, written for the agent"),
  required: z.boolean(),
  enumValues: z.array(z.string()).optional().describe("Allowed values. Only for type enum"),
});

// Flat fields rather than nested unions: easier for a voice model to fill in
// piece by piece, and `applyRecipePatch` rebuilds the nested recipe shape.
export const recipePatchSchema = z.object({
  name: z.string().optional().describe("snake_case identifier the agent calls, e.g. search_web"),
  description: z.string().optional().describe("What the tool does, when to use it, and when not to"),
  parameters: z
    .array(discoveryParamSchema)
    .optional()
    .describe("The complete list of inputs. Replaces the current list, so always send every input"),
  exampleInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("One realistic call, as an object keyed by input name"),
  executionKind: z.enum(["http", "mcp", "function"]).optional(),
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  url: z.string().optional().describe("Full HTTP URL. {input_name} inserts an input into the path"),
  mcpServerUrl: z.string().optional(),
  mcpToolName: z.string().optional(),
  functionCode: z.string().optional().describe("JavaScript: an async function taking the input object"),
  authKind: z.enum(["none", "apiKey", "bearer"]).optional(),
  authHeader: z.string().optional().describe("Header that carries the API key, e.g. x-api-key"),
  authEnvVar: z.string().optional().describe("NAME of the environment variable holding the secret. Never the secret"),
  outputDescription: z.string().optional().describe("What the result contains"),
  maxOutputChars: z.number().int().positive().optional(),
  sideEffects: z.enum(["read", "write"]).optional(),
  requiresApproval: z.boolean().optional(),
  timeoutSeconds: z.number().positive().optional(),
  retries: z.number().int().min(0).max(5).optional(),
  pricing: z.enum(["free", "perRequest"]).optional(),
  dollarsPerCall: z.number().min(0).optional(),
});

export type RecipePatch = z.infer<typeof recipePatchSchema>;

// No `execute`: realtime tool calls run in the browser, through useRealtime's onToolCall.
export const discoveryTools = {
  update_tool_recipe: tool({
    description:
      "Write what you've learned into the tool recipe form the user can see. Send only the fields you're confident about. Omitted fields stay unchanged. Returns what's still required or could be better.",
    inputSchema: recipePatchSchema,
  }),
  finish_discovery: tool({
    description: "End the interview once nothing is left under required and the user is happy, or when the user wants to stop.",
    inputSchema: z.object({
      summary: z.string().describe("One sentence describing the tool you designed together"),
    }),
  }),
};

/** The editor's numbered sections, used to mark which ones the interview filled in. */
export type RecipeSection = "identity" | "inputs" | "execution" | "auth" | "output" | "guardrails" | "cost";

/** Merge a validated patch into the recipe and report which sections it touched. */
export function applyRecipePatch(
  recipe: MockToolRecipe,
  patch: RecipePatch,
): { recipe: MockToolRecipe; sections: RecipeSection[] } {
  const next: MockToolRecipe = { ...recipe };
  const sections = new Set<RecipeSection>();

  if (patch.name !== undefined || patch.description !== undefined) {
    next.name = patch.name ?? recipe.name;
    next.description = patch.description ?? recipe.description;
    sections.add("identity");
  }

  if (patch.parameters !== undefined) {
    next.parameters = patch.parameters;
    sections.add("inputs");
  }
  if (patch.exampleInput !== undefined) {
    next.inputExample = JSON.stringify(patch.exampleInput, null, 2);
    sections.add("inputs");
  }

  const touchesExecution = [
    patch.executionKind,
    patch.httpMethod,
    patch.url,
    patch.mcpServerUrl,
    patch.mcpToolName,
    patch.functionCode,
  ].some((v) => v !== undefined);
  if (touchesExecution) {
    const kind = patch.executionKind ?? recipe.execution.kind;
    const base = kind === recipe.execution.kind ? recipe.execution : EXECUTION_DEFAULTS[kind];
    switch (base.kind) {
      case "http":
        next.execution = { ...base, method: patch.httpMethod ?? base.method, url: patch.url ?? base.url };
        break;
      case "mcp":
        next.execution = {
          ...base,
          serverUrl: patch.mcpServerUrl ?? base.serverUrl,
          toolName: patch.mcpToolName ?? base.toolName,
        };
        break;
      case "function":
        next.execution = { ...base, code: patch.functionCode ?? base.code };
        break;
    }
    sections.add("execution");
  }

  if ([patch.authKind, patch.authHeader, patch.authEnvVar].some((v) => v !== undefined)) {
    const kind = patch.authKind ?? recipe.auth.kind;
    const base = kind === recipe.auth.kind ? recipe.auth : AUTH_DEFAULTS[kind];
    switch (base.kind) {
      case "none":
        next.auth = base;
        break;
      case "apiKey":
        next.auth = { ...base, header: patch.authHeader ?? base.header, envVar: patch.authEnvVar ?? base.envVar };
        break;
      case "bearer":
        next.auth = { ...base, envVar: patch.authEnvVar ?? base.envVar };
        break;
    }
    sections.add("auth");
  }

  if (patch.outputDescription !== undefined || patch.maxOutputChars !== undefined) {
    next.outputDescription = patch.outputDescription ?? recipe.outputDescription;
    next.maxOutputChars = patch.maxOutputChars ?? recipe.maxOutputChars;
    sections.add("output");
  }

  if ([patch.sideEffects, patch.requiresApproval, patch.timeoutSeconds, patch.retries].some((v) => v !== undefined)) {
    next.sideEffects = patch.sideEffects ?? recipe.sideEffects;
    next.requiresApproval = patch.requiresApproval ?? recipe.requiresApproval;
    next.timeoutMs = patch.timeoutSeconds !== undefined ? patch.timeoutSeconds * 1000 : recipe.timeoutMs;
    next.retries = patch.retries ?? recipe.retries;
    sections.add("guardrails");
  }

  if (patch.pricing !== undefined || patch.dollarsPerCall !== undefined) {
    // A price on its own implies per-call pricing.
    const pricing = patch.pricing ?? (patch.dollarsPerCall ? "perRequest" : recipe.cost.kind);
    const previous = recipe.cost.kind === "perRequest" ? recipe.cost.dollarsPerRequest : 0;
    next.cost =
      pricing === "free" ? { kind: "free" } : { kind: "perRequest", dollarsPerRequest: patch.dollarsPerCall ?? previous };
    sections.add("cost");
  }

  return { recipe: next, sections: [...sections] };
}

/** Tool result for update_tool_recipe: the recipe check, so the interviewer knows what to ask next. */
export function discoveryFeedback(recipe: MockToolRecipe) {
  const checks = checkRecipe(recipe);
  return {
    required: checks.filter((c) => c.level === "fail").map((c) => c.label),
    couldBeBetter: checks.filter((c) => c.level === "warn").map((c) => c.label),
  };
}
