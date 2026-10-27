# Data governance for web-agent's "Create MCP server" feature: permissions, data protection, audit and compliance (as of October 2026)

Scope note: these notes cover permission model design, data protection, audit logging, compliance and transparency for exposing company datasets to LLM clients through a remote MCP server at `https://webagent.dev/mcp/<slug>`. OAuth flows, transport hardening, prompt injection and lifecycle governance are left to other researchers. Wherever a page could not be fetched directly (HTTP 403) and a claim rests only on a search-result summary, it is marked "(search summary; page not fetched)".

Context from the repo, read directly (`src/lib/mcp-server.ts`, `src/lib/mock-mcp-server-data.ts`):
- The draft resolves access with `matchRule()`. It filters the rules by audience, business unit and department, sorts them by specificity (department 2, unit 1, audience-wide 0) and takes the first. `accessFor()` then reads that one rule's per-dataset map, and any dataset missing from the map gets `"none"`.
- `companyScopedIds` is an optional per-dataset list ("Datasets where Clients, Partners and Resellers only see their own company's records"). It is empty in one of the mock drafts.
- `REQUIRED_ACCESS` maps tool safety to access: read needs Read, write needs Write, destructive needs Manage.
- Tool annotations are derived from safety as `readOnlyHint` and `destructiveHint`.

---

## 1. Permission model design: RBAC vs ABAC vs ReBAC, rule resolution, and policy engines with MCP

### Takeaway
No major policy engine uses "most specific rule wins". The safer pattern is default deny, with grants combined as a union (OR) and capped by guardrails that cannot be overridden: forbids or restrictive policies combined as AND, where deny overrides. That is how Cedar and Postgres RLS work, and it gives a list of "determining policies" that can be shown to admins. For this product the best fit is a hybrid. Use RBAC/ABAC for audience × business unit × department, and use relationships (ReBAC) for record-level tenancy such as own company, reseller-of-customer or ticket requester. Put the decision in a policy decision point that the MCP server calls both when it builds `tools/list` and on every `tools/call`.

### Cited Findings
**How resolution works in established engines**
- Cedar is default deny: "no request is authorized (decision `Allow`) unless there is a specific `permit` policy that grants it". Any satisfied `forbid` overrides every permit ("If any `forbid` policy evaluates to `true`, then the final result is `Deny`"). Outcomes are defined over "any" matching policy, so policy order does not affect them. — [Cedar docs: Authorization](https://docs.cedarpolicy.com/auth/authorization.html)
- Cedar's response returns the decision plus diagnostics naming the **determining policies**: the satisfied permits for an Allow, or the satisfied forbids for a Deny. A Deny with no matching policy returns an empty list. Cedar's rationale is that forbid policies "always deny access", so "readers can understand them independently of any `permit` policies created now or in the future". A policy that errors is skipped, not treated as a deny. — [Cedar docs: Authorization](https://docs.cedarpolicy.com/auth/authorization.html)
- In PostgreSQL row security, permissive policies are combined with `OR` (the default) and restrictive policies with `AND`. A table with RLS enabled but no policy uses "a default-deny policy … no rows are visible or can be modified". — [PostgreSQL 18 docs: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Zanzibar, Google's relationship-based authorization system, gives many Google services "a uniform data model and configuration language for expressing access control policies". It scales to "trillions of access control lists and millions of authorization requests per second", with p95 latency under 10 ms and availability above 99.999% over 3 years. Its authorization decisions "respect the causal ordering of user actions", which gives external consistency when ACLs and content change. — [Pang et al., USENIX ATC '19](https://www.usenix.org/conference/atc19/presentation/pang)

**Filtering lists and searches by permission (ReBAC engines)**
- OpenFGA documents three ways to filter search results by permission:
  - "Search then Check": query the database, then Batch Check the results. Recommended when a query returns few results.
  - "List of IDs then search": use ListObjects, then the database query. This becomes impractical beyond roughly 1,000 accessible objects.
  - A local index built from the `/changes` feed: suits many accessible objects that are a small share of the total. Because the index can lag behind revocations, the docs recommend a final `/check` before returning results.
  - OpenFGA "doesn't store object metadata", so filtering and sorting stay in the application's database. Narrowing the query by tenant or a higher-level resource makes the hard cases tractable.
  — [OpenFGA: Search with permissions](https://openfga.dev/docs/interacting/search-with-permissions)

**Policy engines used with MCP**
- Cerbos (Feb 13, 2026) puts a stateless external policy decision point (PDP) behind the MCP server, with policies written in YAML. Its pattern:
  - Each tool is modeled as an action on a resource kind (e.g. `mcp::expenses`), and the actions are checked in one batched call.
  - At session setup the server checks the caller against every tool and enables only the allowed ones. Hidden tools are "not executable", and the client is notified that the list changed.
  - Tool handlers do their own finer checks as defense in depth.
  - Policies can use resource attributes (amount, department) and environment attributes (time).
  — [Cerbos: MCP Authorization](https://www.cerbos.dev/blog/mcp-authorization)
- In the same article, Cerbos logs every decision with "principal, its roles and attributes, the action and resource, the applicable policy, and the outcome". It also recommends that agents acting for a user get an "attenuated set of permissions for the specific use case", meaning a subset of the user's rights, not all of them. — [Cerbos: MCP Authorization](https://www.cerbos.dev/blog/mcp-authorization)
- Cerbos argues that OAuth scopes alone cannot express fine-grained tool authorization. It discusses AuthZEN as an emerging standard for the PEP-to-PDP call. — [Cerbos: MCP Authorization Standards](https://www.cerbos.dev/blog/mcp-authorization-standards) (search summary; page not fetched)
- Permit.io describes an MCP-aware gateway built on OPA + OPAL that intercepts each tool call and supports RBAC, ABAC and ReBAC. — [Permit.io: Authorization strategies for MCP](https://www.permit.io/blog/authorization-strategies-for-model-context-protocol-mcp) and [Permit.io AI access control](https://www.permit.io/ai-access-control) (vendor; search summary; pages not fetched)
- Auth0's guide models MCP tool access in Auth0 FGA/OpenFGA as relationships. It covers public tools, roles, group membership, time-limited access and resource-specific permissions. — [Auth0 docs: Control Access to MCP Tools with FGA](https://auth0.com/ai/docs/mcp/get-started/secure-mcp-server-with-auth0-fga) (search summary; page not fetched)
- The MCP spec's security best practices list "Treating claimed scopes in token as sufficient without server-side authorization logic" as a common mistake. They recommend a progressive least-privilege model with incremental elevation through `WWW-Authenticate scope=` challenges, and logging elevation events with correlation IDs. — [MCP spec 2025-11-25: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- The MCP tools spec requires servers to "Validate all tool inputs", "Implement proper access controls", "Rate limit tool invocations" and "Sanitize tool outputs". Clients "MUST consider tool annotations to be untrusted unless they come from trusted servers". — [MCP spec 2025-11-25: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

### Inferences
- **"Most specific wins" over whole rules has a concrete hazard in the current draft.** `matchRule()` picks one rule and `accessFor()` reads only that rule's map. Suppose an admin adds a department rule to give Support/Tier-2 Write on Tickets. The people it matches silently lose every dataset the business-unit or audience-wide rule granted but the department rule did not list, because those datasets now resolve to `"none"`. Specificity also means a narrower rule can *widen* access beyond an org-wide intent. For example, an audience-wide "Partners: None on Customer accounts" is overridden by any department-level Partner rule. There is also no way to say "never" org-wide. When two rules have equal specificity, the result depends on array order, because the stable sort keeps the first match.
- **Recommended resolution, per dataset and per tool:**
  1. Default deny.
  2. Effective level = the *maximum* across all matching grants (a union, monotonic and order-independent).
  3. Cap that level by non-overridable **ceilings and forbids**, where deny overrides. Examples: "external audiences can never hold Manage", "Partners never see billing fields", "external audiences are always company-scoped on Tickets and Accounts".
  4. Return and log the determining rules, as Cedar's diagnostics do.

  This matches Cedar's permit/forbid semantics and Postgres's permissive-OR/restrictive-AND, both cited above. Admins can predict and audit it, because adding a grant never reduces access and adding a forbid never increases it.
- If the product wants "exceptions" (department X gets *less* than its business unit), model them as explicit forbids or deny rules scoped to that department, not as specificity shadowing. Explanations then stay local, e.g. "Denied by rule 'No Write on Accounts for Partner Sales'".
- **Model choice.** The audience, business-unit and department dimensions are attribute-based (ABAC on directory claims) and fit Cedar or Cerbos well. Record-level tenancy is relational: "own company only", a reseller seeing its resold customers' tickets, a partner seeing co-sold accounts, a client user seeing tickets they requested or are CC'd on. "Own company only" as a boolean cannot express reseller-of or partner-of relationships, so a ReBAC store (OpenFGA, SpiceDB, or Postgres relationship tables) is the natural fit there. A hybrid fits this product: Cedar, or a Cerbos-style PDP, decides at the tool and dataset level, and relationship checks or filters decide at the record level.
- In the MCP flow, run the PDP twice: (a) at `tools/list`, to hide tools the person cannot use (the draft already does this in `toClientView`), and (b) on **every** `tools/call`, because the earlier list can go stale and clients are untrusted. Hiding tools is a UX measure, not enforcement.
- Map Write/Manage to tool safety on the server (the draft's `REQUIRED_ACCESS`). Never rely on client-side `destructiveHint` prompts as the control, since clients may auto-approve (see section 6).
- Attributes captured "at sign-in" go stale. Someone who moves department keeps the old department's access until their token is reissued. Either re-resolve directory attributes on each call from a directory synced by SCIM or the IdP, or keep tokens short-lived and revoke sessions on directory change events. This is an inference; no source was found that addresses MCP specifically.

### Gaps
- No primary source evaluates "most specific wins" as a strategy for MCP or SaaS authorization. The critique above is reasoned from Cedar, Postgres RLS and the draft code. XACML 3.0 combining algorithms (deny-overrides, permit-overrides, first-applicable) and AWS IAM's "explicit deny overrides allow" are well-known precedents, but were not fetched in this session.
- No independent benchmarks or 2026 pricing for Cerbos, Permit.io, OpenFGA/Auth0 FGA or Cedar/Amazon Verified Permissions specific to MCP. The vendor MCP guides are marketing-adjacent.
- AuthZEN's standardization status as of Oct 2026 was not verified.

---

## 2. Acting on behalf of the user vs as a service account, permission drift, and what "access mirrors the user's permissions" requires

### Takeaway
The market standard for internal staff is "the AI only sees what this user can already see in the source system". Microsoft Copilot and ChatGPT both state this. A separate grant model run through a service account becomes the only gate, so any gap between it and the source-system ACLs becomes privilege escalation. The safest design treats the MCP server policy as a **ceiling intersected with** the user's own source permissions, never a replacement for them. External audiences usually have no source-system identity, so for them the server policy plus authoritative company relationships must carry the whole load.

### Cited Findings
- The MCP spec forbids token passthrough: "MCP servers **MUST NOT** accept any tokens that were not explicitly issued for the MCP server." The listed risks are bypassed controls and audit trails that "may show requests that appear to come from a different source with a different identity", which makes "incident investigation, controls, and auditing more difficult". — [MCP spec 2025-11-25: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- MCP proxy servers that call third-party APIs with a static client ID are exposed to confused-deputy attacks and "MUST implement per-client consent". — [MCP spec 2025-11-25: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- Microsoft states that Copilot "only surfaces organizational data to which individual users have at least view permissions", and that "It's important that you're using the permission models available in Microsoft 365 services, such as SharePoint, to help ensure the right users or groups have the right access". It adds that "Semantic Index honors the user identity-based access boundary", and that data from Graph connectors is returned "if the user has permission to access that information". (ms.date 2026-07-09) — [Microsoft Learn: Data, Privacy, and Security for Microsoft Copilot](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy)
- OpenAI says ChatGPT apps and connectors respect the organization's existing permissions and that each end user must authenticate with the connected application. Its synced apps either record a user's access to a file directly or "sync the file's permissions and directory information to resolve group membership". App permissions "don't add access". — [OpenAI Enterprise privacy](https://openai.com/enterprise-privacy/), [ChatGPT apps with sync](https://help.openai.com/en/articles/10847137-chatgpt-apps-with-sync), [Apps in ChatGPT](https://help.openai.com/en/articles/11487775-apps-in-chatgpt), [Company knowledge](https://openai.com/index/introducing-company-knowledge/) (search summaries; OpenAI pages returned 403 when fetched)
- Claude custom connectors normally require each user to "individually connect to and enable that connector". With a fixed shared credential, though, "everyone who uses the connector reaches the service with that same credential". Connections originate "from Anthropic's cloud infrastructure, rather than from your local device". — [Claude Help: Custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- Cerbos recommends that agents acting for a user receive an "attenuated set of permissions" derived from that user, not the user's full rights. — [Cerbos: MCP Authorization](https://www.cerbos.dev/blog/mcp-authorization)
- Synced permission indexes lag: OpenFGA warns that a local index "can lag behind recent revocations" and recommends a final `/check` before returning results. — [OpenFGA: Search with permissions](https://openfga.dev/docs/interacting/search-with-permissions)
- Zanzibar treats causal consistency between ACL changes and content reads as a core requirement. — [Pang et al., USENIX ATC '19](https://www.usenix.org/conference/atc19/presentation/pang)

### Inferences
- **Two very different risk profiles:**
  - (a) *Delegated / on-behalf-of*: the MCP server calls the source system with the user's own delegated credential, obtained through its own OAuth client or token exchange, never by passing the client's token through. The source's ACLs then apply automatically, and the server policy can only narrow them.
  - (b) *Service account*: web-agent reads with broad grants and filters with its own rules. The web-agent rule set then becomes a second, parallel ACL system that can drift.

  Drift appears when the source revokes access or someone changes department while web-agent still grants it, when web-agent rules are broader than source ACLs (escalation), when record-level ACLs exist in the source (private tickets, restricted runbooks) that web-agent's dataset-level rules cannot see, and when group membership updates arrive late.
- **What "access mirrors the user's permissions" requires technically:**
  1. A per-user identity on every call: a user-bound token issued to the MCP server and validated for audience. No shared static API keys for non-public datasets. Claude's shared-credential mode would collapse every user into one identity.
  2. Either delegated calls to the source, or synced ACLs and group memberships with a stated freshness SLA plus a final check at read time for each record.
  3. Permission-aware retrieval in which filtering happens *before* ranking, snippet generation, counts and embedding search. Post-filtering can leak titles, counts or snippets.
  4. Revocation that takes effect within a bounded time.
  5. An audit trail recording which identity, rule and source ACL produced each record.
- **Effective access = web-agent policy ∩ the user's source ACL ∩ token scopes.** Present the web-agent rules to admins as a *ceiling* ("what AI clients may reach at most"), not a grant system. This directly addresses the escalation risk.
- Mirroring also copies existing **oversharing**. Microsoft's guidance implicitly warns that Copilot exposes whatever the permission model already allows. Keep sensitivity ceilings (e.g., no billing fields to Partners) even where source ACLs would allow access.
- **External audiences** (Clients, Partners, Resellers) usually have no account in the internal source systems. The "which company is this person from" claim must come from an authoritative mapping, such as a verified email domain, an IdP organization claim or a CRM contact-to-account link, never from user input. The relationship graph (reseller → customer accounts) needs its own owner and review process, because it is effectively the ACL for externals.
- Hosted datasets (help center, release notes) are mostly public or internal content where a service-account read plus server policy is fine. Support tickets and customer accounts carry third-party personal data and per-record ACLs in their source systems, so they warrant delegated or ACL-synced access.

### Gaps
- Which source systems back each dataset (e.g., Zendesk, Salesforce, Stripe) is unknown, so delegated-access feasibility per dataset could not be assessed.
- No primary source quantifies permission-drift incidents for AI connectors. The risk is reasoned from first principles plus vendor guidance.
- The MCP authorization spec's specific guidance on downstream token exchange (RFC 8693) was not re-read here; it falls under the OAuth researcher's scope.

---

## 3. Row-level and field-level controls, data minimization, and LLM context exposure (provider retention and training)

### Takeaway
Enforce tenant scoping in the data layer as well as in application code: Postgres RLS with FORCE, restrictive tenant policies and no BYPASSRLS roles in the MCP path. Return only allow-listed fields per audience, with masking or tokenization of PII. Every tool result goes into the connecting user's AI provider context. Commercial plans of Anthropic and OpenAI do not train on it by default. Consumer plans may train on it if the user has opted in: Anthropic retains such data for 5 years, and OpenAI trains when "Improve the model for everyone" is on. web-agent cannot see which plan the client is on.

### Cited Findings
**Row-level security (Postgres)**
- With RLS enabled and no policy, the default is deny. "Superusers and roles with the `BYPASSRLS` attribute always bypass the row security system", and "Table owners normally bypass row security as well", unless `ALTER TABLE … FORCE ROW LEVEL SECURITY` is set. — [PostgreSQL docs: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Restrictive policies are combined with AND, which suits a mandatory tenant predicate layered over permissive grants. — [PostgreSQL docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- "Referential integrity checks, such as unique or primary key constraints and foreign key references, always bypass row security". The docs warn about "covert channel" leaks through them. Policies with sub-SELECTs can see stale data under READ COMMITTED. — [PostgreSQL docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

**Tool outputs and minimization**
- MCP servers "MUST … Sanitize tool outputs". Tools may declare an `outputSchema`, and if they do, "Servers MUST provide structured results that conform to this schema". Content items support `audience` annotations (`["user"]`, `["assistant"]`). — [MCP spec 2025-11-25: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- One third-party admin guide notes that ChatGPT's admin controls "don't inspect the data an app returns", so values such as SSNs in a source record land in the conversation unredacted. Redaction is therefore the server's job. — [CData: ChatGPT Enterprise connectors guide](https://www.cdata.com/blog/chatgpt-enterprise-connectors-guide) / [StackOne: MCP gateway for ChatGPT Enterprise](https://www.stackone.com/blog/best-mcp-gateway-for-chatgpt-enterprise/) (third-party; search summary; pages not fetched)
- The EDPB's Support Pool of Experts report "AI Privacy Risks & Mitigations – Large Language Models" (April 2025) gives a risk-management method for LLM systems, with use cases including a customer chatbot. It covers risks such as data leakage, memorization, unintended profiling and re-identification. It states the authors' views, not the EDPB's official position. — [EDPB SPE report](https://www.edpb.europa.eu/our-work-tools/our-documents/support-pool-experts-projects/ai-privacy-risks-mitigations-large_en) (landing page via search; full PDF not read)

**Anthropic (Claude) retention and training**
- Commercial (Claude for Work Team/Enterprise, API): "By default, we will not use your inputs or outputs from our commercial products" to train models, unless the customer gives feedback or opts in. Thumbs-up/down feedback stores "the entire related conversation" for up to 5 years, de-linked from user IDs. "Feedback data does not include raw content from connectors", including remote and local MCP servers, unless the content is "directly copied into your conversation". (Last updated Aug 18, 2026.) — [Anthropic Privacy Center: Is my data used for model training?](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
- Retention (last updated Jul 1, 2026):
  - API inputs and outputs are deleted "within 30 days of receipt or generation" by default.
  - Claude for Work/Enterprise chats persist in the product until deleted, then are "Deleted from our back-end storage systems within 30 days".
  - Data flagged under the Usage Policy is kept for up to 2 years, and its classification scores for up to 7 years.
  - "Covered Models are subject to separate, limited retention and review requirements."

  — [Anthropic Privacy Center: How long do you store my organization's data?](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- For commercial products the customer is the controller and Anthropic "acts as a 'Processor'", processing data "only … as instructed by the customer". — [Anthropic Privacy Center: Processor or controller](https://privacy.claude.com/en/articles/9267385-does-anthropic-act-as-a-data-processor-or-controller)
- Consumer (Free, Pro, Max, and Claude Code on those plans): users choose whether their data is used for training. Opted-in data is retained for 5 years, otherwise for 30 days. Excluded from this are Claude for Work, Gov, Education and the API, including via Bedrock and Vertex. — [Anthropic: Updates to Consumer Terms](https://www.anthropic.com/news/updates-to-our-consumer-terms)
- Anthropic says Google Workspace connector data is not used for training, that retrieved connector data is stored with the chat and deleted with it, and that on consumer plans with training enabled, connector content copied into chats may be used. — [Claude Help: Google Workspace connectors](https://support.claude.com/en/articles/10166901-use-google-workspace-connectors) (search summary; page not fetched)
- Anthropic's privacy policy update effective Jul 8, 2026 reportedly adds detail on what is shared with a third party when a user connects a service, and what Anthropic receives back. — [Anthropic Privacy Center: Updates to our Privacy Policy](https://privacy.claude.com/en/articles/10301952-updates-to-our-privacy-policy) (search summary; page not fetched)
- In June 2026 Anthropic introduced mandatory 30-day retention of traffic on its most advanced models (named in reporting as Claude Fable 5 and Mythos 5) to defend against misuse, with no use for training. After enterprise pushback it announced "Enterprise Frontier Safeguards" on Sep 1, 2026, which allow automated safety monitoring without Anthropic human review. Rollout is phased, and the June policy still applies to non-enterprise users of Mythos-class models. — [PYMNTS, Sep 1, 2026](https://www.pymnts.com/?p=4144828) (single news source; corroborated only indirectly by the "Covered Models" line in Anthropic's retention article)

**OpenAI (ChatGPT) retention and training**
- For Business, Enterprise and Edu, OpenAI does not use information accessed from apps or connectors to train models by default. For Free, Plus, Go and Pro, OpenAI "may use information accessed from apps to train our models" if "Improve the model for everyone" is on. — [Apps in ChatGPT](https://help.openai.com/en/articles/11487775-apps-in-chatgpt), [OpenAI Enterprise privacy](https://openai.com/enterprise-privacy/) (search summaries; pages returned 403)

**Data residency**
- Microsoft Copilot routes LLM calls to the nearest region but "also can call into other regions where capacity is available". It keeps EU traffic in the EU Data Boundary, yet "Models provided by Anthropic as a subprocessor are currently excluded from the EU Data Boundary". — [Microsoft Learn: Copilot privacy](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy)

### Inferences
- **Tenant isolation as an invariant.** For external audiences, company scoping on datasets with customer data (Tickets, Accounts) should be **mandatory and non-toggleable**. Today `companyScopedIds` is an optional per-dataset list. Enforce it twice: in the PDP or query builder, and as a restrictive Postgres RLS policy keyed to a per-request setting (e.g., `SET LOCAL app.company_id` inside the transaction). Use FORCE RLS, and make sure the MCP runtime role is neither owner, superuser nor BYPASSRLS. With pooled serverless connections, set the per-request value inside a transaction so it cannot leak across requests. That last point is an engineering inference, not sourced.
- **Field-level controls per audience.** Use `outputSchema` per tool and audience as an allowlist. Mask or tokenize PII: contact emails and phones, billing details, payment identifiers. Remove customer conversation bodies from ticket results for Partners and Resellers by default. Support tickets contain **third parties' personal data** (the client's end customers), and exposing it to Partners or Resellers is a new disclosure that needs a lawful basis.
- **Minimize by design.** Cap result counts with pagination, offer no "export all" tools to external audiences, return IDs and summaries before full records, truncate long fields, and rate-limit to slow bulk exfiltration through repeated calls. The MCP spec requires rate limiting (see above).
- **Leaving the trust boundary.** Once a tool result is returned, it sits in the connecting user's AI provider context and falls under *that user's* plan:
  - Enterprise/commercial: no training by default, roughly 30-day backend deletion after the chat is deleted, possible 30-day safety retention for frontier models.
  - Consumer: Anthropic consumer users who opted in have data kept for 5 years and used for training. OpenAI consumer plans may train when the setting is on.

  web-agent cannot verify the client's plan from the MCP request. An *external* partner using a personal consumer account could cause a company's customer data to be used for training. Mitigations: admin-configurable allowlists of approved AI clients (OAuth client identity; mechanics belong to the OAuth researcher), contractual terms for external audiences (e.g., "use only business-tier AI with training disabled"), and stricter field minimization for externals.
- **Residency.** web-agent can keep datasets in-region, but where the LLM processes them is decided by the client's AI provider and plan. Microsoft's Anthropic carve-out shows that LLM processing location can differ from where the data is stored. The ADR should say plainly that residency guarantees end at the MCP response.

### Gaps
- OpenAI's own retention periods for business-tier conversations containing connector or app data could not be verified (openai.com and help.openai.com returned 403).
- No Anthropic page specifically states how long MCP tool *results* inside Enterprise chats are retained, beyond the general chat retention.
- Enterprise Frontier Safeguards details (retention period, availability date) rest on one news report.
- Anthropic and OpenAI data-residency options for Claude Enterprise and ChatGPT Enterprise (EU/Canada processing regions) were not researched in this session.
- No source was found on PHI handling through MCP connectors. A secondary article claims connector data sent to third parties is not covered by a BAA, but it was not verified.

---

## 4. Audit logging for MCP: what to log, immutability, retention, privacy of logged arguments, exposure to customer admins, and OpenTelemetry conventions

### Takeaway
OpenTelemetry now has MCP semantic conventions, at Development stability, in the new `semantic-conventions-genai` repo. They standardize span names and attributes such as `mcp.method.name`, `gen_ai.tool.name`, `mcp.session.id` and `jsonrpc.request.id`, and mark tool-call arguments and results as **opt-in, sensitive**. Treat OTel as the operational telemetry layer. Keep a separate append-only audit log that adds the authorization decision, the determining rules and the record IDs returned, and stores redacted or hashed arguments rather than raw content.

### Cited Findings
- The GenAI semantic conventions, MCP included, have moved out of the main OpenTelemetry site into a dedicated repository; the old page "is no longer maintained". — [opentelemetry.io MCP page (moved notice)](https://opentelemetry.io/docs/specs/semconv/gen-ai/mcp/), [open-telemetry/semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai)
- MCP span conventions, all at Development stability:
  - Span name: `{mcp.method.name} {target}`, where the target is the tool or prompt name. Resource URIs in the name are opt-in only, to keep cardinality low.
  - Span kinds: CLIENT and SERVER.
  - Required: `mcp.method.name`.
  - Conditionally required: `gen_ai.tool.name`, `jsonrpc.request.id`, `mcp.resource.uri`, `error.type`, `rpc.response.status_code`.
  - Recommended: `gen_ai.operation.name=execute_tool`, `mcp.protocol.version`, `mcp.session.id`, `client.address`, `network.transport`.
  - **Opt-in:** `gen_ai.tool.call.arguments`, `gen_ai.tool.call.result`, `gen_ai.prompt.variable`, each marked "This attribute may contain sensitive information."

  — [semantic-conventions-genai: docs/gen-ai/mcp.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/mcp.md)
- MCP metrics, all histograms in seconds: `mcp.server.operation.duration`, `mcp.server.session.duration`, `mcp.client.operation.duration`, `mcp.client.session.duration`. — [semantic-conventions-genai: mcp.md](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/mcp.md)
- The MCP spec tells clients they "SHOULD … Log tool usage for audit purposes". Servers should "Log elevation events (scope requested, granted subset) with correlation IDs". A single omnibus scope "masks user intent per operation", which the spec counts as an audit problem. — [MCP spec: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [MCP spec: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- Token passthrough breaks accountability, because the server "will be unable to identify or distinguish between MCP Clients". — [MCP spec: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- Cerbos audit entries record principal, roles and attributes, action, resource, applicable policy and outcome, for forensics and compliance reporting. — [Cerbos: MCP Authorization](https://www.cerbos.dev/blog/mcp-authorization)
- Cedar decisions carry "determining policies" and error diagnostics, so the matched rule can be logged directly. — [Cedar docs](https://docs.cedarpolicy.com/auth/authorization.html)
- Reference points from AI platforms:
  - Microsoft stores Copilot prompts, responses and citations. Admins can search them with Content search or Purview and set retention policies, and users can delete their own activity history. — [Microsoft Learn: Copilot privacy](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy)
  - Third-party guides report that ChatGPT app activity goes to OpenAI's Compliance Logs Platform, which is "immutable" with 30-day retention, and that OpenAI recommends continuous export to a SIEM. — [CData guide](https://www.cdata.com/blog/chatgpt-enterprise-connectors-guide) / [StackOne](https://www.stackone.com/blog/best-mcp-gateway-for-chatgpt-enterprise/) (third-party; not verified on OpenAI's site)

### Inferences
- **What each audit record should contain** (combining OTel, Cerbos and Cedar):
  - Timestamp; `jsonrpc.request.id`; `mcp.session.id`; server slug and version.
  - Principal: stable user ID, audience, business unit, department, company ID and the source of each attribute.
  - OAuth client identity (which AI app) and token scopes.
  - `mcp.method.name` and tool name; datasets touched.
  - Decision (allow or deny), determining rule IDs, policy version, any ceiling or forbid that applied.
  - **Record IDs returned** (or a hash plus count when there are very many), row count, byte size, fields redacted or masked.
  - For writes: before and after record references.
  - Latency and error type.
- **Arguments.** Never log raw arguments or results by default (OTel makes them opt-in for this reason). Store a redacted argument template plus a keyed HMAC of sensitive values, so investigators can match "who searched for X" without storing X. Free-text search queries can themselves be personal data.
- **Immutability.** Use an append-only store with no update or delete for app roles, WORM object storage or hash-chaining for tamper evidence, and a stream to customer SIEMs. Keep audit logs logically separate from the operational datasets.
- **Retention.** GDPR storage limitation (Art. 5(1)(e)) and audit needs pull in opposite directions. A customer-configurable retention period with a sensible default (e.g., 1 year) and legal hold seems a reasonable middle ground. OpenAI's reported 30-day platform retention suggests vendors expect customers to export logs and keep them longer in their own SIEM.
- **Exposure to customer admins.** Admins of the data-owning company should see every access to their data, including by externals. External users should be told in the connect consent screen and the privacy notice that their access is logged and visible to the data owner. Consider a per-record "accessed via AI connector" history on sensitive records (tickets, accounts) for data owners.
- **Decision logs double as policy-testing data.** Replaying logged requests against a proposed rule change shows who would gain or lose access, which mitigates the shadowing hazard described in section 1.

### Gaps
- No authoritative source (AICPA, ISO, or a regulator) was found that prescribes MCP-specific audit fields or retention periods.
- The exact OTel semconv release that includes the MCP conventions, and the date of the repository move, were not determined.
- No source was found on hash-chained or WORM audit-log practice specific to AI connectors. That recommendation is general security practice and was not sourced here.

---

## 5. Compliance obligations: GDPR, SOC 2, ISO/IEC 27001 and 42001, the EU AI Act, data residency, PIPEDA and Quebec Law 25

### Takeaway
GDPR, PIPEDA and Quebec Law 25 do most of the work here. web-agent is a processor for the data-owning company. The AI provider is chosen by the *connecting user's* organization, which makes it that organization's processor, or a controller in consumer settings, rather than web-agent's sub-processor. Exposing tickets and accounts to external audiences is a disclosure the controller must justify. A DPIA (GDPR) or PIA (Law 25 s.3.3 and s.17) is likely expected. The EU AI Act is mostly out of scope for a data connector. As of the Digital Omnibus (Reg. (EU) 2026/1744, in force 27 Jul 2026), Annex III high-risk obligations start on 2 Dec 2027.

### Cited Findings
**EU AI Act status**
- The Digital Omnibus on AI, Regulation (EU) 2026/1744, was published in the Official Journal on 24 Jul 2026 and entered into force 27 Jul 2026. Parliament approved it on 16 Jun and the Council on 29 Jun 2026. — [Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/), [artificialintelligenceact.eu: Digital Omnibus](https://artificialintelligenceact.eu/ai-act-explorer/digital-omnibus/) (search summaries)
- New dates under the Omnibus:
  - Annex III and Article 6(2) high-risk obligations move from 2 Aug 2026 to **2 Dec 2027**.
  - Annex I and Article 6(1) systems move to 2 Aug 2028.
  - Systems used by public authorities move to 2 Aug 2030.
  - Providers of synthetic-content systems already on the market before 2 Aug 2026 have until 2 Dec 2026 for Art. 50(2).
  - A new "small mid-cap" category (fewer than 750 staff) gets SME-style relief.

  — [Orrick, 29 Jul 2026](https://www.orrick.com/en/Insights/2026/07/EU-AI-Act-Update-Digital-Omnibus-Finalizes-8-Compliance-Changes)
- Article 50 transparency duties otherwise apply from 2 Aug 2026 and were not delayed. — [Jones Walker](https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html) (search summary)

**GDPR and EDPB**
- The EDPB's SPE report on LLM privacy risks (April 2025) provides a risk methodology that can serve as DPIA input for LLM-based systems. It is not an official EDPB position. — [EDPB SPE report](https://www.edpb.europa.eu/our-work-tools/our-documents/support-pool-experts-projects/ai-privacy-risks-mitigations-large_en)
- Anthropic acts as processor for commercial customers. — [Anthropic Privacy Center](https://privacy.claude.com/en/articles/9267385-does-anthropic-act-as-a-data-processor-or-controller)

**Canada: PIPEDA**
- An organization stays responsible for personal information transferred to a third party for processing. Contracts should guarantee confidentiality and security and allow oversight, monitoring and audit. Even with a contract, an organization can breach Principle 4.1.3 if it cannot confirm what happens to the data after transfer. — [OPC Interpretation Bulletin: Accountability](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_02_acc/), [OPC Guidelines for processing personal data across borders](https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/) (search summaries)
- The OPC's **Guidance on assessing third-party service providers** (modified 2026-09-10; comments accepted until **4 Dec 2026**) asks organizations to:
  - identify all personal information involved and every purpose for it;
  - map data flows, including subcontractors;
  - identify sub-processors in writing;
  - assess cross-border risks;
  - verify safeguards and breach handling;
  - confirm retention and destruction, including backups;
  - plan access logs and audit rights.

  It asks whether consent is needed if the provider will use personal information "to train an algorithm or to improve internal processes". — [OPC: Guidance on assessing third-party service providers](https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/gd_third-party_202609/)
- PIPEDA Findings #2026-002, a joint investigation of OpenAI, found contraventions of s.6.1 and Principle 4.3 (consent). Federal, provincial and territorial regulators adopted principles for responsible generative AI in December 2023. — [OPC PIPEDA Findings #2026-002](https://www.priv.gc.ca/en/opc-actions-and-decisions/investigations/investigations-into-businesses/2026/pipeda-2026-002/) (search summary; page not fetched)
- Under PIPEDA, processors are not required to report breaches; that duty sits with the organization using them. — [OPC ETHI issue sheets, Oct 2025](https://www.priv.gc.ca/en/privacy-and-transparency-at-the-opc/proactive-disclosure/opc-parl-bp/ethi_20251006/is_20251006/) (search summary)

**Quebec Law 25** (Act respecting the protection of personal information in the private sector)
- s.3.3 requires a PIA before acquiring, developing or overhauling an information system or electronic service delivery system involving personal information. An "artificial intelligence system" is given as an example.
- s.17 requires a PIA before communicating personal information outside Québec or entrusting it to someone outside Québec. The assessment must weigh sensitivity, purposes, protective measures (including contractual ones) and the destination's legal framework. Transfer is allowed only if protection is adequate, and it requires a **written agreement** reflecting the PIA.
- The CAI published its PIA guide on 22 Sep 2023, in French.

— [McCarthy Tétrault, 3 Nov 2023](https://www.mccarthy.ca/en/insights/blogs/techlex/quebec-privacy-regulators-guide-law-25-compliant-privacy-impact-assessments). The statute itself at [LégisQuébec P-39.1](https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1) returned 403 and was not read.

**SOC 2 and ISO**
- ISO/IEC 42001:2023's scope includes "processes for the management of suppliers, partners and third parties that provide or develop AI systems for the organization", and it is certifiable. ISO/IEC 27090 (cybersecurity guidance for AI) reached FDIS in March 2026. ISO/IEC 42006 sets requirements for bodies that certify AI management systems. — [ISO OBP: ISO/IEC 42001](https://www.iso.org/obp/ui#iso:std:iso-iec:42001:ed-1:v1:en) (search summary)
- A 2026 paper notes that SOC 2 has no AI-specific criteria, so auditors map AI controls onto the existing Trust Services Criteria. AIUC-1 positions itself as "SOC 2 for AI agents". — [arXiv 2604.04749](https://arxiv.org/pdf/2604.04749) (search summary; secondary)
- Microsoft lists ISO 42001, ISO 27001, GDPR and HIPAA among Copilot's compliance offerings, an example of what enterprise buyers expect to see. — [Microsoft Learn: Copilot privacy](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy)

### Inferences
- **GDPR roles in practice:**
  - The data-owning company is the controller and web-agent its processor (Art. 28 DPA).
  - When **internal staff** connect their company's Claude Enterprise or ChatGPT Enterprise, the AI provider is the company's *own* processor under the company's own contract. It is not web-agent's sub-processor, unless web-agent itself calls an LLM, e.g. to summarize tool results server-side. web-agent's sub-processor list should state this boundary explicitly.
  - When **external audiences** connect, the company is disclosing personal data to a third party (the client, partner or reseller). The recipient becomes a controller, or processor, of what it receives, and its AI provider is its own choice.

  The controller needs a lawful basis for that disclosure. Legitimate interest or contract may work for a client seeing its own tickets. It is much weaker for partners or resellers seeing end-customer conversations.
- **DPIA (GDPR Art. 35).** The feature combines new technology (LLM processing), potentially large-scale processing, data about third parties (end customers inside tickets) and external disclosure. On the usual EDPB/WP29 DPIA criteria, it likely warrants a DPIA template that web-agent provides to customers. The EDPB SPE LLM methodology is a usable basis. GDPR article references (Art. 5, 25, 28, 30, 32, 35) are stable legal text, see [GDPR on EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj); they were not re-fetched in this session.
- **Privacy by design and by default (GDPR Art. 25; Law 25 s.9.1 "highest level of confidentiality by default").** Defaults should be: no external audience, company scoping on, conversation bodies and billing fields excluded, Write and Manage off.
- **EU AI Act.** An MCP server that exposes datasets is data-access infrastructure. On its own it is unlikely to count as an "AI system", and it is not GPAI. Obligations mostly fall on the GPAI providers (Anthropic, OpenAI) and on deployers in Annex III use cases. If a customer uses web-agent data for Annex III decisions, such as employment or creditworthiness, it may become a high-risk deployer from 2 Dec 2027. That is the customer's role, though web-agent should support it with logging and documentation. This conclusion needs legal review.
- **SOC 2 / ISO 27001 mapping.** The feature mainly touches logical access, change management of policies (rule changes are security-relevant changes), monitoring and logging, vendor management and data classification. Expect auditors to sample rule changes and decision logs, so version policies and keep an approval trail for rule edits. ISO 42001 becomes relevant if web-agent positions itself as part of customers' AI management systems. The specific TSC and Annex A control IDs (e.g., CC6.1, CC7.2, ISO 27001:2022 A.8.15 Logging) come from background knowledge and were not verified this session.
- **Canada.** For Québec customers whose staff connect US-hosted AI clients, the *company* (as controller) owes a s.17 PIA and a written agreement with its AI provider. web-agent can make this easier with a PIA kit that documents data flows, fields, logging and retention. Under PIPEDA 4.1.3, customers will ask web-agent the OPC third-party checklist questions (sub-processors, cross-border, retention, audit rights, AI training). The answers should be ready in a trust page.
- **Data residency.** web-agent can offer regional hosting of datasets and audit logs (EU, Canada). It cannot guarantee residency of LLM processing, which depends on the client's AI provider.

### Gaps
- The Official Journal text of Reg. (EU) 2026/1744 was not read. Whether the Omnibus changed the Art. 4 AI literacy obligation, as was proposed in late 2025, was not verified.
- No regulator guidance (EDPB, ICO, CNIL, OPC, CAI) was found that addresses MCP or AI connectors specifically. ICO and CNIL pages were not reached in this session.
- No AICPA guidance on scoping AI subservice organizations in SOC 2 was found.
- Law 25 statutory text was not fetched (403); s.9.1 and s.3.3 wording rely on secondary sources and background knowledge.
- The status of the OPC's recommended PIPEDA reforms (mandatory PIAs for high-impact AI) was not verified.

---

## 6. Consent and transparency: what end users and data owners should see, and admin approval of external audiences

### Takeaway
The MCP spec and the major AI platforms all put a human and an admin in the loop: admins approve which connectors and tools exist, and users see which tools are exposed and confirm sensitive actions. Client-side approval cannot be relied on, though, because Claude's Research mode calls connector tools without per-call approval. web-agent should provide its own consent and transparency layer. It should show which datasets, access levels and fields a person gets, and warn that results go to their AI provider under that provider's retention terms. Data owners should explicitly approve each external audience, or each external company.

### Cited Findings
- MCP: "there SHOULD always be a human in the loop with the ability to deny tool invocations". Applications SHOULD "Provide UI that makes clear which tools are being exposed to the AI model", show visual indicators when tools are invoked, and present confirmation prompts. Clients SHOULD "Show tool inputs to the user before calling the server, to avoid malicious or accidental data exfiltration". — [MCP spec 2025-11-25: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- For MCP proxy servers, the consent page "MUST: Clearly identify the requesting MCP client by name; Display the specific third-party API scopes being requested; Show the registered `redirect_uri`". — [MCP spec: Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)
- Claude: on Team plans only Owners or Primary Owners can add custom connectors. On Enterprise, the same applies to people "with a custom role that includes Manage access to Libraries". Users then connect individually. Users should only click "Allow always" for trusted tools. In Research mode "Claude can invoke tools from your connectors automatically without further approval", and users are told to disable write-capable tools before using Research. — [Claude Help: Custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- Claude Team and Enterprise admins can stop member feedback submission ("Rate chats"), which would otherwise send conversations, including copied connector content, to Anthropic for up to 5 years. — [Anthropic Privacy Center: training](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
- ChatGPT, per third-party guides:
  - Admins and owners control developer mode and publish MCP apps, using RBAC.
  - After approval, ChatGPT uses a frozen snapshot of the app's tools. Server changes arrive disabled until an admin reviews them.
  - Approval prompts default to "Important actions", with "Always ask", "Any changes" and "Never ask" available.

  — [Composio: ChatGPT custom connectors](https://composio.dev/blog/chatgpt-custom-connectors-connect-any-app-with-mcp), [CData](https://www.cdata.com/blog/chatgpt-enterprise-connectors-guide) (third-party; search summary; not verified on OpenAI's site). OpenAI states that workspace admins control which apps are enabled — [Apps in ChatGPT](https://help.openai.com/en/articles/11487775-apps-in-chatgpt) (search summary)
- Microsoft: in Integrated apps, admins "can view the permissions and data access required by an agent as well as the agent's terms of use and privacy statement". "Admins have full control to select which agents are allowed", and users reach only agents their admin allows. — [Microsoft Learn: Copilot privacy](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy)
- Under Québec Law 25 s.17, people must be informed when their data is communicated outside Québec. — [McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/techlex/quebec-privacy-regulators-guide-law-25-compliant-privacy-impact-assessments); [Clym: Quebec Law 25](https://www.clym.io/blog/quebec-law-25) (secondary; search summary)

### Inferences
- **For the connecting person,** on web-agent's own consent screen at first connection and whenever their access changes, show:
  - which company's data they are about to access;
  - the datasets and access level they get (Read, Write, Manage);
  - which fields are hidden;
  - whether results are limited to their own company;
  - that every access is logged and visible to the data owner;
  - that **retrieved content is sent to the AI service you are using (e.g., Claude, ChatGPT) and is handled under your agreement with that provider**, with a link to guidance recommending business plans with training disabled.
- **For data owners and admins,** a "who can reach what" preview built from the PDP (a per-person or per-audience access matrix, including effective field masks), a running list of connected AI clients and people, and a change log for rules.
- **Approval of external audiences.** Turning on Clients, Partners or Resellers should require a separate confirmation by an admin with a data-owner role. Confirmation should cover a lawful-basis and DPIA checkpoint, mandatory company scoping, and optionally per-company enrollment (approve Partner X, not all partners). Revisit approvals periodically, e.g. quarterly reviews of external access in line with SOC 2 user access review practice (an inference, not sourced).
- **Destructive and write tools.** Because clients may auto-approve (Claude Research mode, "Never ask" settings), enforce confirmation on the server for Manage-level tools:
  - MCP elicitation, or a two-step "prepare/commit" tool pattern;
  - a requirement that write tools be explicitly enabled per rule;
  - a default with no write or destructive tools for external audiences.

  The draft's "Confirm first" warning for destructive tools is the right instinct, but it should be enforced on the server, not only shown as a hint.
- **Server instructions and tool descriptions** are where web-agent can state data-handling notes to the AI client. They are not a control, because the client and model can ignore them.
- **A tool-definition freeze** like OpenAI's frozen snapshot suggests web-agent should version the server's tool and dataset surface. Expanding access, such as adding a dataset or field, should notify admins and, for external audiences, require re-consent.

### Gaps
- OpenAI's own documentation of the frozen-snapshot and approval-prompt features could not be fetched (403). Those claims rest on third-party guides.
- No regulator guidance was found on transparency notices specific to AI connectors.
- Whether MCP elicitation is broadly supported by Claude and ChatGPT clients as of Oct 2026 was not verified, and it partly overlaps the lifecycle/OAuth researchers' scope.
- The MCP spec version checked was 2025-11-25. Whether a newer spec revision exists as of Oct 2026 was not confirmed; the fetched pages gave no sign of one.
