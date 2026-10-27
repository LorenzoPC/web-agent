import type { McpAccess, McpAccessRule, McpAudience, McpCatalogTool, McpServerDraft, McpToolSafety } from "./mock-mcp-server-data";
import { MCP_DATASETS, TAKEN_MCP_SLUGS } from "./mock-mcp-server-data";
import type { RecipeCheck } from "./tool-recipe";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

const ACCESS_RANK: Record<McpAccess, number> = { none: 0, read: 1, write: 2, manage: 3 };

/** The access a tool needs on every dataset it touches. */
export const REQUIRED_ACCESS: Record<McpToolSafety, McpAccess> = { read: "read", write: "write", destructive: "manage" };

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Why a slug can't be used, or null when it can. */
export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) return "Use 3–40 lowercase letters, digits or hyphens.";
  if (TAKEN_MCP_SLUGS.includes(slug)) return "That URL is taken.";
  return null;
}

/** Who's connecting, as their directory profile describes them at sign-in. */
export interface McpPerson {
  audience: McpAudience;
  unitId: string | null;
  departmentId: string | null;
}

function specificity(rule: McpAccessRule): number {
  return rule.departmentId ? 2 : rule.unitId ? 1 : 0;
}

/** The department rule beats the business unit rule, which beats the audience-wide rule. No match means no access. */
export function matchRule(rules: McpAccessRule[], person: McpPerson): McpAccessRule | undefined {
  return rules
    .filter(
      (rule) =>
        rule.audience === person.audience &&
        (rule.unitId === null || rule.unitId === person.unitId) &&
        (rule.departmentId === null || rule.departmentId === person.departmentId),
    )
    .sort((a, b) => specificity(b) - specificity(a))[0];
}

export function accessFor(server: McpServerDraft, rule: McpAccessRule | undefined, datasetId: string): McpAccess {
  if (!rule || !server.datasetIds.includes(datasetId)) return "none";
  return rule.access[datasetId] ?? "none";
}

function hasDataAccess(server: McpServerDraft, rule: McpAccessRule, tool: McpCatalogTool): boolean {
  const needed = ACCESS_RANK[REQUIRED_ACCESS[tool.safety]];
  return tool.datasetIds.every((id) => ACCESS_RANK[accessFor(server, rule, id)] >= needed);
}

/** Enough access on every dataset the tool touches, and the rule's Tools setting doesn't hold it back. */
export function canUseTool(server: McpServerDraft, rule: McpAccessRule | undefined, tool: McpCatalogTool): boolean {
  if (!rule) return false;
  const tools = rule.tools ?? "per-tool";
  if (tools === "none" || (tools === "read-only" && tool.safety !== "read")) return false;
  return hasDataAccess(server, rule, tool);
}

function annotations(safety: McpToolSafety) {
  return safety === "read" ? { readOnlyHint: true } : { readOnlyHint: false, destructiveHint: safety === "destructive" };
}

/**
 * What a person's AI client receives on connecting: the server's instructions
 * (from initialize) and only the tools their rule allows (from tools/list).
 */
export function toClientView(server: McpServerDraft, tools: McpCatalogTool[], rule: McpAccessRule | undefined) {
  return {
    name: server.slug,
    instructions: server.instructions,
    tools: tools
      .filter((tool) => server.toolIds.includes(tool.id) && canUseTool(server, rule, tool))
      .map((tool) => ({ name: tool.toolName, description: tool.description, annotations: annotations(tool.safety) })),
  };
}

function datasetName(id: string): string {
  return MCP_DATASETS.find((d) => d.id === id)?.name ?? id;
}

/** Server lint, in form order. "fail" blocks publishing. */
export function checkServer(server: McpServerDraft, tools: McpCatalogTool[]): RecipeCheck[] {
  const checks: RecipeCheck[] = [];
  const add = (level: RecipeCheck["level"], label: string) => checks.push({ level, label });

  // Basics
  if (server.name.trim()) add("pass", "Server has a name");
  else add("fail", "Give the server a name");

  const problem = slugProblem(server.slug);
  if (problem) add("fail", `URL: ${problem}`);
  else add("pass", "URL is valid and free");

  const instructions = server.instructions.trim();
  if (!instructions) add("warn", "Add instructions so the model knows when to use this server");
  else if (instructions.length < 80) add("warn", "Instructions are short. Say what's here and when to use it");
  else add("pass", "Instructions tell the model when to use the server");

  // Data and access
  if (server.datasetIds.length) add("pass", `${server.datasetIds.length} dataset${server.datasetIds.length === 1 ? "" : "s"} exposed`);
  else add("warn", "No datasets exposed. Only tools that don't touch data will work");

  if (server.rules.length) add("pass", "At least one audience can connect");
  else add("fail", "Add an access rule. Without one, nobody can connect");

  // Tools
  const selected = tools.filter((tool) => server.toolIds.includes(tool.id));
  if (!selected.length) add("fail", "Pick at least one tool from the catalog");

  for (const tool of selected) {
    const unexposed = tool.datasetIds.filter((id) => !server.datasetIds.includes(id));
    if (unexposed.length) {
      add("fail", `${tool.toolName} needs ${datasetName(unexposed[0])}, which isn't exposed`);
    } else if (!server.rules.some((rule) => canUseTool(server, rule, tool))) {
      const level = REQUIRED_ACCESS[tool.safety];
      add(
        "warn",
        server.rules.some((rule) => hasDataAccess(server, rule, tool))
          ? `Nobody can use ${tool.toolName}: every rule with enough access limits it under Tools`
          : `Nobody can use ${tool.toolName}: no rule gives ${level[0].toUpperCase()}${level.slice(1)} on its data`,
      );
    }
    if (tool.safety === "destructive" && !server.confirmToolIds.includes(tool.id)) {
      add("warn", `${tool.toolName} is destructive. Turn on "Confirm first"`);
    }
  }
  if (selected.length) add("pass", `${selected.length} tool${selected.length === 1 ? "" : "s"} selected`);

  // Limits
  if (server.callsPerPersonPerDay > 0 && server.monthlyBudget > 0) add("pass", "Usage is capped");
  else add("warn", "Set a daily call limit and a monthly budget");

  return checks;
}
