import { hmacArguments, type AuditEvent, type AuditSink } from "./audit";
import { checkConsent, type ConsentStore } from "./consent";
import {
  allowedTools,
  decide,
  type Decision,
  type Obligation,
  type Policy,
  type PolicyContext,
  type Principal,
  type ResourceRef,
  type ToolRef,
} from "./policy";
import { bearerToken, resourceForSlug, verifyAccessToken, type KeyResolver, type VerifiedToken } from "./token";

/**
 * The single enforcement point for MCP requests. Every tools/list and every
 * tools/call goes through the same checks, in the same order, and each one
 * ends in an audit event:
 *
 * 1. The server exists and is enabled.
 * 2. A bearer token is present and valid for this exact server (audience),
 *    checked on this request. No session stands in for it.
 * 3. The person consented to this client on this server, for these scopes.
 * 4. The person's directory record, read now.
 * 5. The policy decision.
 *
 * tools/list only filters what the client sees. tools/call decides again with
 * the tool, and again per record through the returned obligations, because a
 * client can call a tool it was never shown.
 */

export interface RegisteredServer {
  slug: string;
  enabled: boolean;
  policies: Policy[];
  tools: ToolRef[];
}

export interface GuardDeps {
  /** Our authorization server's issuer. */
  issuer: string;
  /** Where servers live, e.g. https://webagent.dev/mcp. Each slug's resource is <base>/<slug>. */
  resourceBaseUrl: string;
  keys: KeyResolver;
  servers: { get(slug: string): RegisteredServer | undefined | Promise<RegisteredServer | undefined> };
  consent: ConsentStore;
  directory: { lookup(subject: { iss: string; sub: string }): Principal | undefined | Promise<Principal | undefined> };
  /** Relationship lookups for this request, preloaded from the relationship store. */
  related?: PolicyContext["related"];
  audit: AuditSink;
  /** Key for hashing tool arguments into the audit log. */
  auditKey: string;
  now?: () => number;
}

export interface GuardRequest {
  requestId: string;
  slug: string;
  authorization: string | null | undefined;
  /** Conversation context the server has verified itself, never taken from tool arguments. */
  context?: Pick<PolicyContext, "ticketId" | "posture">;
}

export interface ToolCallRequest extends GuardRequest {
  toolName: string;
  arguments?: unknown;
  /** The record the call touches, when the server has already loaded it. */
  resource?: ResourceRef;
}

/** An HTTP answer the route can return as is. */
export interface GuardRejection {
  ok: false;
  status: 401 | 403 | 404;
  /** Value for WWW-Authenticate, on 401 and on a scope step-up 403. */
  wwwAuthenticate?: string;
  /** Generic and safe to show: never says which check failed beyond the OAuth error code. */
  error: "invalid_request" | "invalid_token" | "insufficient_scope" | "access_denied" | "not_found";
}

export interface CallerContext {
  token: VerifiedToken;
  principal: Principal;
  server: RegisteredServer;
  /** The raw bearer token. Only for token exchange; never forward it (see delegation.ts). */
  rawToken: string;
}

export type ListResult = { ok: true; caller: CallerContext; tools: ToolRef[] } | GuardRejection;
export type CallResult = { ok: true; caller: CallerContext; tool: ToolRef; decision: Decision; obligations: Obligation[] } | GuardRejection;

/** Where clients find out how to get a token for this server (RFC 9728). */
export function resourceMetadataUrl(resourceBaseUrl: string, slug: string): string {
  const url = new URL(resourceForSlug(resourceBaseUrl, slug));
  return `${url.origin}/.well-known/oauth-protected-resource${url.pathname}`;
}

function challenge(deps: GuardDeps, slug: string, extra: Record<string, string> = {}): string {
  const params = { resource_metadata: resourceMetadataUrl(deps.resourceBaseUrl, slug), ...extra };
  return `Bearer ${Object.entries(params)
    .map(([k, v]) => `${k}="${v.replace(/["\\]/g, "")}"`)
    .join(", ")}`;
}

type Authenticated = { ok: true; caller: CallerContext } | GuardRejection;

async function authenticate(
  deps: GuardDeps,
  request: GuardRequest,
  method: AuditEvent["method"],
  tool: string | undefined,
): Promise<Authenticated> {
  const base = { at: new Date(deps.now?.() ?? Date.now()).toISOString(), requestId: request.requestId, server: request.slug, method, tool };
  const reject = async (event: Omit<AuditEvent, keyof typeof base | "allow">, rejection: Omit<GuardRejection, "ok">): Promise<GuardRejection> => {
    await deps.audit.write({ ...base, allow: false, ...event });
    return { ok: false, ...rejection };
  };

  const server = await deps.servers.get(request.slug);
  if (!server || !server.enabled) {
    return reject({ stage: "registry", code: "unknown_server", reason: "No enabled server at this slug" }, { status: 404, error: "not_found" });
  }

  const raw = bearerToken(request.authorization);
  if (!raw) {
    return reject(
      { stage: "token", code: "missing_token", reason: "No bearer token" },
      { status: 401, error: "invalid_request", wwwAuthenticate: challenge(deps, request.slug) },
    );
  }

  const verified = await verifyAccessToken(raw, {
    issuer: deps.issuer,
    audience: resourceForSlug(deps.resourceBaseUrl, request.slug),
    keys: deps.keys,
    now: deps.now,
  });
  if (!verified.ok) {
    return reject(
      { stage: "token", code: verified.reason, reason: verified.detail },
      { status: 401, error: "invalid_token", wwwAuthenticate: challenge(deps, request.slug, { error: "invalid_token" }) },
    );
  }
  const token = verified.token;
  const who = { subject: token.subject, clientId: token.clientId, scopes: token.scopes };

  const consent = await checkConsent(
    deps.consent,
    { subject: token.subject, clientId: token.clientId, resource: resourceForSlug(deps.resourceBaseUrl, request.slug), scopes: token.scopes },
    deps.now?.() ?? Date.now(),
  );
  if (!consent.ok) {
    return reject(
      { ...who, stage: "consent", code: consent.reason, reason: consent.missing ? `Not consented: ${consent.missing.join(" ")}` : "This person hasn't approved this client here" },
      { status: 403, error: "access_denied" },
    );
  }

  const principal = await deps.directory.lookup(token.subject);
  if (!principal) {
    return reject({ ...who, stage: "directory", code: "unknown_person", reason: "No directory record" }, { status: 403, error: "access_denied" });
  }

  return { ok: true, caller: { token, principal, server, rawToken: raw } };
}

function policyRequest(deps: GuardDeps, caller: CallerContext, request: GuardRequest) {
  return {
    principal: caller.principal,
    clientId: caller.token.clientId,
    scopes: caller.token.scopes,
    server: caller.server.slug,
    context: { now: new Date(deps.now?.() ?? Date.now()), related: deps.related, ...request.context },
  };
}

/** Guards tools/list: authenticates, then returns only the tools this person may use from this client. */
export async function guardToolsList(deps: GuardDeps, request: GuardRequest): Promise<ListResult> {
  const auth = await authenticate(deps, request, "tools/list", undefined);
  if (!auth.ok) return auth;
  const { caller } = auth;

  const tools = allowedTools(caller.server.policies, policyRequest(deps, caller, request), caller.server.tools);
  await deps.audit.write({
    at: new Date(deps.now?.() ?? Date.now()).toISOString(),
    requestId: request.requestId,
    server: request.slug,
    method: "tools/list",
    allow: true,
    stage: "policy",
    code: "listed",
    reason: `${tools.length} of ${caller.server.tools.length} tools`,
    subject: caller.token.subject,
    clientId: caller.token.clientId,
    scopes: caller.token.scopes,
    principal: caller.principal,
    toolsReturned: tools.map((t) => t.name),
  });
  return { ok: true, caller, tools };
}

/**
 * Guards tools/call. On success the caller must still honour the obligations,
 * for example filtering records to the person's own company, before returning
 * any data.
 */
export async function guardToolCall(deps: GuardDeps, request: ToolCallRequest): Promise<CallResult> {
  const auth = await authenticate(deps, request, "tools/call", request.toolName);
  if (!auth.ok) return auth;
  const { caller } = auth;

  const base = {
    at: new Date(deps.now?.() ?? Date.now()).toISOString(),
    requestId: request.requestId,
    server: request.slug,
    method: "tools/call" as const,
    tool: request.toolName,
    stage: "policy" as const,
    subject: caller.token.subject,
    clientId: caller.token.clientId,
    scopes: caller.token.scopes,
    principal: caller.principal,
    argumentsHmac: hmacArguments(deps.auditKey, request.arguments),
  };

  const tool = caller.server.tools.find((t) => t.name === request.toolName);
  if (!tool) {
    await deps.audit.write({ ...base, allow: false, code: "unknown_tool", reason: "The server has no such tool" });
    return { ok: false, status: 403, error: "access_denied" };
  }

  const decision = decide(caller.server.policies, { ...policyRequest(deps, caller, request), tool, resource: request.resource });
  await deps.audit.write({
    ...base,
    allow: decision.allow,
    code: decision.code,
    reason: decision.reason,
    determiningPolicies: decision.determiningPolicies,
    obligations: decision.obligations,
  });

  if (!decision.allow) {
    if (decision.code === "insufficient_scope" && decision.requiredScope) {
      // Step-up: tell the client which scope to ask the person for.
      return {
        ok: false,
        status: 403,
        error: "insufficient_scope",
        wwwAuthenticate: challenge(deps, request.slug, { error: "insufficient_scope", scope: decision.requiredScope }),
      };
    }
    return { ok: false, status: 403, error: "access_denied" };
  }
  return { ok: true, caller, tool, decision, obligations: decision.obligations };
}
