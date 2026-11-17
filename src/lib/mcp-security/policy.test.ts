import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BLANK_MCP_SERVER, MCP_CATALOG_TOOLS, type McpServerDraft } from "../mock-mcp-server-data";
import { draftPolicies, draftTools, previewPrincipal } from "./from-draft";
import { allowedTools, decide, effectiveAccess, type Policy, type PolicyRequest, type Principal, type ToolRef } from "./policy";
import { NOW } from "./test-helpers";

const agent: Principal = { id: "p1", audience: "internal", unitId: "customer-support", departmentId: "support-tier-1", companyId: null, roles: ["support-agent"] };

function request(overrides: Partial<PolicyRequest> = {}): PolicyRequest {
  return { principal: agent, clientId: "claude", scopes: null, server: "support-kb", context: { now: new Date(NOW) }, ...overrides };
}

const getTicket: ToolRef = { name: "get_ticket", safety: "read", datasetIds: ["tickets"] };
const updateTicket: ToolRef = { name: "update_ticket", safety: "write", datasetIds: ["tickets"] };
const deleteTicket: ToolRef = { name: "delete_ticket", safety: "destructive", datasetIds: ["tickets"] };
const webSearch: ToolRef = { name: "web_search", safety: "read", datasetIds: [] };

const supportRead: Policy = { id: "support-read", effect: "permit", description: "", target: { audiences: ["internal"], unitIds: ["customer-support"] }, grant: { datasets: { tickets: "read" } } };
const tier1Write: Policy = { id: "tier1-write", effect: "permit", description: "", target: { departmentIds: ["support-tier-1"] }, grant: { datasets: { tickets: "write" } } };

describe("decide", () => {
  it("denies by default", () => {
    const decision = decide([], { ...request(), tool: getTicket });
    assert.equal(decision.allow, false);
    assert.equal(decision.code, "no_permit");
  });

  it("takes the highest grant across matching policies, and names them", () => {
    const decision = decide([supportRead, tier1Write], { ...request(), tool: updateTicket });
    assert.ok(decision.allow);
    assert.deepEqual(decision.datasets.tickets.grantedBy, ["support-read", "tier1-write"]);
    assert.deepEqual(decision.determiningPolicies, ["support-read", "tier1-write"]);
  });

  it("adding a permit never removes access", () => {
    const narrower: Policy = { id: "tier1-none", effect: "permit", description: "", target: { departmentIds: ["support-tier-1"] }, grant: { datasets: { tickets: "none" } } };
    assert.ok(decide([supportRead, narrower], { ...request(), tool: getTicket }).allow);
  });

  it("lets a forbid cap any grant, and names it", () => {
    const cap: Policy = { id: "no-writes", effect: "forbid", description: "", target: { audiences: ["internal"] }, maxAccess: "read" };
    const decision = decide([supportRead, tier1Write, cap], { ...request(), tool: updateTicket });
    assert.equal(decision.code, "forbidden");
    assert.deepEqual(decision.determiningPolicies, ["no-writes"]);
    assert.ok(decide([supportRead, tier1Write, cap], { ...request(), tool: getTicket }).allow);
  });

  it("applies tool forbids by name or safety, per client", () => {
    const noCursorDeletes: Policy = { id: "no-cursor-deletes", effect: "forbid", description: "", target: { clientIds: ["cursor"], safeties: ["destructive"] } };
    const manage: Policy = { id: "manage", effect: "permit", description: "", target: {}, grant: { datasets: { tickets: "manage" } } };
    assert.ok(decide([manage, noCursorDeletes], { ...request(), tool: deleteTicket }).allow);
    assert.equal(decide([manage, noCursorDeletes], { ...request({ clientId: "cursor" }), tool: deleteTicket }).code, "forbidden");
  });

  it("needs an explicit grant for tools that touch no dataset", () => {
    assert.equal(decide([supportRead], { ...request(), tool: webSearch }).code, "no_permit");
    const grant: Policy = { id: "search", effect: "permit", description: "", target: { audiences: ["internal"] }, grant: { tools: ["web_search"] } };
    assert.ok(decide([supportRead, grant], { ...request(), tool: webSearch }).allow);
  });

  it("caps by token scope and says which scope would allow the call", () => {
    const decision = decide([supportRead, tier1Write], { ...request({ scopes: ["mcp:read"] }), tool: updateTicket });
    assert.equal(decision.code, "insufficient_scope");
    assert.equal(decision.requiredScope, "mcp:write");
    // A broad scope alone grants nothing: the server's policy still decides.
    assert.equal(decide([], { ...request({ scopes: ["mcp:manage"] }), tool: getTicket }).allow, false);
  });

  it("evaluates time windows in the policy's time zone", () => {
    const hours: Policy = {
      ...supportRead,
      id: "business-hours",
      when: [{ kind: "time-window", timeZone: "America/Toronto", days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }],
    };
    assert.ok(decide([hours], { ...request(), tool: getTicket }).allow); // Tue 10:00 Toronto
    const night = request({ context: { now: new Date(Date.UTC(2026, 10, 18, 3, 0)) } }); // Tue 22:00 Toronto
    assert.equal(decide([hours], { ...night, tool: getTicket }).allow, false);
  });

  it("fails closed when a condition can't be evaluated", () => {
    const badZone = { kind: "time-window" as const, timeZone: "Mars/Olympus", days: [0, 1, 2, 3, 4, 5, 6], from: "00:00", to: "23:59" };
    // A permit with an unknowable condition grants nothing...
    assert.equal(decide([{ ...supportRead, when: [badZone] }], { ...request(), tool: getTicket }).allow, false);
    // ...and a forbid with one still applies.
    const forbid: Policy = { id: "f", effect: "forbid", description: "", target: {}, when: [{ kind: "not", condition: badZone }] };
    assert.equal(decide([supportRead, forbid], { ...request(), tool: getTicket }).allow, false);
  });

  it("requires a compliant posture when a policy asks for one", () => {
    const posture: Policy = { ...supportRead, id: "posture", when: [{ kind: "posture", required: "compliant" }] };
    assert.equal(decide([posture], { ...request(), tool: getTicket }).allow, false);
    assert.ok(decide([posture], { ...request({ context: { now: new Date(NOW), posture: "compliant" } }), tool: getTicket }).allow);
  });
});

describe("record-level conditions", () => {
  const partner: Principal = { id: "p2", audience: "partners", unitId: null, departmentId: null, companyId: "acme", roles: [] };
  const partnerRead: Policy = { id: "partner-read", effect: "permit", description: "", target: { audiences: ["partners"] }, grant: { datasets: { tickets: "read" } } };
  const ownCompany: Policy = { id: "own-company", effect: "forbid", description: "", target: { audiences: ["partners"], datasetIds: ["tickets"] }, when: [{ kind: "not", condition: { kind: "same-company" } }] };

  it("defers to the record when listing, and returns the check as an obligation", () => {
    const decision = decide([partnerRead, ownCompany], { ...request({ principal: partner }), tool: getTicket });
    assert.ok(decision.allow);
    assert.equal(decision.obligations.length, 1);
    assert.equal(decision.obligations[0].policyId, "own-company");
  });

  it("enforces it once the record is known", () => {
    const base = { ...request({ principal: partner }), tool: getTicket };
    assert.ok(decide([partnerRead, ownCompany], { ...base, resource: { companyId: "acme" } }).allow);
    assert.equal(decide([partnerRead, ownCompany], { ...base, resource: { companyId: "globex" } }).allow, false);
    assert.equal(decide([partnerRead, ownCompany], { ...base, resource: { companyId: null } }).allow, false);
  });

  it("follows company relationships", () => {
    const reseller: Principal = { ...partner, audience: "resellers", companyId: "resellco" };
    const resold: Policy = { id: "resold", effect: "permit", description: "", target: { audiences: ["resellers"] }, when: [{ kind: "related-company", relation: "reseller-of" }], grant: { datasets: { tickets: "read" } } };
    const related = (a: string, rel: string, b: string) => a === "resellco" && rel === "reseller-of" && b === "acme";
    const base = { ...request({ principal: reseller, context: { now: new Date(NOW), related } }), tool: getTicket };
    assert.ok(decide([resold], { ...base, resource: { companyId: "acme" } }).allow);
    assert.equal(decide([resold], { ...base, resource: { companyId: "globex" } }).allow, false);
  });

  it("limits a conversation to the ticket it's about", () => {
    const bound: Policy = { ...supportRead, id: "ticket-bound", when: [{ kind: "ticket-bound" }] };
    const base = { ...request({ context: { now: new Date(NOW), ticketId: "T-1" } }), tool: getTicket };
    assert.ok(decide([bound], { ...base, resource: { ticketId: "T-1" } }).allow);
    assert.equal(decide([bound], { ...base, resource: { ticketId: "T-2" } }).allow, false);
  });
});

describe("Create MCP server draft as policies", () => {
  const draft: McpServerDraft = {
    ...BLANK_MCP_SERVER,
    slug: "support-kb",
    datasetIds: ["tickets", "accounts", "help-center"],
    toolIds: ["catalog:tool-get-ticket", "catalog:tool-update-ticket", "catalog:tool-delete-ticket", "catalog:tool-issue-credit", "curated:tool-web-search"],
    rules: [
      { id: "a", audience: "internal", unitId: null, departmentId: null, access: { "help-center": "read" } },
      { id: "b", audience: "internal", unitId: "customer-support", departmentId: null, access: { tickets: "write" } },
      { id: "c", audience: "internal", unitId: "customer-support", departmentId: "support-tier-1", access: { "help-center": "read" }, tools: "read-only" },
      { id: "d", audience: "clients", unitId: null, departmentId: null, access: { tickets: "manage", accounts: "manage" } },
    ],
  };
  const policies = draftPolicies(draft, MCP_CATALOG_TOOLS);
  const tools = draftTools(draft, MCP_CATALOG_TOOLS);
  const req = (person: Parameters<typeof previewPrincipal>[0]) => ({ ...request(), principal: previewPrincipal(person) });

  it("adds a department rule to its unit's rule instead of replacing it", () => {
    const { datasets } = effectiveAccess(policies, req({ audience: "internal", unitId: "customer-support", departmentId: "support-tier-1" }), draft.datasetIds);
    assert.equal(datasets.tickets.level, "write");
  });

  it("treats a rule's Tools limit as a ceiling for everyone it covers", () => {
    const names = allowedTools(policies, req({ audience: "internal", unitId: "customer-support", departmentId: "support-tier-1" }), tools).map((t) => t.name);
    assert.deepEqual(names, ["get_ticket", "web_search"]);
    const tier2 = allowedTools(policies, req({ audience: "internal", unitId: "customer-support", departmentId: "support-tier-2" }), tools).map((t) => t.name);
    assert.deepEqual(tier2, ["get_ticket", "update_ticket", "web_search"]);
  });

  it("never gives external audiences Manage, whatever the rule says", () => {
    const decision = decide(policies, { ...req({ audience: "clients", unitId: null, departmentId: null }), tool: tools.find((t) => t.name === "issue_credit")! });
    assert.equal(decision.allow, false);
    assert.ok(decision.determiningPolicies.includes("ceiling:external-no-manage"));
  });

  it("scopes external audiences to their own company on tickets and accounts", () => {
    const decision = decide(policies, { ...req({ audience: "clients", unitId: null, departmentId: null }), tool: tools.find((t) => t.name === "get_ticket")! });
    assert.ok(decision.allow);
    assert.ok(decision.obligations.some((o) => o.policyId === "ceiling:own-company-only"));
  });

  it("gives an audience with no rule nothing", () => {
    assert.deepEqual(allowedTools(policies, req({ audience: "partners", unitId: null, departmentId: null }), tools), []);
  });
});
