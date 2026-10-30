# ADR-0003 — MCP servers: security and governance for publishing company data to AI clients

**Status:** Proposed. The Create MCP server screen (`/mcp-servers/new`) is a mockup built before this research, and several decisions below change it (see Follow-ups). No MCP endpoint exists yet.
**Created:** 2026-10-26
**Related:** Research report [`../research/reports/MCP server security and governance.md`](../research/reports/MCP%20server%20security%20and%20governance.md) (91 sources) and its [notes](../research/research_notes/MCP%20server%20security%20and%20governance/); Create MCP server screen (`src/app/mcp-servers/new/`, `src/components/mcp-servers/`, `src/lib/mcp-server.ts`, `src/lib/mock-mcp-server-data.ts`); Get started page (`/onboarding`), which promises one OAuth URL whose access mirrors each person's own permissions.

---

## Context

The Create MCP server screen lets an admin define a server published at `https://webagent.dev/mcp/<slug>`:

- a name, the URL, and instructions for the model;
- the datasets it exposes: help center articles, runbooks, release notes, support tickets and customer accounts;
- access rules that grant None, Read, Write or Manage per dataset to four audiences (Internal, Clients, Partners, Resellers), optionally narrowed to a business unit or a department, each with a per-rule tool limit;
- tools picked from the catalog, labeled read-only, changes data or destructive, with a "Confirm first" option;
- a daily call limit per person and a monthly budget.

People connect from Claude, ChatGPT and other MCP clients, and sign in with their work email over OAuth.

We researched how to build and run this safely, in five tracks: authorization and identity, transport and hardening, AI-specific threats, data governance, and lifecycle governance. The research reflects October 2026. The findings that shape this decision:

- **The spec changed.** The current MCP revision, 2026-07-28, is stateless: there are no sessions and no `initialize` handshake. An MCP server is a pure OAuth 2.1 resource server, and Dynamic Client Registration (DCR) is deprecated in favor of Client ID Metadata Documents (CIMD) ([changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). The final-release date comes from search snippets, but every `/latest/` spec page already resolves to this revision.
- **Nothing between the person and our data enforces anything for us.** The spec, Anthropic, OpenAI, OWASP and CoSAI all treat the AI client, the model, tool annotations and token scopes as hints. In Claude's Research mode, connector tools run without asking ([Claude Help](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)), and users can choose "Always allow".
- **Real breaches came from application bugs, not the protocol.** An MCP bug at Asana exposed data across organizations for about 1,000 customers in June 2025 ([The Register](https://theregister.com/2025/06/18/asana_mcp_server_bug/)). CVE-2026-25536 leaked responses between clients that shared one TypeScript SDK server instance ([OSV](https://osv.dev/vulnerability/CVE-2026-25536)).
- **Our own example server repeats a known attack.** The Support KB template combines customer-written tickets (untrusted content), customer accounts (private data) and a ticket write path (a way out). That combination, the "lethal trifecta", is how a malicious support ticket made an agent leak data at Atlassian ([Cato CTRL](https://www.catonetworks.com/blog/cato-ctrl-poc-attack-targeting-atlassians-mcp/), June 2025) and at Supabase ([General Analysis](https://www.generalanalysis.com/blog/supabase-mcp-blog), July 2025).
- **The mockup's model has gaps.**
  - "Most specific rule wins" lets a department rule silently drop everything its business-unit rule granted. It also lets a narrow rule override an audience-wide "never", and settles ties by the order rules were added.
  - Tools that touch no dataset (`send_email`, `web_search`) pass the access check automatically, so every audience gets them.
  - A single server-wide monthly budget lets one stolen token stop the server for everyone.
- **Returned data leaves our control.** Results land under the connecting person's AI plan, not ours. On consumer plans they can be used for training, and Anthropic keeps opted-in consumer data for five years ([Anthropic](https://www.anthropic.com/news/updates-to-our-consumer-terms)).

Constraints: Next.js 16 on Vercel, where Fluid compute runs several requests in one function instance. Auth is still a mock, and the screen runs on mock data.

## Decision

Build MCP servers so that **the server enforces every guarantee itself, on every call**. Treat the admin screen as the security boundary: its rule resolver, publish checks and publish workflow are security controls that happen to have a UI.

### Identity and authorization

1. **Each slug is its own OAuth resource.** The token audience is the exact `https://webagent.dev/mcp/<slug>`, and Protected Resource Metadata is served at `/.well-known/oauth-protected-resource/mcp/<slug>`. A token for one slug is rejected by every other. Slugs can't change after publishing, and a retired slug is reserved forever.
2. **One multi-tenant authorization server for every slug.** It's a hosted vendor or our own. It federates over OIDC or SAML to each client's, partner's and reseller's identity provider, and issues web-agent identities. Claude only uses the first authorization server a resource lists, and OpenAI strongly recommends an established identity provider.
   - It advertises CIMD with `none` client authentication, PKCE S256, and the RFC 9207 `iss` parameter.
   - It accepts pre-registered clients, and doesn't offer open DCR.
   - Each server has an allowlist of CIMD client domains, which decides which AI clients may connect.
3. **Enterprise-managed authorization (ID-JAG)** for Internal staff and for large partners whose identity provider supports it. Today that means Okta, with Claude Team and Enterprise. The spec and Claude disagree on how support is detected, so we advertise both `authorization_grant_profiles_supported` and the JWT-bearer grant in `grant_types_supported`. Trusted issuers are allowlisted per tenant.
4. **Every call is made by a person.**
   - No shared credentials: no Claude `static_headers`, no `client_credentials`.
   - A person is keyed on their identity provider's `(iss, sub)`, never on their email.
   - Business unit and department come from a web-agent directory record, kept current by SCIM or per-tenant claim mapping. They're read on every request, not frozen at sign-in.
5. **Coarse scopes, fine decisions on the server.** The scopes are Read, Write and Manage. The decision by dataset, audience, unit and department runs on every call. Access tokens are short-lived, refresh tokens rotate, and revocation is standard OAuth. An admin's change takes effect on the next call, not when the token expires.

### Permission model

6. **Default deny, the highest matching grant, and ceilings that always win.** This replaces "most specific rule wins". A dataset's effective level is the highest level any matching rule grants, capped by ceilings and forbids that no rule can override. Adding a grant never removes access, and adding a forbid never adds it. Every decision records the rules that decided it, and Preview as shows them. Built-in ceilings:
   - External audiences never get Manage.
   - External audiences only see their own company's tickets and accounts. This is not a switch.
   - Partners never see billing fields.

   End-customer conversation bodies are hidden from Partners and Resellers by default, and a data owner can allow them.
7. **Tools that touch no dataset need their own grant.** `send_email`, `web_search` and similar tools are capabilities a rule grants explicitly. They are no longer available to every rule by default.
8. **Our rules are a ceiling, not a separate grant system.** Effective access is the intersection of three things: web-agent's policy, the person's permissions in the source system, and the token's scopes. Help center articles and release notes can be read by a service identity under policy. Tickets and accounts use the person's own permissions, delegated or synced from the source.
9. **Company tenancy is a relationship.** Client-of, reseller-of and partner-of links live in a relationship store: Postgres relationship tables to start, and OpenFGA or SpiceDB if it grows.
   - The links come from verified domains, identity-provider organization claims or CRM records, never from what a person types.
   - This replaces the `companyScopedIds` switch, which can't express "a reseller sees the customers it resold to".
   - The relationship graph has a named owner and a periodic review.
10. **Enforce in three places.**
    - Filter `tools/list`.
    - Check again on every `tools/call`.
    - Scope rows in the database with a restrictive Postgres row-level security policy. Turn on `FORCE ROW LEVEL SECURITY`. The runtime role is never the owner, a superuser or `BYPASSRLS`, and the tenant is set with `SET LOCAL` inside each transaction.

    Filter before ranking, snippets, counts and search. Each tool returns only the fields allowed for the audience, declared in its `outputSchema`.

### Runtime and transport

11. **Target spec 2026-07-28, stateless.** Use `mcp-handler` 2.x on MCP SDK 1.26 or later. Serve 2025-era clients through the stateless fallback, where GET and DELETE answer 405. No HTTP+SSE.
12. **A fresh server per request, with tenant context taken only from the token.**
    - Resolve the slug against the server registry first, and answer 404 for unknown or disabled slugs.
    - Take the tenant, server, person and scopes only from the verified token plus the registry. Ignore any tenant or company ID in tool arguments.
    - Keep no tenant data in module-level caches.
    - Caller-specific `tools/list` results carry `cacheScope: "private"`.
13. **Mandatory request checks.**
    - Allowlist the `Origin` header, and answer 403 otherwise.
    - Reject header and body mismatches with 400 (error -32020).
    - Never trust `clientInfo`.
    - Treat a closed response stream as cancellation.
    - Require idempotency keys on tools with side effects, because clients retry a dropped request under a new ID.
    - Bind state handles (cursors, task IDs) to the person, and sign `requestState`.
14. **Hard limits.**
    - Request bodies capped at about 1 MB.
    - Strict input schemas: `additionalProperties: false`, `maxLength` and `maxItems`, and no remote `$ref`.
    - A 10–30 second deadline per synchronous tool, plus database statement timeouts.
    - Paginated, capped results.

    Longer work goes through the MCP Tasks extension, backed by Vercel Workflows. Errors are generic, come from fixed templates and carry a correlation ID.
15. **Rate limits in two layers.** Vercel WAF absorbs volume, though its counters are per region. Authoritative limits live in a global store keyed by tenant, person, OAuth client and tool, and answer with 429 and `Retry-After`. No bot challenges on the MCP route, since MCP clients aren't browsers.
16. **Secrets stay on the server.** Provider keys are injected at call time. They never appear in schemas, results, `_meta`, errors or telemetry. `send_email` only sends from the tenant's verified domains, with a cap on recipients.

### AI-specific safeguards

17. **A trifecta check at publish time, per rule.** Each dataset is classed as trusted, untrusted (written by customers or taken from the web) or private. Each tool is classed as a way out or not: sending email, web search, URL fetches, and writes to fields customers can see. Publishing is blocked when one rule's effective view combines all three. The exception is when a data owner signs off and the outbound tool requires confirmation. The check runs per rule, because different audiences get different tools.
18. **Break the way out first, and filter second.**
    - `send_email` only goes to the person or their own company's domains, or saves a draft for the person to send.
    - Replies on tickets that customers can see need confirmation when the same person can also read accounts.
    - Tools run as the person, with least privilege, and never through a service role. A service role was the root cause at Supabase.
    - After those controls, untrusted text arrives in labeled fields that state its source. Markdown images, HTML, comments, invisible Unicode and ANSI escapes are stripped.
19. **Honest annotations.** Every tool sets `readOnlyHint`, `destructiveHint` and `openWorldHint` explicitly.
    - Dataset tools are closed-world, and `web_search` is open-world.
    - `send_email` is destructive, because a sent email can't be recalled.
    - `update_ticket` is destructive when it overwrites content customers can see.

    This matters because Claude only guarantees a prompt for destructive tools.
20. **The server enforces confirmation.** A tool set to Confirm first answers with a URL-mode elicitation. It opens a confirmation page on `webagent.dev` showing the exact action, and the page checks that the person opening it holds the token. Form mode is the fallback. Clients that support neither get a clear refusal, or a queued approval in the web-agent app. `issue_credit` always needs a person's approval. **This depends on elicitation working in Claude and ChatGPT, which isn't verified yet** (see Follow-ups).
21. **Lint everything the model reads.** Server instructions, tool names, descriptions and parameter text are rejected when they contain invisible or control Unicode, references to other tools or servers, or instructions aimed at the model. They're also capped in length. These rules match Anthropic's and OpenAI's directory policies, which keeps published servers eligible for listing. Tool names get a short server prefix, within 64 characters. No catch-all tools such as raw SQL or a generic API request. No server-side sampling in v1.

### Lifecycle and governance

22. **A server serves Internal or external audiences, never both.** Separate slugs give each side its own token audience, kill switch, trifecta check and consent screen, so the Support KB example becomes two servers. The spec would allow one slug for both, since `tools/list` can vary by authorization. We choose separation to limit how far one mistake reaches.
23. **Builders and publishers are different people for risky servers.**
    - A second approver, a data owner, is needed to publish a server with any external audience or any tool that isn't read-only, and for every change that widens scope.
    - Internal, read-only servers publish with one approver.
    - No host platform requires this today, so it's a deliberate choice for external exposure.
    - Opening a server to an external audience is a disclosure decision. The data owner confirms the lawful basis and the data protection impact assessment, and enrolls companies one at a time rather than whole audiences.
24. **Private by default.** A blank server starts Internal-only and read-only, with no datasets and no external rules. The mockup's blank server instead creates rules for all four audiences.
25. **Every publish is an immutable, hashed manifest.** The manifest holds the tools, descriptions, schemas, annotations, datasets, audiences and rules. It's serialized canonically (JCS) and hashed, and the server refuses to serve any definition that doesn't match the approved hash. The URL stays the same, and `/mcp/<slug>/v<N>` is available for clients that want to pin a version.
26. **Changes are classed by risk.**
    - Narrowing changes publish with notice: removing a tool, tightening access, fixing a typo.
    - Widening changes go back through approval and arrive switched off until approved: a new tool, dataset or audience; an annotation moving toward write or destructive; a material change to a description.

    Clients are told through `toolsListChanged`. New versions reach Internal audiences before external ones.
27. **The catalog is a private registry.** Each tool has an owner, a risk tier (from its annotations and the data it touches), a review date and pinned provenance. Destructive and open-world tools can't join an external server without an extra recorded approval. We don't list on the official MCP Registry in v1, because it doesn't accept private servers. We don't commit to a Server Card path yet either, since its `.well-known` location is still unsettled.
28. **Five kill switches within an admin's reach.**

    | Kill switch | Stops | How |
    |---|---|---|
    | Person | One person, or one stolen token | Revoke their refresh tokens and deny at the policy check |
    | Company | One client, partner or reseller | Remove the relationship or suspend the company's enrollment |
    | Tool | One catalog tool, on every server | Disable it in the catalog; manifests that include it fail closed for that tool |
    | Version | A bad publish | Roll back to the previous manifest |
    | Server | The whole slug | Unpublish; the URL returns an explicit error |

    Retirement goes in four steps: deprecation, an announced date, no new connections, then a "retired" error at the URL. The slug stays reserved forever. External audiences get at most 12 months' notice, the spec's own deprecation window.

### Audit, operations and budgets

29. **Two observability layers.**
    - OpenTelemetry's MCP conventions cover operations: spans and durations, with arguments and results switched off.
    - A separate append-only audit log records, for every call:
      - the request ID, slug and manifest version;
      - the person (stable ID, audience, unit, department, company, and where each came from);
      - the OAuth client and scopes, the tool and datasets;
      - the decision and the rules that decided it;
      - the record IDs returned (or a hash and count), bytes, and masked fields;
      - before-and-after references for writes, and the confirmation outcome.
    - Sensitive arguments are stored as an HMAC, not in clear text.
    - The log is hash-chained or write-once, can stream to customers' SIEMs, and keeps about a year of records plus legal hold.
30. **Budgets per person and per company.** They warn at 80%, stop at 100%, and allow an audited admin override, replacing the single server-wide monthly budget. Alerts cover destructive calls per person, bytes returned, bursts from new people, error spikes after a publish, and calls from unexpected audiences.

### Customers and compliance

31. **A consent screen when someone connects.** It shows the datasets, access levels, hidden fields and company scoping. It also says that results go to the person's AI provider under that provider's terms. Contracts require external audiences to use a business-tier AI plan with training off.
32. **A console for customer admins**, modeled on Atlassian's Rovo MCP controls. Admins at client, partner and reseller companies can:
    - see who connected from which AI client;
    - disconnect one person or their whole company;
    - restrict which AI clients may connect;
    - watch usage, and export audit logs;
    - get notice of new versions and deprecations.

    A trust page per server lists its manifest version, tools and annotations, data classes and changelog.
33. **Compliance roles.**
    - Web-agent is the data owner's processor.
    - The AI provider is chosen by whoever connects, and isn't web-agent's sub-processor. The exception is catalog tools where web-agent calls an LLM itself (`translate_text`, `analyze_sentiment`): their provider goes on our sub-processor list.
    - Servers with external audiences get a data protection impact assessment (DPIA).
    - Under Québec's Law 25 they also need a privacy impact assessment (s.3.3), plus an assessment and a written agreement before data leaves Québec (s.17).

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| **Keep "most specific rule wins"** (the mockup) | It silently drops access a broader rule granted, lets narrow rules override audience-wide intent, and settles ties by order. No established policy engine works this way: Cedar and Postgres row-level security both deny by default and let a deny win. |
| **A service account with web-agent grants only** | Simpler, but it's a second permission system that drifts from the source. Revocations, department moves and record-level restrictions in the source system wouldn't apply. The Supabase leak ran through exactly this kind of over-privileged role. |
| **The MCP server as its own authorization server, or a customer's identity provider as the authorization server** | The spec treats a combined server and authorization server as legacy (2025-03-26). A single customer's identity provider can't serve four audiences drawn from many identity providers, and Entra would need every slug registered on a verified domain. |
| **Open Dynamic Client Registration** | Deprecated in 2026-07-28. Claude registers a new client on every fresh connection, and open DCR lets any client register itself. |
| **Rely on client confirmations and tool annotations** | Annotations are hints by spec, and Claude's Research mode and "Always allow" skip the prompts. Annotations stay as a signal (decision 19), not a control. |
| **One slug for Internal and external audiences** | The spec allows it, and there'd be fewer servers to manage. We rejected it to limit how far one mistake reaches: a single token audience, kill switch and trifecta check would cover both. Revisit if managing pairs of servers proves heavy. |
| **Prompt-injection filters or classifiers as the main defense** | They're probabilistic. Supabase's wrappers "reduced risk but did not eliminate it". They stay as a second layer behind the structural controls (decision 18). |
| **An external MCP gateway** (Kong, Azure API Management, Docker) | Web-agent already owns the allowlists, credentials and tenant routing. Revisit if customers want their own gateway in front. |
| **A shared organization credential** (Claude `static_headers`) | It erases per-person identity, which every permission, audit and revocation control depends on. |
| **Listing on the official MCP Registry** | It's still in preview and doesn't accept private servers. Revisit for public servers under a DNS-verified namespace. |

## Consequences

**Positive**

- Permission outcomes are predictable and explainable. Adding a grant never removes access, and every decision names the rules behind it, so an admin can preview who gains or loses access before publishing.
- Tenant isolation holds in three layers: the token audience, the per-call policy check and database row-level security. One bug no longer exposes another company's data.
- Known attacks (the Atlassian and Supabase ticket injections, silently changed tool definitions, cross-tenant leaks) are stopped by structure rather than by filters.
- Honest annotations and stable, hashed manifests make our servers easy for customer admins to approve, and keep them eligible for Anthropic's and OpenAI's directories.

**Negative / risks**

- **There's much more to build than the mockup suggests:**
  - an authorization server, or a vendor for one;
  - a directory fed by SCIM, and a relationship store;
  - row-level security policies and an audit log;
  - a two-approver publish workflow;
  - a customer-admin console.
- **Confirmations depend on client behavior we haven't verified.** If Claude and ChatGPT don't support elicitation from remote connectors, every confirmation moves into the web-agent app, which changes the experience of every write tool.
- **Two approvers and per-company enrollment slow publishing down,** beyond what any host platform requires. That's deliberate for external exposure.
- **Servers come in pairs.** Splitting Internal from external means more servers to keep in step.
- **We can't see the connecting person's AI plan.** A partner on a consumer plan could still put customer data into training data. Client allowlists and contracts reduce that risk but don't close it.
- **The spec moves fast.** 2026-07-28 removed sessions a little over a year after they were standardized. The 2025-era fallback and the Tasks extension may change again.

## Follow-ups

**Verify before building**

- [ ] Test form- and URL-mode elicitation (`InputRequiredResult`) from a remote connector in claude.ai, Claude Desktop and ChatGPT. Decision 20 depends on it.
- [ ] Find out which MCP protocol versions Claude and ChatGPT send today, to know how long the 2025-era fallback must live.
- [ ] Choose the authorization server. Check support for CIMD, RFC 9207 `iss`, JWT-bearer / ID-JAG and per-tenant issuer allowlists (WorkOS, Stytch, Descope, Auth0, Clerk, or our own).
- [ ] See how Claude and ChatGPT react to `toolsListChanged` from a remote connector.

**Update the mockup** (`/mcp-servers/new`)

- [ ] Replace `matchRule()` with default deny, the highest grant across matching rules, and ceilings. Show the deciding rules in Preview as.
- [ ] Make tools that touch no dataset a grant of their own (decision 7).
- [ ] Add a server type, Internal or External, and split the Support KB example into two servers.
- [ ] Make the blank server private by default. Make external company scoping always on for tickets and accounts.
- [ ] Set all three annotations on every tool, and mark `send_email` destructive. Drop the "from initialize" wording in `toClientView`.
- [ ] Add the trifecta check and the model-text lint to `checkServer`.
- [ ] Replace the single monthly budget with per-person and per-company budgets.
- [ ] Reserve retired slugs in `slugProblem`.
- [ ] Mock the publish flow: a second approver, versions, and a diff of what changed.

**Build**

- [ ] A directory record fed by SCIM, the relationship store, row-level security policies, and the audit log table.
- [ ] The MCP route on `mcp-handler` 2.x, with the checks in decisions 11–16.
- [ ] The confirmation page on `webagent.dev`, the consent screen, the customer-admin console and the per-server trust page.

**Legal and compliance**

- [ ] A DPIA template for servers with external audiences, and the Law 25 assessments.
- [ ] Contract terms for partners and resellers: the AI client sits outside our processing chain, onward transfer, and the deprecation notice we commit to. The research found no primary sources on this, so it needs legal review.
- [ ] Add the LLM providers used by catalog tools to the sub-processor list.
