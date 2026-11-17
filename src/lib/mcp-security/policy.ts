/**
 * Policy-based access control (PBAC) for MCP servers: the one place that
 * decides whether a person, through one AI client, may use a tool on a
 * server's data.
 *
 * Policies are data, not code, so they can be stored, reviewed, diffed and
 * shown in Preview as. One evaluation combines:
 * - roles and audiences (RBAC),
 * - attributes of the person, the client and the data (ABAC),
 * - company relationships (client-of, reseller-of, partner-of),
 * - runtime conditions such as the time, or the ticket a conversation is about
 *   (conditional access),
 * - and the token's scopes, as a ceiling.
 *
 * The combining rules follow ADR-0003 decision 6:
 * - Deny by default. No matching permit means no access.
 * - A dataset's level is the highest any matching permit grants.
 * - Forbids are ceilings and always win. Adding a permit never removes
 *   access, and adding a forbid never adds it.
 * - Every decision names the policies that decided it.
 *
 * Conditions are three-valued. A permit applies only when its conditions are
 * known to hold. A forbid applies unless its conditions are known not to
 * hold, so a condition we can't evaluate (a bad time zone, a missing
 * attribute) always fails closed.
 *
 * Nothing here imports Node APIs: the same engine runs on the server and in
 * the admin screen's preview.
 */

export type Access = "none" | "read" | "write" | "manage";
export type ToolSafety = "read" | "write" | "destructive";
export type CompanyRelation = "client-of" | "reseller-of" | "partner-of";

export const ACCESS_RANK: Record<Access, number> = { none: 0, read: 1, write: 2, manage: 3 };

/** The access a tool needs on every dataset it touches. */
export const REQUIRED_ACCESS: Record<ToolSafety, Access> = { read: "read", write: "write", destructive: "manage" };

/** Coarse token scopes. The fine decision is always made here, on the server. */
export const SCOPES: Record<Exclude<Access, "none">, string> = { read: "mcp:read", write: "mcp:write", manage: "mcp:manage" };

/** Who's calling, read fresh from the directory on every request, never frozen at sign-in. */
export interface Principal {
  /** Stable web-agent ID, derived from the identity provider's (iss, sub). */
  id: string;
  audience: string;
  unitId: string | null;
  departmentId: string | null;
  /** The company the person belongs to. null for staff with no company context. */
  companyId: string | null;
  roles: string[];
}

export interface ToolRef {
  name: string;
  safety: ToolSafety;
  /** Datasets the tool reads or changes. Empty for tools like web_search. */
  datasetIds: string[];
}

/** The specific records a call touches, once known. Absent when listing tools. */
export interface ResourceRef {
  companyId?: string | null;
  ticketId?: string | null;
}

export interface PolicyContext {
  now: Date;
  /** The ticket the conversation is bound to, if any. */
  ticketId?: string | null;
  /** Device or workload posture from an attestation, when there is one. */
  posture?: "compliant" | "noncompliant";
  /** Company relationships, preloaded for this request from the relationship store. */
  related?: (subjectCompanyId: string, relation: CompanyRelation, objectCompanyId: string) => boolean;
}

export interface PolicyRequest {
  principal: Principal;
  clientId: string;
  /** The token's scopes. null when there's no token, as in the admin preview. */
  scopes: string[] | null;
  server: string;
  tool?: ToolRef;
  resource?: ResourceRef;
  context: PolicyContext;
}

/**
 * What a policy applies to. Every field that's present must match, and a list
 * matches when any of its values does. An empty target matches everything.
 */
export interface PolicyTarget {
  audiences?: string[];
  unitIds?: string[];
  departmentIds?: string[];
  roles?: string[];
  clientIds?: string[];
  servers?: string[];
  /** Tool names. On a forbid, this makes it a tool forbid. */
  tools?: string[];
  /** Tool safety levels. On a forbid, this makes it a tool forbid. */
  safeties?: ToolSafety[];
  /** Datasets. On a forbid, the datasets it caps (all of them when absent). */
  datasetIds?: string[];
}

export type Condition =
  /** Inside a weekly window, in a named time zone. Days: 0 is Sunday. */
  | { kind: "time-window"; timeZone: string; days: number[]; from: string; to: string }
  /** The record belongs to the person's own company. Resolved per record. */
  | { kind: "same-company" }
  /** The person's company has this relationship with the record's company. Resolved per record. */
  | { kind: "related-company"; relation: CompanyRelation }
  /** The conversation is bound to a ticket, and the record is that ticket. Resolved per record. */
  | { kind: "ticket-bound" }
  | { kind: "posture"; required: "compliant" }
  | { kind: "client"; clientIds: string[] }
  | { kind: "not"; condition: Condition }
  | { kind: "any"; conditions: Condition[] };

export interface PermitPolicy {
  id: string;
  effect: "permit";
  description: string;
  target: PolicyTarget;
  when?: Condition[];
  grant: {
    /** Levels per dataset. */
    datasets?: Record<string, Access>;
    /** Tools that touch no dataset need a grant by name (ADR-0003 decision 7). */
    tools?: string[];
  };
}

export interface ForbidPolicy {
  id: string;
  effect: "forbid";
  description: string;
  target: PolicyTarget;
  when?: Condition[];
  /** For a dataset forbid, the most it leaves. Defaults to "none". */
  maxAccess?: Access;
}

export type Policy = PermitPolicy | ForbidPolicy;

/** Something the caller must still enforce, record by record, once it knows the resource. */
export interface Obligation {
  policyId: string;
  effect: Policy["effect"];
  condition: Condition;
  datasetIds: string[];
}

export interface DatasetAccess {
  level: Access;
  grantedBy: string[];
  cappedBy: string[];
}

export type DecisionCode =
  | "allowed"
  | "no_permit"
  | "forbidden"
  | "insufficient_access"
  | "insufficient_scope";

export interface Decision {
  allow: boolean;
  code: DecisionCode;
  reason: string;
  /** The policies that decided the outcome. */
  determiningPolicies: string[];
  datasets: Record<string, DatasetAccess>;
  /** Present when the call was limited by its token: the scope that would allow it. */
  requiredScope?: string;
  obligations: Obligation[];
}

type Tri = "match" | "no-match" | "unknown" | "deferred";

function maxAccess(a: Access, b: Access): Access {
  return ACCESS_RANK[a] >= ACCESS_RANK[b] ? a : b;
}

function listMatches<T>(list: T[] | undefined, value: T | null | undefined): boolean {
  return list === undefined || (value !== null && value !== undefined && list.includes(value));
}

function targetMatchesWho(target: PolicyTarget, request: PolicyRequest): boolean {
  const p = request.principal;
  return (
    listMatches(target.audiences, p.audience) &&
    listMatches(target.unitIds, p.unitId) &&
    listMatches(target.departmentIds, p.departmentId) &&
    (target.roles === undefined || target.roles.some((role) => p.roles.includes(role))) &&
    listMatches(target.clientIds, request.clientId) &&
    listMatches(target.servers, request.server)
  );
}

function isToolForbid(policy: ForbidPolicy): boolean {
  return policy.target.tools !== undefined || policy.target.safeties !== undefined;
}

function targetMatchesTool(target: PolicyTarget, tool: ToolRef | undefined): boolean {
  if (target.tools === undefined && target.safeties === undefined) return true;
  if (!tool) return false;
  return listMatches(target.tools, tool.name) && listMatches(target.safeties, tool.safety);
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function inTimeWindow(condition: Extract<Condition, { kind: "time-window" }>, now: Date): Tri {
  const from = TIME.exec(condition.from);
  const to = TIME.exec(condition.to);
  if (!from || !to || Number.isNaN(now.getTime())) return "unknown";
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: condition.timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return "unknown";
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = WEEKDAYS[get("weekday")];
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  if (day === undefined || Number.isNaN(minutes)) return "unknown";
  const start = Number(from[1]) * 60 + Number(from[2]);
  const end = Number(to[1]) * 60 + Number(to[2]);
  const inside = start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
  return condition.days.includes(day) && inside ? "match" : "no-match";
}

function evaluate(condition: Condition, request: PolicyRequest): Tri {
  const { principal, resource, context } = request;
  switch (condition.kind) {
    case "time-window":
      return inTimeWindow(condition, context.now);
    case "same-company":
      if (!resource) return "deferred";
      if (!principal.companyId || resource.companyId === undefined) return "unknown";
      return resource.companyId === principal.companyId ? "match" : "no-match";
    case "related-company":
      if (!resource) return "deferred";
      if (!principal.companyId || !resource.companyId || !context.related) return "unknown";
      return context.related(principal.companyId, condition.relation, resource.companyId) ? "match" : "no-match";
    case "ticket-bound":
      if (!resource) return "deferred";
      if (!context.ticketId || !resource.ticketId) return "unknown";
      return context.ticketId === resource.ticketId ? "match" : "no-match";
    case "posture":
      if (!context.posture) return "unknown";
      return context.posture === condition.required ? "match" : "no-match";
    case "client":
      return condition.clientIds.includes(request.clientId) ? "match" : "no-match";
    case "not": {
      const inner = evaluate(condition.condition, request);
      return inner === "match" ? "no-match" : inner === "no-match" ? "match" : inner;
    }
    case "any": {
      const results = condition.conditions.map((c) => evaluate(c, request));
      if (results.includes("match")) return "match";
      if (results.includes("unknown")) return "unknown";
      if (results.includes("deferred")) return "deferred";
      return "no-match";
    }
  }
}

/** All conditions together. Returns the deferred ones too, so they become obligations. */
function evaluateAll(conditions: Condition[] | undefined, request: PolicyRequest): { result: Tri; deferred: Condition[] } {
  const deferred: Condition[] = [];
  let unknown = false;
  for (const condition of conditions ?? []) {
    const result = evaluate(condition, request);
    if (result === "no-match") return { result: "no-match", deferred: [] };
    if (result === "unknown") unknown = true;
    if (result === "deferred") deferred.push(condition);
  }
  if (unknown) return { result: "unknown", deferred: [] };
  return { result: deferred.length ? "deferred" : "match", deferred };
}

/** The highest level the token's scopes allow. With no token (preview), scopes don't limit. */
export function scopeCeiling(scopes: string[] | null): Access {
  if (scopes === null) return "manage";
  let ceiling: Access = "none";
  for (const [level, scope] of Object.entries(SCOPES) as [Exclude<Access, "none">, string][]) {
    if (scopes.includes(scope)) ceiling = maxAccess(ceiling, level);
  }
  return ceiling;
}

interface Evaluation {
  datasets: Record<string, DatasetAccess>;
  toolGrants: Map<string, string[]>;
  toolForbids: string[];
  obligations: Obligation[];
}

function evaluatePolicies(policies: Policy[], request: PolicyRequest, datasetIds: string[]): Evaluation {
  const datasets: Record<string, DatasetAccess> = {};
  for (const id of datasetIds) datasets[id] = { level: "none", grantedBy: [], cappedBy: [] };
  const toolGrants = new Map<string, string[]>();
  const toolForbids: string[] = [];
  const obligations: Obligation[] = [];

  // Permits first: each dataset gets the highest level any matching permit grants.
  for (const policy of policies) {
    if (policy.effect !== "permit" || !targetMatchesWho(policy.target, request)) continue;
    const { result, deferred } = evaluateAll(policy.when, request);
    if (result === "no-match" || result === "unknown") continue;
    const granted = Object.keys(policy.grant.datasets ?? {}).filter((id) => id in datasets);
    for (const condition of deferred) obligations.push({ policyId: policy.id, effect: "permit", condition, datasetIds: granted });
    for (const id of granted) {
      const level = policy.grant.datasets![id];
      if (level === "none") continue;
      datasets[id].level = maxAccess(datasets[id].level, level);
      datasets[id].grantedBy.push(policy.id);
    }
    for (const tool of policy.grant.tools ?? []) toolGrants.set(tool, [...(toolGrants.get(tool) ?? []), policy.id]);
  }

  // Then forbids, which only ever lower what permits gave.
  for (const policy of policies) {
    if (policy.effect !== "forbid" || !targetMatchesWho(policy.target, request)) continue;
    const { result, deferred } = evaluateAll(policy.when, request);
    if (result === "no-match") continue;

    if (isToolForbid(policy)) {
      if (!targetMatchesTool(policy.target, request.tool)) continue;
      if (result === "deferred") {
        for (const condition of deferred) obligations.push({ policyId: policy.id, effect: "forbid", condition, datasetIds: request.tool?.datasetIds ?? [] });
        continue;
      }
      toolForbids.push(policy.id);
      continue;
    }

    const capped = (policy.target.datasetIds ?? datasetIds).filter((id) => id in datasets);
    if (result === "deferred") {
      for (const condition of deferred) obligations.push({ policyId: policy.id, effect: "forbid", condition, datasetIds: capped });
      continue;
    }
    const ceiling = policy.maxAccess ?? "none";
    for (const id of capped) {
      if (ACCESS_RANK[datasets[id].level] > ACCESS_RANK[ceiling]) {
        datasets[id].level = ceiling;
        datasets[id].cappedBy.push(policy.id);
      }
    }
  }

  return { datasets, toolGrants, toolForbids, obligations };
}

/**
 * Each dataset's effective level for one person and client, before any token
 * scope is applied. Used by Preview as and to filter what a server exposes.
 */
export function effectiveAccess(policies: Policy[], request: Omit<PolicyRequest, "tool">, datasetIds: string[]) {
  const { datasets, obligations } = evaluatePolicies(policies, { ...request, tool: undefined }, datasetIds);
  return { datasets, obligations };
}

function allowed(evaluation: Evaluation, determining: string[], reason: string): Decision {
  return {
    allow: true,
    code: "allowed",
    reason,
    determiningPolicies: [...new Set(determining)],
    datasets: evaluation.datasets,
    obligations: evaluation.obligations,
  };
}

function denied(evaluation: Evaluation, code: Exclude<DecisionCode, "allowed">, reason: string, determining: string[] = [], requiredScope?: string): Decision {
  return {
    allow: false,
    code,
    reason,
    determiningPolicies: [...new Set(determining)],
    datasets: evaluation.datasets,
    obligations: evaluation.obligations,
    ...(requiredScope && { requiredScope }),
  };
}

/** Decides one tool use. Deny by default; forbids win; the token's scopes cap everything. */
export function decide(policies: Policy[], request: PolicyRequest & { tool: ToolRef }): Decision {
  const { tool } = request;
  const evaluation = evaluatePolicies(policies, request, tool.datasetIds);
  const needed = REQUIRED_ACCESS[tool.safety];

  if (evaluation.toolForbids.length) {
    return denied(evaluation, "forbidden", `${tool.name} is forbidden for this person or client`, evaluation.toolForbids);
  }

  if (tool.datasetIds.length === 0) {
    const grants = evaluation.toolGrants.get(tool.name);
    if (!grants) return denied(evaluation, "no_permit", `No policy grants ${tool.name}`);
    if (ACCESS_RANK[scopeCeiling(request.scopes)] < ACCESS_RANK[needed]) {
      return denied(evaluation, "insufficient_scope", `${tool.name} needs the ${SCOPES[needed as Exclude<Access, "none">]} scope`, grants, SCOPES[needed as Exclude<Access, "none">]);
    }
    return allowed(evaluation, grants, `Granted by ${grants.join(", ")}`);
  }

  const determining: string[] = [];
  for (const id of tool.datasetIds) {
    const access = evaluation.datasets[id];
    if (ACCESS_RANK[access.level] < ACCESS_RANK[needed]) {
      if (access.cappedBy.length) {
        return denied(evaluation, "forbidden", `${tool.name} needs ${needed} on ${id}, capped at ${access.level}`, access.cappedBy);
      }
      if (!access.grantedBy.length) return denied(evaluation, "no_permit", `No policy grants access to ${id}`);
      return denied(evaluation, "insufficient_access", `${tool.name} needs ${needed} on ${id}, granted ${access.level}`, access.grantedBy);
    }
    determining.push(...access.grantedBy);
  }

  if (ACCESS_RANK[scopeCeiling(request.scopes)] < ACCESS_RANK[needed]) {
    const scope = SCOPES[needed as Exclude<Access, "none">];
    return denied(evaluation, "insufficient_scope", `${tool.name} needs the ${scope} scope`, determining, scope);
  }

  return allowed(evaluation, determining, `Granted by ${[...new Set(determining)].join(", ")}`);
}

/** The tools a person may use, for filtering tools/list. The same decision runs again on every call. */
export function allowedTools<T extends ToolRef>(policies: Policy[], request: Omit<PolicyRequest, "tool">, tools: T[]): T[] {
  return tools.filter((tool) => decide(policies, { ...request, tool }).allow);
}
