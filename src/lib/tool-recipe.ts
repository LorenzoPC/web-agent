import type { MockToolAuth, MockToolExecution, MockToolParam, MockToolRecipe } from "./mock-data";

// Switching kind starts from these, so fields from the previous kind don't linger.
export const EXECUTION_DEFAULTS: Record<MockToolExecution["kind"], MockToolExecution> = {
  http: { kind: "http", method: "GET", url: "" },
  mcp: { kind: "mcp", serverUrl: "", toolName: "" },
  function: { kind: "function", code: "async (input) => {\n  return {};\n}" },
};

export const AUTH_DEFAULTS: Record<MockToolAuth["kind"], MockToolAuth> = {
  none: { kind: "none" },
  apiKey: { kind: "apiKey", header: "x-api-key", envVar: "" },
  bearer: { kind: "bearer", envVar: "" },
};

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const PARAM_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const URL_PATTERN = /^https?:\/\/\S+$/;

function enumValues(param: MockToolParam): string[] {
  return (param.enumValues ?? []).map((v) => v.trim()).filter(Boolean);
}

function paramSchema(param: MockToolParam) {
  const description = param.description.trim() || undefined;
  switch (param.type) {
    case "enum":
      return { type: "string", enum: enumValues(param), description };
    case "array":
      return { type: "array", items: { type: "string" }, description };
    default:
      return { type: param.type, description };
  }
}

/** JSON Schema for the tool's input — what the model fills in when it calls the tool. */
export function toInputSchema(parameters: MockToolParam[]) {
  const named = parameters.filter((p) => p.name.trim());
  const required = named.filter((p) => p.required).map((p) => p.name.trim());
  return {
    type: "object",
    properties: Object.fromEntries(named.map((p) => [p.name.trim(), paramSchema(p)])),
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

type ParsedExample = { ok: true; value: Record<string, unknown> | null } | { ok: false };

function parseExample(text: string): ParsedExample {
  if (!text.trim()) return { ok: true, value: null };
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value: value as Record<string, unknown> }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

/**
 * The only part of a recipe the model ever sees. Execution, auth, guardrails,
 * and cost stay server-side.
 */
export function toModelDefinition(recipe: MockToolRecipe) {
  const example = parseExample(recipe.inputExample);
  return {
    name: recipe.name,
    description: recipe.description,
    input_schema: toInputSchema(recipe.parameters),
    ...(recipe.strict ? { strict: true } : {}),
    ...(example.ok && example.value ? { input_examples: [example.value] } : {}),
  };
}

export interface RecipeCheck {
  /** "fail" blocks creating the tool; "warn" is advice. */
  level: "pass" | "warn" | "fail";
  label: string;
}

/** Recipe lint, in form order — what separates a tool an agent can use well from one it will misuse. */
export function checkRecipe(recipe: MockToolRecipe): RecipeCheck[] {
  const checks: RecipeCheck[] = [];
  const add = (level: RecipeCheck["level"], label: string) => checks.push({ level, label });

  // Identity
  if (TOOL_NAME_PATTERN.test(recipe.name)) add("pass", "Name is a valid snake_case identifier");
  else add("fail", "Name is a snake_case identifier, e.g. search_web");

  const description = recipe.description.trim();
  if (!description) add("fail", "Description says what the tool does and when to use it");
  else if (description.length < 80) add("warn", "Description is short — say when to use it, and when not to");
  else add("pass", "Description explains what it does and when to use it");

  // Inputs
  const params = recipe.parameters;
  if (params.length > 0) {
    const names = params.map((p) => p.name.trim());
    const namesOk = names.every((n) => PARAM_NAME_PATTERN.test(n)) && new Set(names).size === names.length;
    if (namesOk) add("pass", "Every input has a unique name");
    else add("fail", "Every input needs a unique name (letters, digits, _)");

    const undescribed = params.filter((p) => !p.description.trim()).length;
    if (undescribed === 0) add("pass", "Every input is described");
    else add("warn", `${undescribed} input${undescribed === 1 ? " is" : "s are"} missing a description`);

    if (params.some((p) => p.type === "enum" && enumValues(p).length === 0)) {
      add("fail", "Enum inputs need at least one allowed value");
    }
  }

  const example = parseExample(recipe.inputExample);
  if (!example.ok) {
    add("fail", "Example input must be a JSON object");
  } else if (!example.value) {
    add("warn", "Add an example input — it shows the model what a good call looks like");
  } else {
    const keys = Object.keys(example.value);
    const known = new Set(params.map((p) => p.name.trim()));
    const missing = params.filter((p) => p.required && !keys.includes(p.name.trim())).map((p) => p.name);
    const unknown = keys.filter((k) => !known.has(k));
    if (missing.length) add("fail", `Example input is missing ${missing.join(", ")}`);
    else if (unknown.length) add("fail", `Example input has ${unknown.join(", ")}, which isn't an input`);
    else add("pass", "Example input matches the schema");
  }

  // Execution
  const { execution } = recipe;
  if (execution.kind === "http") {
    const placeholders = [...execution.url.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const unknown = placeholders.filter((name) => !params.some((p) => p.name.trim() === name));
    if (!URL_PATTERN.test(execution.url)) add("fail", "HTTP request needs a full URL");
    else if (unknown.length) add("fail", `URL uses {${unknown[0]}}, which isn't an input`);
    else add("pass", "HTTP request is configured");
  } else if (execution.kind === "mcp") {
    if (!URL_PATTERN.test(execution.serverUrl) || !execution.toolName.trim()) {
      add("fail", "MCP server needs a URL and a tool name");
    } else add("pass", "MCP server is configured");
  } else if (!execution.code.trim()) {
    add("fail", "Function needs code");
  } else add("pass", "Function has code");

  // Authentication
  const { auth } = recipe;
  if (auth.kind !== "none") {
    if (!auth.envVar.trim() || (auth.kind === "apiKey" && !auth.header.trim())) {
      add("fail", "Auth needs the env var that holds the secret");
    } else add("pass", "Secret is referenced by env var");
  }

  // Output
  if (recipe.outputDescription.trim()) add("pass", "Output is described");
  else add("warn", "Describe what comes back so the agent knows what it gets");

  // Guardrails
  if (recipe.sideEffects === "write") {
    if (recipe.requiresApproval) add("pass", "Writes wait for a person to approve");
    else add("warn", "Writes data without approval — consider requiring it");
    if (recipe.retries > 0) add("warn", "Retrying a write can apply it twice");
  }
  if (recipe.timeoutMs <= 0) add("fail", "Timeout must be more than 0 seconds");

  // Cost
  if (recipe.cost.kind === "perRequest" && !(recipe.cost.dollarsPerRequest > 0)) {
    add("fail", "Per-call cost must be above $0, or choose Free");
  }

  return checks;
}
