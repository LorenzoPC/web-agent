import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MemoryAuditSink, verifyAuditChain } from "./audit";
import { MemoryConsentStore } from "./consent";
import { guardToolCall, guardToolsList, type GuardDeps, type RegisteredServer } from "./guard";
import type { Principal } from "./policy";
import { BASE, ISSUER, KID, NOW, RESOURCE, SLUG, claims, makeKeys, signToken } from "./test-helpers";

const { publicKey, privateKey } = makeKeys();

const server: RegisteredServer = {
  slug: SLUG,
  enabled: true,
  tools: [
    { name: "get_ticket", safety: "read", datasetIds: ["tickets"] },
    { name: "update_ticket", safety: "write", datasetIds: ["tickets"] },
    { name: "delete_ticket", safety: "destructive", datasetIds: ["tickets"] },
  ],
  policies: [
    { id: "support", effect: "permit", description: "", target: { unitIds: ["customer-support"] }, grant: { datasets: { tickets: "write" } } },
  ],
};

const alice: Principal = { id: "alice", audience: "internal", unitId: "customer-support", departmentId: null, companyId: null, roles: [] };

let audit: MemoryAuditSink;
let consent: MemoryConsentStore;
let deps: GuardDeps;

beforeEach(async () => {
  audit = new MemoryAuditSink();
  consent = new MemoryConsentStore();
  await consent.put({ subject: { iss: ISSUER, sub: "user-123" }, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read", "mcp:write"], grantedAt: 0 });
  deps = {
    issuer: ISSUER,
    resourceBaseUrl: BASE,
    keys: (kid) => (kid === KID ? publicKey : undefined),
    servers: { get: (slug) => (slug === SLUG ? server : undefined) },
    consent,
    directory: { lookup: (s) => (s.sub === "user-123" ? alice : undefined) },
    audit,
    auditKey: "test-audit-key",
    now: () => NOW,
  };
});

const bearer = (overrides: Record<string, unknown> = {}) => `Bearer ${signToken(privateKey, claims(overrides))}`;

describe("guard", () => {
  it("answers 401 with resource metadata when there's no token", async () => {
    const result = await guardToolsList(deps, { requestId: "r1", slug: SLUG, authorization: null });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
    assert.equal(result.wwwAuthenticate, 'Bearer resource_metadata="https://webagent.test/.well-known/oauth-protected-resource/mcp/support-kb"');
  });

  it("answers 404 for an unknown slug before looking at the token", async () => {
    const result = await guardToolsList(deps, { requestId: "r1", slug: "nope", authorization: bearer() });
    assert.equal(result.ok ? null : result.status, 404);
  });

  it("rejects a token for another server", async () => {
    const result = await guardToolsList(deps, { requestId: "r1", slug: SLUG, authorization: bearer({ aud: `${BASE}/billing` }) });
    assert.equal(result.ok ? null : result.error, "invalid_token");
    assert.equal(audit.events[0].code, "wrong_audience");
  });

  it("stops a confused deputy: same person, a client they never approved", async () => {
    const result = await guardToolsList(deps, { requestId: "r1", slug: SLUG, authorization: bearer({ client_id: "evil-app" }) });
    assert.equal(result.ok ? null : result.status, 403);
    assert.equal(audit.events[0].stage, "consent");
  });

  it("refuses people with no directory record", async () => {
    await consent.put({ subject: { iss: ISSUER, sub: "ghost" }, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read", "mcp:write"], grantedAt: 0 });
    const result = await guardToolsList(deps, { requestId: "r1", slug: SLUG, authorization: bearer({ sub: "ghost" }) });
    assert.equal(result.ok ? null : result.status, 403);
    assert.equal(audit.events[0].stage, "directory");
  });

  it("lists only the tools the policy allows", async () => {
    const result = await guardToolsList(deps, { requestId: "r1", slug: SLUG, authorization: bearer() });
    assert.ok(result.ok);
    assert.deepEqual(result.tools.map((t) => t.name), ["get_ticket", "update_ticket"]);
  });

  it("decides again on a call, even for a tool that was never listed", async () => {
    const result = await guardToolCall(deps, { requestId: "r2", slug: SLUG, authorization: bearer(), toolName: "delete_ticket" });
    assert.equal(result.ok ? null : result.status, 403);
    assert.equal(audit.events[0].code, "insufficient_access");
  });

  it("asks for a step-up when the token's scope is too narrow", async () => {
    await consent.put({ subject: { iss: ISSUER, sub: "user-123" }, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read"], grantedAt: 0 });
    const result = await guardToolCall(deps, { requestId: "r3", slug: SLUG, authorization: bearer({ scope: "mcp:read" }), toolName: "update_ticket" });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "insufficient_scope");
    assert.match(result.wwwAuthenticate ?? "", /scope="mcp:write"/);
  });

  it("allows a permitted call and returns the caller, without the token in the audit log", async () => {
    const authorization = bearer();
    const result = await guardToolCall(deps, {
      requestId: "r4",
      slug: SLUG,
      authorization,
      toolName: "update_ticket",
      arguments: { ticketId: "T-1", note: "customer card number 4111" },
    });
    assert.ok(result.ok);
    assert.deepEqual(result.decision.determiningPolicies, ["support"]);
    const logged = JSON.stringify(audit.events);
    assert.equal(logged.includes("4111"), false);
    assert.equal(logged.includes(authorization.slice(7)), false);
    assert.ok(audit.events[0].argumentsHmac);
  });

  it("writes one hash-chained audit event per request, and detects tampering", async () => {
    await guardToolsList(deps, { requestId: "a", slug: SLUG, authorization: null });
    await guardToolsList(deps, { requestId: "b", slug: SLUG, authorization: bearer() });
    await guardToolCall(deps, { requestId: "c", slug: SLUG, authorization: bearer(), toolName: "get_ticket" });
    assert.equal(audit.events.length, 3);
    assert.equal(verifyAuditChain(audit.events), -1);

    audit.events[1] = { ...audit.events[1], allow: false };
    assert.equal(verifyAuditChain(audit.events), 1);
  });

  it("applies a revoked consent on the next request, without waiting for the token to expire", async () => {
    const authorization = bearer();
    assert.ok((await guardToolsList(deps, { requestId: "x", slug: SLUG, authorization })).ok);
    await consent.revoke({ iss: ISSUER, sub: "user-123" }, "claude", RESOURCE);
    assert.equal((await guardToolsList(deps, { requestId: "y", slug: SLUG, authorization })).ok, false);
  });
});
