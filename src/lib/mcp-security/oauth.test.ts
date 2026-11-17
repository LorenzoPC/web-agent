import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MemoryConsentStore, checkConsent } from "./consent";
import { TokenPassthroughError, guardedFetch, httpTokenExchanger, tokenExchangeBody } from "./delegation";
import { checkRedirect, isRegisteredRedirectUri, redirectUriProblem, type RegisteredClient } from "./redirect";
import { MemoryStateStore, STATE_TTL_MS, consumeState, issueState } from "./state";

const alice = { iss: "https://idp.test", sub: "alice" };
const RESOURCE = "https://webagent.test/mcp/support-kb";

describe("per-client consent", () => {
  it("refuses a client the person never approved, even for the same person and server", async () => {
    const store = new MemoryConsentStore();
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read"], grantedAt: 0 });

    assert.ok((await checkConsent(store, { subject: alice, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read"] })).ok);
    const deputy = await checkConsent(store, { subject: alice, clientId: "evil-app", resource: RESOURCE, scopes: ["mcp:read"] });
    assert.deepEqual(deputy, { ok: false, reason: "no_consent" });
  });

  it("is per server: consent on one slug doesn't carry to another", async () => {
    const store = new MemoryConsentStore();
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read"], grantedAt: 0 });
    const other = await checkConsent(store, { subject: alice, clientId: "claude", resource: "https://webagent.test/mcp/billing", scopes: ["mcp:read"] });
    assert.equal(other.ok, false);
  });

  it("refuses scopes the person didn't approve for this client", async () => {
    const store = new MemoryConsentStore();
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read"], grantedAt: 0 });
    const result = await checkConsent(store, { subject: alice, clientId: "claude", resource: RESOURCE, scopes: ["mcp:read", "mcp:write"] });
    assert.deepEqual(result, { ok: false, reason: "scope_not_consented", missing: ["mcp:write"] });
  });

  it("honours expiry and revocation", async () => {
    const store = new MemoryConsentStore();
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: [], grantedAt: 0, expiresAt: 1000 });
    assert.equal((await checkConsent(store, { subject: alice, clientId: "claude", resource: RESOURCE, scopes: [] }, 2000)).ok, false);
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: [], grantedAt: 0 });
    assert.equal(await store.revoke(alice, "claude", RESOURCE), true);
    assert.equal((await checkConsent(store, { subject: alice, clientId: "claude", resource: RESOURCE, scopes: [] })).ok, false);
  });

  it("keeps people from different issuers apart", async () => {
    const store = new MemoryConsentStore();
    await store.put({ subject: alice, clientId: "claude", resource: RESOURCE, scopes: [], grantedAt: 0 });
    const impostor = { iss: "https://other-idp.test", sub: "alice" };
    assert.equal((await checkConsent(store, { subject: impostor, clientId: "claude", resource: RESOURCE, scopes: [] })).ok, false);
  });
});

describe("exact redirect URI matching", () => {
  const client: RegisteredClient = {
    clientId: "cursor",
    name: "Cursor",
    redirectUris: ["https://www.cursor.com/agents/mcp/oauth/callback", "http://localhost:8787/callback"],
  };

  it("accepts only exact registered strings", () => {
    assert.ok(isRegisteredRedirectUri(client, "https://www.cursor.com/agents/mcp/oauth/callback"));
    for (const uri of [
      "https://www.cursor.com/agents/mcp/oauth/callback?x=1",
      "https://www.cursor.com/agents/mcp/oauth/callback/",
      "https://www.cursor.com/agents/mcp/oauth/callback/extra",
      "https://WWW.cursor.com/agents/mcp/oauth/callback",
      "https://www.cursor.com:443/agents/mcp/oauth/callback",
      "https://www.cursor.com/agents/mcp/oauth/callback#frag",
      "http://localhost:8788/callback",
      "",
    ]) {
      assert.equal(isRegisteredRedirectUri(client, uri), false, uri);
    }
  });

  it("checks the client before the URI", async () => {
    const registry = { get: (id: string) => (id === "cursor" ? client : undefined) };
    assert.deepEqual(await checkRedirect(registry, "nobody", "http://localhost:8787/callback"), { ok: false, reason: "unknown_client" });
    assert.deepEqual(await checkRedirect(registry, "cursor", "http://localhost:8787/cb"), { ok: false, reason: "redirect_uri_mismatch" });
    assert.ok((await checkRedirect(registry, "cursor", "http://localhost:8787/callback")).ok);
  });

  it("refuses to register URIs that exact matching can't protect", () => {
    assert.equal(redirectUriProblem("https://app.example.com/cb"), null);
    assert.equal(redirectUriProblem("http://127.0.0.1:3000/cb"), null);
    assert.equal(redirectUriProblem("com.example.app:/oauth"), null);
    assert.ok(redirectUriProblem("https://*.example.com/cb"));
    assert.ok(redirectUriProblem("http://app.example.com/cb"));
    assert.ok(redirectUriProblem("https://app.example.com/cb#x"));
    assert.ok(redirectUriProblem("javascript:alert(1)"));
    assert.ok(redirectUriProblem("https://user:pw@app.example.com/cb"));
    assert.ok(redirectUriProblem("/relative"));
  });
});

describe("OAuth state", () => {
  const pending = { clientId: "claude", redirectUri: "https://claude.ai/api/mcp/auth_callback", resource: RESOURCE };

  it("issues 256-bit states and accepts each one once", async () => {
    const store = new MemoryStateStore();
    const state = await issueState(store, pending, 0);
    assert.equal(Buffer.from(state, "base64url").length, 32);
    assert.notEqual(state, await issueState(store, pending, 0));

    assert.ok((await consumeState(store, state, pending, 1000)).ok);
    assert.deepEqual(await consumeState(store, state, pending, 1000), { ok: false, reason: "unknown_state" });
  });

  it("rejects missing, forged, expired and mismatched states", async () => {
    const store = new MemoryStateStore();
    assert.deepEqual(await consumeState(store, undefined, pending), { ok: false, reason: "missing_state" });
    assert.deepEqual(await consumeState(store, "x".repeat(43), pending), { ok: false, reason: "unknown_state" });

    const old = await issueState(store, pending, 0);
    assert.deepEqual(await consumeState(store, old, pending, STATE_TTL_MS + 1), { ok: false, reason: "expired_state" });

    const swapped = await issueState(store, pending, 0);
    assert.deepEqual(await consumeState(store, swapped, { ...pending, clientId: "evil-app" }, 1), { ok: false, reason: "state_mismatch" });
    // A failed attempt still burns the state.
    assert.deepEqual(await consumeState(store, swapped, pending, 1), { ok: false, reason: "unknown_state" });
  });

  it("binds a state to the browser that started the flow", async () => {
    const store = new MemoryStateStore();
    const state = await issueState(store, { ...pending, browserBinding: "cookie-a" }, 0);
    assert.deepEqual(await consumeState(store, state, { ...pending, browserBinding: "cookie-b" }, 1), { ok: false, reason: "state_mismatch" });
  });
});

describe("no token passthrough", () => {
  it("builds an RFC 8693 exchange for one audience", () => {
    const body = tokenExchangeBody({ subjectToken: "inbound", audience: "https://api.github.com", scopes: ["repo:read"] });
    assert.equal(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:token-exchange");
    assert.equal(body.get("subject_token"), "inbound");
    assert.equal(body.get("audience"), "https://api.github.com");
    assert.equal(body.get("scope"), "repo:read");
  });

  it("refuses to send the inbound token downstream", async () => {
    const calls: unknown[] = [];
    const fake = (async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}");
    }) as typeof fetch;
    const safeFetch = guardedFetch("inbound-token", fake);

    await assert.rejects(() => safeFetch("https://api.test", { headers: { authorization: "Bearer inbound-token" } }), TokenPassthroughError);
    await assert.rejects(() => safeFetch(new Request("https://api.test", { headers: { "x-token": "inbound-token" } })), TokenPassthroughError);
    await safeFetch("https://api.test", { headers: { authorization: "Bearer exchanged-token" } });
    assert.equal(calls.length, 1);
  });

  it("refuses an exchange that hands back the same token", async () => {
    const exchanger = httpTokenExchanger({
      tokenEndpoint: "https://auth.test/token",
      clientId: "mcp-server",
      clientSecret: "s",
      fetch: (async () => Response.json({ access_token: "inbound", expires_in: 60 })) as typeof fetch,
    });
    await assert.rejects(() => exchanger.exchange({ subjectToken: "inbound", audience: "https://api.test", scopes: [] }));
  });
});
