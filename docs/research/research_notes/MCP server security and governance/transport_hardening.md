# Transport Security and Server Hardening for Remote, Multi-Tenant MCP Servers (as of Oct 2026)

Scope note: covers transport and server-side hardening for `https://webagent.dev/mcp/<slug>` (many tenant-owned servers on one Next.js/Vercel deployment). OAuth flow details, prompt injection or tool poisoning, and data governance are out of scope except where they affect hardening.

**Version map (important for the ADR):**
- **2026-07-28** is the current spec revision; `/specification/latest/` resolves to it. It made MCP stateless. It removed `Mcp-Session-Id`, the `initialize` handshake, the GET SSE stream and SSE resumability, and it moved tasks into an extension.
- **2025-11-25**, **2025-06-18** and **2025-03-26** are the stateful-capable Streamable HTTP era.
- **2024-11-05** is the HTTP+SSE transport, now Deprecated.

Guidance below is labeled by version.

---

## Q1. What does the current MCP spec say about Streamable HTTP transport security (Origin and DNS rebinding, sessions and hijacking, stateless vs stateful, resumability, HTTP+SSE deprecation)?

### Takeaway
The 2026-07-28 spec removed protocol-level sessions, resumability and the GET stream, so a remote server is stateless by design. Its transport-security baseline is:
- `Origin` validation, with 403 for a present but invalid Origin.
- Authentication on every request.
- Strict validation that the new mirrored HTTP headers (`MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name`, `Mcp-Param-*`) match the JSON body, with 400 `HeaderMismatch` on any mismatch.
- Per-request cancellation, where closing the stream cancels the request.

Session-ID hygiene rules (2025-11-25 and earlier) matter only for backward compatibility. Their successor is "state handle" hygiene.

### Cited Findings
**Origin, DNS rebinding and binding (unchanged between 2025-11-25 and 2026-07-28)**
- 2026-07-28: "Servers **MUST** validate the `Origin` header on all incoming connections to prevent DNS rebinding attacks." If the Origin header "is present and invalid, servers **MUST** respond with HTTP 403 Forbidden"; the body MAY be a JSON-RPC error with no `id`. Local servers SHOULD bind only to 127.0.0.1, and "Servers **SHOULD** implement proper authentication for all connections." — [MCP 2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- The identical "Security Warning" text appears in 2025-11-25. — [MCP 2025-11-25 Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

**2026-07-28 transport shape (stateless)**
- The server MUST expose a single MCP endpoint that supports POST. Every client message is a new POST. The client MUST send `Accept: application/json, text/event-stream`. The body MUST be a single JSON-RPC request or notification, and clients MUST NOT send responses. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- On an SSE response stream, the server "**MUST NOT** send independent JSON-RPC *requests*." Sampling, elicitation and roots are embedded as `InputRequiredResult` (Multi Round-Trip Requests, MRTR, SEP-2322). The spec calls this "a change from Streamable HTTP in protocol versions `2025-03-26` through `2025-11-25`." — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- "Resumable SSE streams via `Last-Event-ID` are not supported." Long-lived change notifications come only via a `subscriptions/listen` POST whose response is an open SSE stream. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- Cancellation: "Closing the SSE response stream **MUST** be treated by the server as cancellation of that request." The server SHOULD stop work as soon as practical and MUST NOT send further messages for that request. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- Servers SHOULD send `X-Accel-Buffering: no` on SSE responses. For long-lived streams (`subscriptions/listen`) they are encouraged to emit SSE comment keep-alives (`:\r\n`) so intermediaries do not close idle connections. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

**Statelessness rules (2026-07-28)**
- "MCP is a **stateless protocol**: all the information needed to process a request is contained in the request itself."
- Servers "**MUST NOT** rely on prior requests over the same connection to establish context (e.g., capabilities, protocol version, client identity)."
- State spanning requests "**MUST** be referenced by an explicit identifier the client passes on each request."

  — [MCP 2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- Every request carries `_meta` with `io.modelcontextprotocol/protocolVersion` (required) and `clientCapabilities` (required). A missing required field MUST be rejected with -32602 and HTTP 400. — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- `clientInfo` and `serverInfo` "are self-reported by the sender and are not verified by the protocol… **SHOULD NOT** rely on them for security decisions." — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)

**Changelog items (2026-07-28)**
- Sessions and `Mcp-Session-Id` were removed (SEP-2567). The `initialize` handshake was removed (SEP-2575). `server/discover` is now MUST-implement. The GET endpoint was replaced by `subscriptions/listen`.
- "Remove SSE stream resumability and message redelivery… A broken response stream loses the in-flight request; clients **MUST** re-issue it as a new request with a new request ID" (SEP-2575).
- Tasks moved to the extension `io.modelcontextprotocol/tasks` (SEP-2663).
- Roots, Sampling and Logging are Deprecated (SEP-2577).
- Dynamic Client Registration is deprecated in favor of Client ID Metadata Documents (CIMD).

  — [MCP 2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

**Mirrored request headers (new in 2026-07-28, SEP-2243)**
- Every POST MUST include `MCP-Protocol-Version`, and its value MUST match the body `_meta` version; a mismatch gets 400 plus `HeaderMismatch`. An unsupported version gets 400 plus `UnsupportedProtocolVersionError`. An unknown method gets 404 plus -32601. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- `Mcp-Method` is required on all requests. `Mcp-Name` is required for `tools/call`, `resources/read` and `prompts/get`.
- "Servers that process the request body **MUST** reject requests where the values specified in the headers do not match the corresponding values in the request body. This prevents potential security vulnerabilities when… a load balancer rout[es] on the header value while the MCP server executes based on the body value." The error is 400 with code -32020 `HeaderMismatch`.

  — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- "Intermediaries that enforce policy based on mirrored headers (e.g., routing or rate-limiting by tenant) **SHOULD** verify that the `MCP-Protocol-Version` header indicates a version that requires header–body validation. If the version is older or the header is absent, the intermediary **SHOULD** reject the request rather than trusting unvalidated header values." — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- `x-mcp-header` lets a tool's schema mirror a primitive parameter into `Mcp-Param-{Name}`. Values that are not safe ASCII are carried as Base64 sentinel values (`=?base64?…?=`). Servers MUST decode before comparing, and MUST reject invalid characters. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- "Server developers **SHOULD NOT** mark sensitive parameters (passwords, API keys, tokens, PII) with `x-mcp-header`, as header values are visible to network intermediaries." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

**Backward compatibility (2026-07-28 server receiving older traffic)**
- GET or DELETE gets 405.
- An `Mcp-Session-Id` header should be ignored: "do not mint or echo session IDs."
- A `Last-Event-ID` header should be ignored.
- Clients probe the server's era by POSTing a modern request and inspecting the 400 body.

  — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)

**2025-11-25 session and resumability rules (legacy era, still relevant for older clients)**
- A session ID "**SHOULD** be globally unique and cryptographically secure (e.g., a securely generated UUID, a JWT, or a cryptographic hash)" and "**MUST** only contain visible ASCII characters (0x21 to 0x7E)."
- After termination the server MUST return 404 for that ID. Clients SHOULD send DELETE to end a session, and servers MAY answer 405.

  — [MCP 2025-11-25 Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- In 2025-11-25, a disconnect "**SHOULD NOT** be interpreted as the client cancelling its request". Clients cancel with `CancelledNotification`. This is the opposite of 2026-07-28. — [MCP 2025-11-25 Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- 2025-11-25 resumability: event IDs MUST be globally unique per session, and they act as a per-stream cursor. The server "**MUST NOT** replay messages that would have been delivered on a different stream." — [MCP 2025-11-25 Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
- 2025-11-25: if the `MCP-Protocol-Version` header is missing, the server SHOULD assume `2025-03-26`. An invalid or unsupported version MUST get 400. — [MCP 2025-11-25 Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

**HTTP+SSE deprecation**
- HTTP+SSE (2024-11-05) "has been deprecated since protocol version `2025-03-26`." In 2026-07-28 it is classified as Deprecated under the feature lifecycle policy (SEP-2596). "New implementations **SHOULD NOT** adopt it… It is eligible for removal in a future revision." — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- The lifecycle policy sets "a minimum twelve-month deprecation window." — [2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

### Inferences
- For `webagent.dev/mcp/<slug>`, target 2026-07-28 natively and accept 2025-era clients only through a stateless fallback that mints no session IDs and returns 405 for GET and DELETE. mcp-handler 2.x already behaves this way (see Q6). This removes the whole session-hijack and resumption-poisoning class at the transport layer.
- Origin handling for a public SaaS endpoint: hosted clients such as Claude and ChatGPT call from vendor backends and likely send no `Origin` header. The spec's MUST applies to a *present* Origin. Allowlist expected browser origins (for example the web-agent app itself and MCP Inspector during development) and return 403 for anything else. Never pair `Access-Control-Allow-Origin: *` with credentials. This is my inference, not spec text.
- Header-body validation is a security control, not a formality. If rate limiting or tenant routing at the edge (WAF) keys on `Mcp-Name` or `Mcp-Param-*`, the origin must still enforce the header-body match. Otherwise an attacker sends a benign header with a harmful body.
- Because 2026-07-28 drops redelivery and a dropped stream means "re-issue as a new request", side-effecting tools such as `send_email` or `create_ticket` need server-side idempotency keys to avoid duplicates on retry.

### Gaps
- I did not confirm which protocol versions Claude, ChatGPT and other major clients send as of Oct 2026. Whether the 2025-era fallback must stay enabled, and for how long, is unverified. The extension client matrix exists at https://modelcontextprotocol.io/extensions/client-matrix but was not fetched.
- I did not fetch the 2026-07-28 authorization page, so the exact canonical-URI and audience rules per server URL are not quoted here; another researcher covers authorization.

---

## Q2. What does the MCP "Security Best Practices" page list, and which items apply to a hosted multi-tenant server?

### Takeaway
The current page (2026-07-28) covers: Confused Deputy; Token Passthrough; SSRF (including SSRF against authorization servers via CIMD); **State Handle Hijacking**, which replaces "Session Hijacking"; Local MCP Server Compromise; OAuth Authorization URL Validation; stdio in proxy scenarios; Mix-Up Attacks; Localhost Redirect URI Impersonation; CIMD Trust Policies; and Scope Minimization. For a hosted multi-tenant server, the directly applicable items are token passthrough, confused deputy (if we proxy OAuth to third parties), state-handle hijacking, scope minimization, and SSRF (as an authorization server fetching CIMD URLs, and by extension in any URL-fetching tool).

### Cited Findings
- **Confused deputy:** the attack applies to "MCP proxy servers that connect to third-party APIs" when four conditions hold: the proxy uses a static client ID, clients can dynamically register, the third-party authorization server sets a consent cookie, and the proxy has no per-client consent. Mitigation: proxies "**MUST** implement per-client consent." The detailed MUSTs are:
  - a per-user registry of approved `client_id` values, checked before third-party authorization;
  - a consent UI that names the client, the scopes and the `redirect_uri`, with CSRF protection and `frame-ancestors`/`X-Frame-Options: DENY`;
  - consent cookies that use the `__Host-` prefix, are `Secure`, `HttpOnly` and `SameSite=Lax`, are signed, and are bound to the client_id;
  - exact-match `redirect_uri` validation;
  - a single-use `state` with a short TTL (e.g., 10 min), set only after consent.

  — [MCP Security Best Practices (latest = 2026-07-28)](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **Token passthrough:** "MCP servers **MUST NOT** accept any tokens that were not explicitly issued for the MCP server." The listed risks are security-control circumvention (rate limits and validation keyed to audience), loss of accountability and audit, trust-boundary breaks, and use of the server "as a proxy for data exfiltration." — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **SSRF:** framed mainly as a client risk during OAuth discovery. Mitigations: enforce HTTPS; block 10/8, 172.16/12, 192.168/16, 127/8, ::1, 169.254/16 (cloud metadata), fc00::/7 and fe80::/10; validate each redirect hop; use egress proxies such as Stripe Smokescreen; pin DNS between check and use (TOCTOU). It also warns: "Avoid implementing IP validation manually. Attackers exploit encoding tricks (octal, hex, IPv4-mapped IPv6)." — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **SSRF against authorization servers (new in 2026-07-28):** an authorization server supporting CIMD "takes a URL as input from an unknown client and fetches that URL". The same mitigations apply. — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **State Handle Hijacking (2026-07-28):** "MCP is stateless and has no protocol-level sessions." The rules are:
  - "MCP servers that implement authorization **MUST** verify all inbound requests. MCP servers **MUST NOT** treat possession of a state handle as authentication."
  - Handles SHOULD be generated with a secure random number generator and expire.
  - Servers "**SHOULD** bind handles server-side to the authenticated user, for example by keying stored state as `<user_id>:<handle>` where the user ID is derived from the verified token."

  — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **Session Hijacking (2025-11-25 version, legacy):** describes "Session Hijack Prompt Injection" across multiple stateful servers sharing a queue keyed by session ID (Server B enqueues an attacker's event; Server A delivers it via resumed SSE), and "Session Hijack Impersonation." Mitigations: "**MUST NOT** use sessions for authentication," "**MUST** use secure, non-deterministic session IDs," and "**SHOULD** bind session IDs to user-specific information… `<user_id>:<session_id>`." — [MCP Security Best Practices 2025-11-25](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices)
- **Local MCP Server Compromise:** covers malicious startup commands, malicious payloads, and DNS rebinding to localhost servers. Mitigations are mostly client consent and sandboxing. Servers meant to run locally SHOULD use stdio, or HTTP with an authorization token or Unix domain sockets. — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **Scope minimization:** use a minimal initial scope set (e.g., `mcp:tools-basic`), step up via `WWW-Authenticate scope=` challenges, and accept down-scoped tokens. Listed mistakes include "Publishing all possible scopes in `scopes_supported`," wildcard scopes, and "Treating claimed scopes in token as sufficient without server-side authorization logic." Servers should "Log elevation events… with correlation IDs." — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **Other sections new or expanded in 2026-07-28:**
  - OAuth Authorization URL Validation: clients MUST reject `javascript:`, `data:` and `file:` schemes, and MUST NOT open URLs via a shell.
  - stdio transport in proxy scenarios.
  - Mix-Up Attacks (RFC 9207 `iss` validation).
  - Localhost Redirect URI Impersonation.
  - CIMD Trust Policies: domain allowlists, reputation and domain-age checks.

  — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)

### Inferences
Applicability to webagent.dev (hosted, multi-tenant, server-side credentials):
- **Applies directly:**
  - Token passthrough. Never forward the MCP client's bearer token to third-party APIs or internal services.
  - Audience validation per server URL.
  - State-handle hijacking. Any handle (draft email ID, cursor, task ID) must be keyed `<tenant_id>:<user_id>:<handle>`; tenant_id is my extension of the spec's `<user_id>:<handle>`.
  - Scope minimization. Map each tenant's tool allowlist to scopes, with read and write tools separated.
  - SSRF, if we run our own authorization server with CIMD, or if any catalog tool (for example "fetch URL" or web-search result fetching) fetches attacker-influenced URLs. Route those fetches through an egress proxy and block private and metadata ranges.
- **Applies conditionally:** Confused deputy, only if web-agent proxies OAuth to third-party APIs (for example letting a tenant connect their own Gmail through a static web-agent client ID). It does not apply to tools that use our own server-side API keys, but those have their own deputy risk; see Q4.
- **Mostly not applicable to the server:** Local server compromise, OAuth URL validation (a client concern), stdio proxy, and localhost redirect impersonation, unless we ship a local CLI or Inspector-like tooling. They remain relevant to developer workstations.

### Gaps
- The page has no explicit "multi-tenant hosting" section. Multi-tenant guidance must be derived; see Q3.

---

## Q3. How should multi-tenant isolation work when many servers share one deployment?

### Takeaway
The spec provides the building blocks: authorization on every request, `tools/list` that may vary by credential but never by connection, and state handles bound to the verified principal. Real-world failures show the main risk is application-level cross-tenant mix-ups, not the transport. Two examples are the SDK bug that leaked responses between clients when server or transport instances were shared (CVE-2026-25536) and Asana's June 2025 cross-organization MCP exposure. Build a fresh server instance per request, carry tenant context derived from the verified token (never from client input), and enforce tenant scoping in the data layer.

### Cited Findings
- `tools/list` "**MUST NOT** vary per-connection or as a side effect of other requests on the connection. The set **MAY** vary by the authorization presented on the request — for example, returning only the tools the caller's granted scopes permit — since credentials are per-request input, not connection state." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- Stateful tools guidance: "For authenticated servers, a handle is a name, not a capability. The server should validate the caller's authorization against the handle on every call." Handles should be opaque and have stated lifetimes, and an expired handle should produce a tool execution error. — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- **CVE-2026-25536 (GHSA-345p-7cg4-v4c7):** a cross-client response data leak in `@modelcontextprotocol/sdk` when "a single `McpServer`/`Server` instance and its transport are reused across multiple client connections, most commonly in stateless `StreamableHTTPServerTransport` deployments."
  - Classification: CWE-362. CVSS 7.1.
  - Published 2026-02-04.
  - Affected: 1.10.0 to 1.25.3, per the description. OSV's affected-range list ends at 1.25.2, so the sources disagree slightly on the upper bound.
  - Fixed in 1.26.0.

  — [OSV CVE-2026-25536](https://osv.dev/vulnerability/CVE-2026-25536); [SentinelOne summary](https://www.sentinelone.com/vulnerability-database/cve-2026-25536/)
- **Asana MCP incident (June 2025):** Asana found a bug in its MCP server on June 4, 2025 that exposed data from Asana instances to other organizations' MCP users. Exposure was limited to each user's access scope. About 1,000 customers were reportedly affected. The server was offline June 5 to 17 and all connections were reset. — [BleepingComputer](https://bleepingcomputer.com/news/security/asana-warns-mcp-ai-feature-exposed-customer-data-to-other-orgs/); [The Register](https://theregister.com/2025/06/18/asana_mcp_server_bug/)
- Vercel Fluid compute uses "optimized concurrency," "dynamic scaling" and "instance sharing" for MCP servers, so multiple invocations run in the same function instance. — [Vercel: Deploy MCP servers](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel); [Vercel: Max duration](https://vercel.com/docs/functions/configuring-functions/duration)
- mcp-handler does not inspect the request pathname ("`/api/mcp` is a convention, not a requirement"). The route is determined by the framework. — [vercel/mcp-handler README](https://github.com/vercel/mcp-handler)
- Spec on clientInfo: self-reported and not to be used for security decisions. — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- OpenTelemetry trace context (`traceparent`, `tracestate`, `baggage`) is reserved in `_meta` (SEP-414), which supports per-request correlation. — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)

### Inferences
- **Per-slug routing:** use a Next.js dynamic route (`app/mcp/[slug]/route.ts`).
  - Resolve the slug against a server registry on every request.
  - Reject unknown or disabled slugs with 404 before any auth work, and avoid oracle-style messages that confirm a slug exists to unauthenticated callers.
  - Require that the verified token's audience or resource equals the exact `https://webagent.dev/mcp/<slug>` URL. This stops a token minted for tenant A's server being replayed against tenant B's slug. It follows from the "MUST NOT accept tokens not issued for the MCP server" rule; exact audience mechanics belong to the authorization researcher.
- **Tenant context propagation:**
  - Derive `{tenant_id, server_id, user_id, scopes}` only from the verified token plus the server registry.
  - Pass it explicitly into every tool handler, for example via AsyncLocalStorage or an explicit context argument.
  - Never accept tenant or workspace IDs as tool arguments, or ignore them when present.
  - Rebuild the tool list per request from the server's allowlist intersected with the caller's scopes.
- **Avoid shared mutable server objects:** construct the `McpServer` per request (or use mcp-handler's per-request initialize callback) and pin an SDK version ≥ 1.26.0, or v2. Fluid compute instance sharing makes module-level caches, singletons and in-memory maps a cross-tenant leak risk.
- **Data-layer enforcement:** enforce tenant scoping in the database (for example Postgres row-level security keyed on a session variable, or mandatory `tenant_id` predicates in a repository layer) so a buggy tool cannot read another tenant's tickets or accounts. The Asana incident is the cautionary precedent.
- **Noisy neighbor:**
  - Apply per-tenant and per-server concurrency caps and quotas (see Q5).
  - Set per-tool timeouts well below `maxDuration`.
  - Consider separate deployments or projects (or Vercel Secure Compute) for enterprise tenants who need hard isolation.
  - Under Fluid compute, one tenant's CPU-heavy tool can slow co-located invocations. This follows from instance sharing and is not documented as a measured effect.
- **Caching:** 2026-07-28 adds `cacheScope` (`public` or `private`) on list and read results. Mark tenant-specific results as `private` so shared intermediaries do not cache them across tenants. — derived from [2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)

### Gaps
- I found no primary vendor document (Vercel, Cloudflare, AWS) that prescribes a multi-tenant "many MCP servers per slug in one app" pattern. The isolation recommendations above are synthesized.
- Asana's official root-cause write-up was not retrieved. Press reports describe a "logic flaw" but no technical detail.

---

## Q4. How should downstream credentials be handled for tools that call third-party APIs (secret storage, per-tenant credentials, never exposing them to the model or client)? What about confused-deputy risk?

### Takeaway
The spec forbids token passthrough and requires per-client consent when an MCP server proxies OAuth to third parties. Server-side API keys (web search, email) should live only in server-side secret storage, be injected at call time, and never appear in tool schemas, results, errors, logs or mirrored headers. Gateways (Kong, Docker, Azure APIM) all follow a "gateway-managed credentials" pattern. The confused-deputy risk for shared server-side keys is that any tenant's caller can make our identity act; mitigate with per-tenant quotas, per-tenant sub-keys where the provider supports them, and server-enforced constraints on arguments.

### Cited Findings
- "MCP servers **MUST NOT** accept any tokens that were not explicitly issued for the MCP server." Passthrough lets the downstream API "incorrectly trust the token as if it came from the MCP server." — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- Confused-deputy mitigations for OAuth proxies (per-client consent registry, consent UI, cookie rules, exact `redirect_uri`, `state` handling) — see Q2. — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- Sensitive parameters (passwords, API keys, tokens, PII) SHOULD NOT be marked `x-mcp-header`, because header values are visible to intermediaries. — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- Kong describes layered MCP security, from a pass-through proxy with logging only up to "gateway-managed credentials." Kong Gateway in front of third-party MCP servers gives "one boundary for access control lists, observability, and credential management." Token claims map to Consumers and Consumer Groups (Gateway 3.14+) for per-tool ACLs. — [Kong: Secure External MCP Gateway](https://developer.konghq.com/cookbooks/secure-external-mcp-gateway/); [Kong: Secure Internal MCP Gateway](https://developer.konghq.com/cookbooks/secure-internal-mcp-gateway/)
- Docker MCP Gateway stores secrets on the host and injects API keys into server runtimes via the CLI. It positions the gateway as an enforcement point between agents and tools. — [Docker blog: MCP Gateway](https://www.docker.com/blog/docker-mcp-gateway-secure-infrastructure-for-agentic-ai/)
- Azure APIM lets you secure inbound access (client to APIM) and outbound access (APIM to backend) separately, "such as key-based or OAuth authentication." — [Microsoft Learn: MCP servers in APIM (updated 2026-10-20)](https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview)
- mcp-handler's `withMcpAuth` verifies bearer tokens and returns 401 or 403 with RFC 9728 `WWW-Authenticate` challenges. Vercel's docs say production verification must check "issuer, audience, expiration, and granted scopes." The package "does not issue tokens or run an authorization server." — [Vercel: Deploy MCP servers (updated 2026-09-18)](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- The spec warns SSRF error messages can "reveal information about internal network topology" and that responses can be "reflected back to attackers through error messages." — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)

### Inferences
- **Secret storage:**
  - Keep platform keys (for example the search API key and the email provider key) in Vercel env vars marked sensitive, or in a KMS or secrets manager.
  - Keep per-tenant credentials (for example a tenant's own SMTP or OAuth refresh tokens) encrypted at rest with envelope encryption, keyed by tenant_id, and decrypt only inside the tool executor.
  - Never put credentials in `inputSchema` defaults, tool descriptions, `structuredContent`, `_meta`, error text or OpenTelemetry attributes.
  - Redact credentials in logs.
- **Confused deputy with shared server-side keys:** our search or email key acts with web-agent's authority for every tenant. The controls are:
  - Server-enforced argument constraints. For `send_email`, restrict `from` to tenant-verified domains, cap recipients, and consider recipient allowlists or human approval via MRTR elicitation.
  - Per-tenant spend and volume quotas.
  - Per-tenant sub-accounts or API keys at the provider where available, so abuse is attributable and revocable.
  - Audit records tying each downstream call to tenant, user, client_id and request ID.
- **Third-party OAuth on behalf of tenant users:** if this is ever added, it puts web-agent in the spec's "MCP proxy server" pattern. The full per-client consent MUSTs apply. Use a token broker (for example Vercel Connect or an equivalent) rather than forwarding MCP client tokens. Vercel Connect was not verified in this research.
- Internal database tools should use a service identity scoped by tenant (RLS) rather than a superuser connection.

### Gaps
- No spec text directly addresses static server-side API keys (non-OAuth) for downstream services. The guidance above is inferred.
- Azure APIM credential manager specifics for MCP and Docker MCP Gateway "interceptors" were not confirmed from primary docs.

---

## Q5. Input validation, output limits, timeouts, error handling, rate limiting, quotas and DoS protection

### Takeaway
The spec mandates that servers "validate all tool inputs," "rate limit tool invocations" and "sanitize tool outputs." 2026-07-28 adds JSON Schema hardening:
- no automatic network `$ref` dereferencing;
- bounds on composition keywords (`anyOf`, `oneOf`, `allOf`, `if`/`then`/`else`) to prevent validator DoS;
- `additionalProperties: false` recommended for parameterless tools;
- protocol errors vs `isError` tool errors.

Concrete numeric limits (output size, per-tool timeouts, quotas) are left to implementers. Edge rate limiting is available (Vercel WAF, APIM), but counters are per region or per gateway, so tenant and tool quotas need an app-level, globally consistent store.

### Cited Findings
**Input validation and schemas**
- Servers MUST "Validate all tool inputs; Implement proper access controls; Rate limit tool invocations; Sanitize tool outputs." Clients SHOULD implement timeouts and log tool usage. — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- `inputSchema` "**MUST** be a valid JSON Schema object (not `null`)." The dialect defaults to 2020-12. For no-parameter tools, `{ "type": "object", "additionalProperties": false }` is "**Recommended**: explicitly accepts only empty objects." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- `$ref`: "Implementations **MUST NOT** automatically dereference `$ref` values that resolve to a network URI." Any opt-in fetch mode MUST be off by default and SHOULD allowlist hosts, reject loopback, link-local and private addresses, and apply timeouts and size limits. An unresolved external `$ref` SHOULD cause rejection "rather than silently treated as permissive." — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- Composition keywords: implementations "**SHOULD** apply reasonable bounds, such as a maximum schema depth, a cap on the total number of subschemas, or a per-validation time budget, to prevent a malicious schema from acting as a Denial-of-Service vector against the validator." — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)
- 2026-07-28 loosened `inputSchema` and `outputSchema` to allow any JSON Schema 2020-12 keywords (SEP-2106). — [2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- With an `outputSchema`, "Servers **MUST** provide structured results that conform to this schema." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- Tool names SHOULD be 1 to 128 characters from `[A-Za-z0-9_.-]`. — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)

**Errors**
- Protocol errors (unknown tool, malformed request, server errors) are JSON-RPC errors. Tool execution errors (API failures, input validation, business logic) use `isError: true` with "actionable feedback that language models can use to self-correct." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- Error code allocation: -32000 to -32019 is legacy, and new implementations SHOULD NOT use it. -32020 to -32099 is reserved for the spec. Application-defined errors SHOULD be allocated outside -32768 to -32000. — [2026-07-28 Base Protocol](https://modelcontextprotocol.io/specification/2026-07-28/basic/index)

**Rate limiting and quotas at the edge**
- Vercel WAF rate limiting (all plans):
  - Keys: IP and JA4 digest; Enterprise adds User-Agent and arbitrary headers.
  - Algorithms: fixed window; token bucket on Enterprise.
  - Window: 10 s to 10 min (1 h on Enterprise).
  - Rules: 1 per project on Hobby, 40 on Pro, 250 on Enterprise.
  - Actions: 429 (default), Log, Deny, Challenge.
  - "Rate limit counters are tracked on a per-region basis; traffic matching a given rate limit key in multiple regions can exceed the limit you configure for any single region."

  A Rate Limiting SDK exists for code-defined rules. — [Vercel WAF Rate Limiting (updated 2026-08-28)](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting); [Vercel Rate Limiting SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk)
- Azure APIM `rate-limit-by-key` can key on IP, header or JWT claim. Counters are tracked independently per gateway and not aggregated across a multi-region instance. `rate-limit-by-key` and `quota-by-key` are not available in the Consumption tier (secondary source). — [Microsoft Learn rate-limit policy](https://learn.microsoft.com/lb-lu/AZURE/api-management/rate-limit-policy); [OneUptime blog (Feb 2026)](https://oneuptime.com/blog/post/2026-02-16-how-to-implement-rate-limiting-and-throttling-in-azure-api-management/markdown)
- APIM MCP policies "apply to all API operations exposed as tools in the MCP server": rate limiting and quotas, JWT validation, IP filtering and caching. — [Microsoft Learn: MCP servers in APIM](https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview)
- Zuplo (May 2026, vendor blog) argues every MCP route needs a real rate limit and that a 429 should carry a machine-readable backoff signal. — [Zuplo blog](https://zuplo.com/blog/never-ship-mcp-server-without-rate-limit)
- Portkey's MCP gateway supports per-tool limits ("throttle the send_message tool to 100 calls per minute"). — [Portkey MCP gateway rate limits](https://portkey.ai/docs/aigw/product/mcp-gateway/rate-limits)

### Inferences
- **Validation:**
  - Validate arguments server-side against the declared schema with a strict validator (Ajv in strict mode, or Zod `.strict()`), using `additionalProperties: false` everywhere.
  - Set explicit `maxLength`, `maxItems` and numeric bounds.
  - Disable remote `$ref`.
  - Cap schema depth.
  - Because tenants compose servers from our catalog, the schemas are ours, which removes the malicious-schema vector. Still bound the validator, since `outputSchema` and `structuredContent` now allow any JSON.
- **Request limits:** cap HTTP body size (for example 1 MB) and reject oversized bodies with 413 before JSON parsing. Also cap the JSON nesting depth.
- **Output limits:**
  - Cap tool result size (bytes and items) per tool.
  - Paginate dataset reads with opaque cursors bound to the principal.
  - Truncate with an explicit `isError` or truncation notice rather than streaming unbounded data.

  Large outputs inflate cost and model context and widen exfiltration.
- **Timeouts:**
  - Per-tool deadlines (for example 10 to 30 s for synchronous tools).
  - Downstream HTTP timeouts.
  - Database statement timeouts.
  - Propagate cancellation when the client closes the SSE stream. This is a 2026-07-28 MUST; use `request.signal` (AbortSignal) in route handlers.
- **Error hygiene:**
  - Return generic protocol errors (-32603 with a correlation ID).
  - Keep stack traces, SQL, internal hostnames and upstream error bodies in server logs only.
  - `isError` messages should be model-actionable but sanitized.
- **Layered rate limiting:**
  1. Edge WAF by IP or JA4 for volumetric abuse.
  2. App-level limiter in a global store (for example Upstash Redis or Postgres) keyed by tenant, user and client_id, and by tenant plus tool, with costlier tools such as `send_email` weighted.
  3. Monthly per-tenant quotas tied to billing.
  4. Concurrency caps per tenant.

  Return 429 with `Retry-After`. Edge counters are per region, so app-level limits are the authoritative ones.

### Gaps
- The spec defines no standard output-size limit, request-size limit, or MCP-specific rate-limit error code. Whether 429 or a JSON-RPC error should be used for throttled `tools/call` is not standardized.
- I found no official Microsoft guidance specific to MCP rate limiting beyond generic APIM policies.

---

## Q6. Practical hosting on serverless platforms (Vercel mcp-handler, Cloudflare, AWS): statelessness, timeouts for long-running tools, tasks and async

### Takeaway
As of Oct 2026, both Vercel (mcp-handler 2.x) and Cloudflare (`createMcpHandler`) default to **stateless** Streamable HTTP. HTTP+SSE is removed (mcp-handler 2.x) or deprecated (Cloudflare `McpAgent`, which is feature-frozen). Redis is no longer needed. On Vercel, function duration defaults to 300 s, with a maximum of 800 s on Pro and Enterprise and 1800 s in beta. Long-running work should use the official **Tasks extension** (`io.modelcontextprotocol/tasks`, SEP-2663) backed by a durable job system such as Vercel Workflows, rather than holding connections open.

### Cited Findings
**Vercel**
- mcp-handler 2.x is built on MCP SDK v2 (`@modelcontextprotocol/server@^2`, `zod@^4`, Node 20+).
  - It "serves the 2026-07-28 MCP specification natively" and is stateless.
  - 2025-era Streamable HTTP goes through the SDK's stateless legacy fallback, where GET and DELETE session operations return 405.
  - HTTP+SSE (2024-11-05) is removed and "Redis is no longer needed or used."
  - `basePath`, `redisUrl`, `maxDuration`, `sessionIdGenerator` and the SSE options were removed.
  - The README does not mention Origin validation or DNS-rebinding protection.

  — [vercel/mcp-handler README](https://github.com/vercel/mcp-handler)
- Vercel docs pin `mcp-handler@2.1.1`. They recommend Fluid compute, Instant Rollback, Deployment Protection for previews, Vercel Firewall and Rolling Releases. Auth uses `withMcpAuth(handler, verifyToken, {required, requiredScopes, resourceMetadataPath})` and `protectedResourceHandler` at `/.well-known/oauth-protected-resource`. — [Vercel: Deploy MCP servers (updated 2026-09-18)](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- Vercel function durations with Fluid compute:

  | Plan | Default | Maximum | Extended (beta) |
  | --- | --- | --- | --- |
  | Hobby | 300 s | 300 s | none |
  | Pro | 300 s | 800 s | 1800 s |
  | Enterprise | 300 s | 800 s | 1800 s |

  - Configure per route with `export const maxDuration` in the App Router.
  - "Secure Compute and Static IPs do not support durations above 800 seconds during the beta."
  - Over HTTP/2, Vercel sends PING frames during idle long responses. HTTP/1.1 intermediaries may still close idle connections, so stream heartbeats.
  - For unlimited execution time, use Vercel Workflows.

  — [Vercel: Configuring max duration (updated 2026-08-24)](https://vercel.com/docs/functions/configuring-functions/duration)

**Cloudflare**
- New servers use stateless `createMcpHandler` (from `agents/mcp/server`) with `McpServer` from `@modelcontextprotocol/server`. Durable business data goes in separate storage.
- `McpAgent` (Durable Objects, stateful: event replay, pushed elicitation, sampling, roots) is "deprecated and feature-frozen."
- `createLegacyMcpHandler` can run alongside it during migration.
- Auth is via the Workers OAuth Provider, with `createMcpHandler` as the `apiHandler`.
- The internal RPC transport has no auth and a default tool timeout of 60 s.

  — [Cloudflare Agents: MCP transport (updated 2026-10-22)](https://developers.cloudflare.com/agents/model-context-protocol/transport/)

**Tasks extension (2026-07-28)**
- Tasks moved out of core into the official extension `io.modelcontextprotocol/tasks` (SEP-2663). The blocking `tasks/result` was replaced by `tasks/get` polling plus `tasks/update`, and `tasks/list` was removed. Servers may return task handles "without per-request opt-in." — [2026-07-28 Changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- How tasks work:
  - The client declares `io.modelcontextprotocol/tasks` in per-request `clientCapabilities`, and the server advertises it in `server/discover`.
  - The server returns `CreateTaskResult` (`resultType: "task"`) with `taskId`, status, `ttlMs` and `pollIntervalMs`. "The task must be durably created before sending the response."
  - Statuses are `working`, `input_required`, `completed`, `failed` and `cancelled`; the last three are terminal.
  - `tasks/cancel` is cooperative.
  - Servers must "Never return a task to a client that did not declare support."
  - Rationale: "Many clients and transport intermediaries impose timeouts that make [blocking] impractical beyond a few seconds."

  — [MCP Tasks extension overview](https://modelcontextprotocol.io/extensions/tasks/overview)
- The ext-tasks repo lists `2026-07-28` as "Stable" and `draft` as "Development." — [modelcontextprotocol/ext-tasks](https://github.com/modelcontextprotocol/ext-tasks)
- Older experimental tasks (SEP-1686, in 2025-11-25 core) are labeled deprecated in the Python SDK docs. The C# SDK says its tasks implementation follows SEP-2663 and requires 2026-07-28 or later. — [Python SDK tasks docs](https://py.sdk.modelcontextprotocol.io/experimental/tasks/index.md); [C# SDK tasks docs](https://csharp.sdk.modelcontextprotocol.io/v2/concepts/tasks/tasks.html)
- Note on the opt-in wording: the changelog says "without per-request opt-in," while the overview requires client capability declaration in each request's `_meta`. These are consistent: capabilities travel on every request, but no per-tool or per-call "please make this a task" flag is needed.

**SDK baseline versions (CVE-driven)**
- TypeScript SDK ≥ 1.24.0 adds DNS-rebinding (Host header) validation (CVE-2025-66414). Python SDK ≥ 1.23.0 does the same (CVE-2025-66416). TypeScript SDK ≥ 1.26.0 fixes the cross-client leak (CVE-2026-25536). — [VulnerableMCP: CVE-2025-66414/66416](https://vulnerablemcp.info/vuln/cve-2025-66414-66416-dns-rebinding-mcp-sdks.html); [OpenCVE CVE-2025-66414](https://app.opencve.io/cve/CVE-2025-66414); [OSV CVE-2026-25536](https://osv.dev/vulnerability/CVE-2026-25536)

### Inferences
- **Recommended architecture:**
  - Next.js route `app/mcp/[slug]/route.ts` built with mcp-handler 2.x and SDK v2, stateless, with a per-request server instance.
  - `export const maxDuration` sized for the slowest synchronous tool plus margin (for example 60 to 120 s), not the plan maximum, to bound runaway cost.
  - Tools expected to exceed about 30 s (bulk dataset exports, multi-step email campaigns) should return a Task.
  - The task record (`tenant_id`, `user_id`, `server_id`, `taskId`, status, result pointer, TTL) lives in Postgres or Redis.
  - Work runs in Vercel Workflows or a queue.
  - `tasks/get` re-checks that the caller's principal and tenant own the task. This follows from the state-handle rule; the ext-tasks security section was not retrieved.
- **Origin and Host validation:** mcp-handler's README is silent on these, so add an explicit Origin allowlist check, in the route or in Next.js middleware/proxy (the AGENTS.md note says this Next.js version may have renamed conventions; check `node_modules/next/dist/docs/`). This matters because 403 for a bad Origin is a spec MUST.
- **Statelessness constraints:** with no sessions or resumability, MRTR `requestState` is round-tripped through the client and must be treated as untrusted input. Sign or encrypt it (for example as a JWE or HMAC-ed blob bound to tenant and user) if it carries anything server-trusted. The 2026-07-28 tools page shows `requestState` as an opaque string but does not mandate integrity protection.
- Compatibility risk: if a major client still speaks only 2025-era Streamable HTTP and expects sessions or resumability, the stateless fallback still works per the spec (sessions are optional, "MAY"), but server-initiated requests on a GET stream will not be available.

### Gaps
- I did not retrieve AWS-specific guidance (for example Lambda or Bedrock AgentCore Gateway MCP hosting) within the research budget.
- The ext-tasks `SECURITY.md` and the specification files (task-ID entropy, principal binding, retention) were not retrieved, so task security requirements here are inferred from the State Handle Hijacking rules.
- Whether mcp-handler 2.x or SDK v2 enable Host/Origin validation by default on non-localhost deployments is unverified.
- `requestState` integrity requirements in the MRTR spec page (`/basic/patterns/mrtr`) were not fetched.

---

## Q7. Network-level controls (TLS, WAF, bot protection, IP allowlists) and how MCP gateways and proxies fit in

### Takeaway
Network controls are defense in depth around a server that must already authenticate every request.
- **TLS:** HTTPS only. The spec requires HTTPS for production OAuth endpoints.
- **WAF and rate limits:** per IP or JA4 at the edge.
- **Bot challenges:** do not apply on the MCP route, because MCP clients are not browsers (inference).
- **IP allowlists:** offer them per tenant as an enterprise option. Note that hosted clients such as Claude connect from the vendor's infrastructure, so allowlists must contain vendor egress ranges, not the customer's office IPs.

Gateways (Azure APIM, Kong, Docker, Portkey) centralize auth, tool ACLs, credential injection, rate limits and observability. The 2026-07-28 mirrored headers (`Mcp-Method`, `Mcp-Name`) exist so these intermediaries can route and police without parsing bodies.

### Cited Findings
- "authorization servers in production **MUST** use `https://`". Clients SHOULD require HTTPS for all OAuth-related URLs. — [Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- Mirrored headers exist "so that intermediaries (load balancers, gateways, observability tooling) can route and inspect requests without parsing the body." Intermediaries enforcing policy on them SHOULD reject versions that lack header-body validation. Intermediaries that do not recognize an `Mcp-Param-*` header MUST forward it. — [2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)
- `x-mcp-header` "enables network intermediaries (load balancers, proxies, WAFs) to route and process requests based on parameter values." — [MCP 2026-07-28 Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- Vercel WAF rate-limit actions include Challenge. Header-keyed rules are Enterprise-only. Counters are per region. — [Vercel WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- Vercel recommends Vercel Firewall and Deployment Protection (for preview MCP servers) for MCP deployments. — [Vercel: Deploy MCP servers](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- Azure APIM (doc updated 2026-10-20) can expose REST APIs as MCP servers or front existing MCP servers. Policies cover rate limiting and quota, JWT validation (Entra ID or other IdPs), IP filtering and caching; monitoring is via Azure Monitor and Application Insights with correlation IDs. Limits: it supports tools but not resources or prompts, and MCP is not supported in APIM workspaces. A self-hosted gateway is available. — [Microsoft Learn: MCP servers in APIM](https://learn.microsoft.com/en-us/azure/api-management/mcp-server-overview)
- Kong: an MCP gateway gives a single boundary for ACLs, observability and credential management, with per-tool ACLs via Consumer Groups (Gateway 3.14+). — [Kong: Secure External MCP Gateway](https://developer.konghq.com/cookbooks/secure-external-mcp-gateway/); [Kong: Secure Internal MCP Gateway](https://developer.konghq.com/cookbooks/secure-internal-mcp-gateway/)
- Docker MCP Gateway is an open-source enforcement point with host-stored secrets injected into server containers. — [Docker blog](https://www.docker.com/blog/docker-mcp-gateway-secure-infrastructure-for-agentic-ai/)
- Anthropic's support docs say remote MCP connections from Claude originate from Anthropic's infrastructure and point to a separate published IP-address list. — [Claude Help: Building custom connectors via remote MCP](https://support.claude.com/en/articles/11503834)
- A third-party blog lists `160.79.104.0/21` as the outbound range and says older `34.162.x` addresses were phased out. This is **unverified against Anthropic's primary list**. — [mer.vin (Aug 2026)](https://mer.vin/2026/08/local-vs-remote-mcp-claude-custom-connectors/)
- A Zuplo guide states Claude connectors are IPv4-only, so an AAAA-only host is unreachable (secondary source). — [Zuplo: MCP server works in Claude Code but not claude.ai](https://zuplo.com/learn/mcp/errors/mcp-server-works-in-claude-code-but-not-claude-ai)
- Anthropic "MCP tunnels" (beta, research preview) use outbound-only connections so no inbound firewall ports are needed. — [Claude Platform: MCP tunnels](https://platform.claude.com/docs/agents-and-tools/mcp-tunnels/overview)

**CVE lessons for network and transport exposure (mostly local or client tooling, relevant to dev workflows)**
- CVE-2025-66414 (TypeScript SDK < 1.24.0) and CVE-2025-66416 (Python SDK < 1.23.0): no Host-header validation on localhost HTTP servers, which enabled DNS rebinding from malicious websites. Fixed by Host validation. — [VulnerableMCP](https://vulnerablemcp.info/vuln/cve-2025-66414-66416-dns-rebinding-mcp-sdks.html)
- That page dates the CVE assignment to July 2025, but the SDK fix versions (1.24.0 / 1.23.0) suggest a later disclosure. The date is not reconciled.
- CVE-2025-49596 (MCP Inspector < 0.14.1, CVSS 9.4): RCE "due to lack of authentication between the Inspector client and proxy," reachable from a malicious webpage. — [The Hacker News](https://thehackernews.com/2025/07/critical-vulnerability-in-anthropics.html)
- CVE-2025-6514 (mcp-remote, CVSS 9.6, JFrog): connecting to an untrusted server can execute OS commands on the client, described as the first full client-OS RCE in a real-world scenario. — [The Hacker News](https://thehackernews.com/2025/07/critical-mcp-remote-vulnerability.html)

### Inferences
- **TLS:** serve only via HTTPS on `webagent.dev` with HSTS (Vercel provides managed TLS). Reject plain-HTTP MCP endpoints and do not expose preview deployments' MCP routes publicly; use Deployment Protection.
- **WAF:**
  - Rate-limit `/mcp/*` per IP or JA4.
  - Add a custom rule to drop requests missing `MCP-Protocol-Version` or carrying unsupported versions, while still allowing the 2025 fallback during transition.
  - On Enterprise, key per-tool rules on `Mcp-Name`, relying on origin-side header-body validation.
  - Do **not** use Challenge or bot-protection actions (JS or CAPTCHA challenges, BotID-style checks) on the MCP route. Non-browser MCP clients cannot solve them and will fail. Reserve those for the admin UI.
- **IP allowlists for enterprise tenants:**
  - Implement them per server or slug in the app (checking `x-forwarded-for`/`x-real-ip` as set by Vercel), not as a global WAF rule.
  - Document that allowlists must include the egress ranges of the MCP clients the tenant uses (Anthropic, OpenAI and others), not the customer's office ranges.
  - Pair allowlists with mandatory OAuth; never use them as a substitute.
- **Gateways:**
  - An external gateway (APIM, Kong) is optional for web-agent, because web-agent *is* the gateway: it owns tool allowlists, credentials and tenant routing.
  - It may still help for enterprise customers who want their own policy layer in front of `webagent.dev/mcp/<slug>`.
  - Design for that case: honor the spec's mirrored headers, keep header-body validation at origin, and emit correlation IDs and OpenTelemetry trace context.
- **Developer tooling hygiene:** pin MCP Inspector ≥ 0.14.1 and mcp-remote to a patched version, and never run the Inspector proxy unauthenticated on shared networks. The Vercel docs' Inspector flow uses a "Proxy Session Token," which reflects the CVE-2025-49596 fix.

### Gaps
- Anthropic's official IP list and OpenAI ChatGPT connector egress ranges were not retrieved, so the published ranges are unverified.
- The fixed version for mcp-remote (CVE-2025-6514) was not confirmed from a primary advisory.
- Security research from Trail of Bits, Invariant Labs, Palo Alto Unit 42, Datadog and Wiz on server-side MCP vulnerabilities was not surveyed in depth within the tool budget. Only the CVEs above, from SDK advisories and press, are covered. A follow-up pass on those blogs would strengthen the "known vulnerabilities" section of the ADR.
- AWS-native options (API Gateway, WAF, Bedrock AgentCore Gateway) were not covered.
