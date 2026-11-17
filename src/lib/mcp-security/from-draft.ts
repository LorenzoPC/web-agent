import type { McpAccessRule, McpCatalogTool, McpServerDraft } from "../mock-mcp-server-data";
import type { ForbidPolicy, Policy, Principal, ToolRef, ToolSafety } from "./policy";

/**
 * Turns the Create MCP server screen's rules into policies for the engine, so
 * Preview as shows what the server would really decide.
 *
 * What changes from the old "most specific rule wins":
 * - Every matching rule counts, and each dataset gets the highest level any of
 *   them grants. A department rule adds to its business unit's rule instead of
 *   replacing it.
 * - A rule's Tools limit (Read-only or None) is a ceiling for everyone the
 *   rule covers. A narrower rule can't lift it.
 * - Built-in ceilings apply whatever the rules say (ADR-0003 decision 6).
 */

export const EXTERNAL_AUDIENCES = ["clients", "partners", "resellers"];

/** External audiences only ever see their own company's records here. Not a switch. */
export const ALWAYS_COMPANY_SCOPED = ["tickets", "accounts"];

export function builtInPolicies(draft: Pick<McpServerDraft, "companyScopedIds">): ForbidPolicy[] {
  return [
    {
      id: "ceiling:external-no-manage",
      effect: "forbid",
      description: "External audiences never get Manage",
      target: { audiences: EXTERNAL_AUDIENCES },
      maxAccess: "write",
    },
    {
      id: "ceiling:own-company-only",
      effect: "forbid",
      description: "External audiences only see their own company's records",
      target: { audiences: EXTERNAL_AUDIENCES, datasetIds: [...new Set([...ALWAYS_COMPANY_SCOPED, ...draft.companyScopedIds])] },
      when: [{ kind: "not", condition: { kind: "same-company" } }],
    },
  ];
}

export function ruleLabelId(rule: McpAccessRule): string {
  return `rule:${rule.audience}/${rule.unitId ?? "*"}/${rule.departmentId ?? "*"}`;
}

const WRITE_SAFETIES: ToolSafety[] = ["write", "destructive"];
const ALL_SAFETIES: ToolSafety[] = ["read", "write", "destructive"];

export function rulePolicies(rule: McpAccessRule, draft: McpServerDraft, tools: McpCatalogTool[]): Policy[] {
  const id = ruleLabelId(rule);
  const target = {
    audiences: [rule.audience],
    ...(rule.unitId && { unitIds: [rule.unitId] }),
    ...(rule.departmentId && { departmentIds: [rule.departmentId] }),
  };
  const datasets = Object.fromEntries(Object.entries(rule.access).filter(([datasetId]) => draft.datasetIds.includes(datasetId)));

  // DECIDE: ADR-0003 decision 7 wants tools that touch no dataset granted one by
  // one. The screen has no control for that yet, so every rule grants the
  // server's dataset-free tools, as the screen did before. Its Tools limit
  // still caps them.
  const datasetFree = tools.filter((t) => draft.toolIds.includes(t.id) && t.datasetIds.length === 0).map((t) => t.toolName);

  const policies: Policy[] = [{ id, effect: "permit", description: `Access rule ${id}`, target, grant: { datasets, tools: datasetFree } }];
  const limit = rule.tools ?? "per-tool";
  if (limit !== "per-tool") {
    policies.push({
      id: `${id}:tools-${limit}`,
      effect: "forbid",
      description: limit === "none" ? "This rule allows no tools" : "This rule allows read-only tools",
      target: { ...target, safeties: limit === "none" ? ALL_SAFETIES : WRITE_SAFETIES },
    });
  }
  return policies;
}

/** All policies for a draft server: its rules, then the built-in ceilings. */
export function draftPolicies(draft: McpServerDraft, tools: McpCatalogTool[]): Policy[] {
  return [...draft.rules.flatMap((rule) => rulePolicies(rule, draft, tools)), ...builtInPolicies(draft)];
}

/** The draft's selected tools, as the engine sees them. */
export function draftTools(draft: McpServerDraft, tools: McpCatalogTool[]): (ToolRef & { catalogId: string })[] {
  return tools
    .filter((t) => draft.toolIds.includes(t.id))
    .map((t) => ({ catalogId: t.id, name: t.toolName, safety: t.safety, datasetIds: t.datasetIds }));
}

/** A stand-in person for Preview as. External people belong to a sample company. */
export function previewPrincipal(person: { audience: string; unitId: string | null; departmentId: string | null }): Principal {
  return {
    id: "preview",
    audience: person.audience,
    unitId: person.unitId,
    departmentId: person.departmentId,
    companyId: EXTERNAL_AUDIENCES.includes(person.audience) ? "preview-company" : null,
    roles: [],
  };
}
