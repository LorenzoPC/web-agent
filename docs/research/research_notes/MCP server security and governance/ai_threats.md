# AI-specific threats to remote MCP servers and server-side mitigations (state as of October 2026)

Scope note: written for the web-agent "Create MCP server" ADR. Here "publisher" means web-agent and the admin who defines a server at `https://webagent.dev/mcp/<slug>`. The server exposes help center articles, internal runbooks, support tickets that contain customer-written text, and customer accounts, plus an allowlist of tools: read-only, changes data, destructive, web search and send email. Client-side controls are covered only to show what the server can and cannot rely on.

Spec baseline: the current MCP spec revision is **2026-07-28**. The `/latest/` pages fetched for these notes link to `2026-07-28` throughout. Changes in this revision that matter for security design:
- The protocol is stateless, with no protocol sessions.
- Elicitation is returned inside a tool result as an `InputRequiredResult` ("multi round-trip requests").
- `tools/list_changed` notifications go only to clients that opened a `subscriptions/listen` stream.
- `tools/list` "MUST NOT vary per-connection or as a side effect of other requests on the connection", but "MAY vary by the authorization presented on the request".

Source: [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools).

---

## 1. Indirect prompt injection through tool results and data, documented incidents, and the lethal trifecta

### Takeaway
Indirect prompt injection through data a tool returns is the main AI-specific threat to a server like web-agent's. It is not a code bug, so it cannot be patched. Every major MCP incident (GitHub, Supabase, Atlassian JSM, Sentry) happened when one server supplied all three legs of Willison's "lethal trifecta": private data, untrusted content, and an exfiltration channel. web-agent's planned mix of support tickets (untrusted), customer accounts (private) and send email or web search (exfiltration) recreates that pattern inside a single server. The defenses that actually work are structural: remove one leg per server or per call, scope credentials, and gate exfiltration-capable tools behind confirmation. Spotlighting, wrapping and filters lower the risk but do not remove it.

### Cited Findings

**The lethal trifecta and related framings**
- Simon Willison, 16 Jun 2025: an agent is at high risk when it combines (1) access to private data, (2) exposure to untrusted content and (3) the ability to communicate externally. MCP "encourages users to mix and match tools from different sources". Almost any tool that can make an HTTP request or display a link can be used to send data out. — [Willison, The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- Willison says guardrail products cannot be relied on: "in web application security 95% is very much a failing grade", and "The only way to stay safe there is to avoid that lethal trifecta combination entirely." He notes that most past exfiltration bugs were fixed by vendors closing the exfiltration path. His list runs from ChatGPT (Apr 2023) to ChatGPT Operator (Feb 2025), plus M365 Copilot, GitHub MCP and GitLab Duo. — [Willison, The lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)
- Meta's "Agents Rule of Two", 31 Oct 2025: until injection can be detected reliably, an agent "must satisfy no more than two" of three properties within a session: [A] it processes untrustworthy inputs, [B] it has access to sensitive systems or private data, [C] it changes state or communicates externally. If it needs all three without starting a new session, it "should not be permitted to operate autonomously and at a minimum requires supervision". Meta also suggests tool-calling protocols such as MCP could carry "an Agents Rule of Two configuration in supporting tool calls". — [Meta AI, Practical AI Agent Security](https://ai.meta.com/blog/practical-ai-agent-security/)
- The MCP maintainers' annotations post, 16 Mar 2026, says a tool's risk "depends on what else is in the session", so the risk belongs to the session and no single tool's annotations can capture it. It cites a demonstrated chain: a malicious Google Calendar event, then an MCP calendar server, then a local code-execution tool. — [MCP Blog, Tool Annotations as Risk Vocabulary](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)

**Documented incidents (dated)**
- **GitHub MCP "toxic agent flow"** (Invariant Labs, 26 May 2025)
  - Attack: a malicious issue in a public repo hijacked the owner's agent while it reviewed issues. The agent pulled private-repo data (a project called "Jupiter Star", relocation plans, salary) into a PR on the public repo.
  - Invariant says it "is not a flaw in the GitHub MCP server code itself".
  - Claude 4 Opus was still manipulated. Invariant recommends granular permissions, one repository per session, and monitoring.
  - Source: [Invariant Labs](https://invariantlabs.ai/blog/mcp-github-vulnerability)
- **Atlassian Jira Service Management, "Living off AI"** (Cato CTRL, 19 Jun 2025)
  - Attack: an outside user filed a malicious JSM support ticket. When a support engineer ran an Atlassian MCP action on it, the injected instructions ran with the engineer's internal permissions. Internal tenant data was written back into the ticket, where the attacker could read it.
  - Atlassian said it was "exploring enhanced controls".
  - This is the closest analog to web-agent's support-ticket dataset.
  - Sources: [Cato Networks](https://www.catonetworks.com/blog/cato-ctrl-poc-attack-targeting-atlassians-mcp/); [Infosecurity Magazine](https://infosecurity-magazine.com/news/atlassian-ai-agent-mcp-attack); [Willison](https://simonwillison.net/2025/Jun/19/atlassian-prompt-injection-mcp) (calls it a classic trifecta from one MCP server)
- **Supabase MCP SQL leak** (General Analysis, early July 2025)
  - Date conflict: the GA page shows 8 Jul 2025, but Willison's link post is dated 6 Jul 2025. The GA page notes it was reviewed 21 Oct 2026 and the demo was not rerun.
  - Attack: an attacker's support ticket told the Cursor agent to read `integration_tokens` and post the contents back into the ticket thread. The developer's MCP connection ran as `service_role`, which bypasses Row-Level Security.
  - GA's verdict: "No permissions were violated. The agent just followed instructions it should never have trusted."
  - GA on read-only mode: "Read-only access still permits reads of data available to the database role."
  - GA on filtering: "Do not rely on detecting imperative verbs or SQL fragments to decide whether customer text is safe."
  - Sources: [General Analysis](https://www.generalanalysis.com/blog/supabase-mcp-blog); [Willison](https://simonwillison.net/2025/Jul/6/supabase-mcp-lethal-trifecta/)
- **Supabase's response** (blog, 16 Sep 2025)
  - Mitigations: read-only mode, project-scoped mode, feature groups that restrict which tools the LLM can use, and "Wrapping query results with warnings to the LLM not to follow embedded commands".
  - Supabase's assessment: "even in read-only mode, prompt injection remains the number one concern". The guardrails "reduced risk but did not eliminate it … guardrails alone aren't enough."
  - Source: [Supabase blog](https://supabase.com/blog/mcp)
- **Sentry MCP "agentjacking"** (Tenet Security; CSA note dated 12 Jun 2026)
  - Attack: Sentry DSNs are public and write-only. Attackers used one to POST fake error events containing markdown "remediation" instructions. Claude Code, Cursor and Codex read the events through the Sentry MCP server and ran attacker commands.
  - Reported results: 85% exploitation success; at least 2,388 organizations with injectable DSNs.
  - Sentry acknowledged the report on 3 Jun 2026. It added a filter for the specific payload string and declined a root-cause fix as "technically not defensible".
  - CSA's lesson: a vetted server is still an injection path if it "surfaces user-controlled content".
  - Sources: [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-agentjacking-mcp-sentry-injection-20260612/); primary write-up, cited by CSA and not fetched: [Tenet Security](https://tenetsecurity.ai/blog/agentjacking-coding-agents-with-fake-sentry-errors/)
- **Salesforce Agentforce "ForcedLeak"** (Noma; reported 28 Jul 2025, fixed 8 Sep 2025, disclosed 25 Sep 2025, CVSS 9.4)
  - Attack: injected text in the Web-to-Lead "Description" field (customer-written CRM text) made the agent embed lead emails in an image URL.
  - The URL pointed to a domain on Salesforce's CSP allowlist that had expired and could be bought for about $5.
  - Fix: Salesforce shipped "Trusted URLs Enforcement".
  - Sources: [The Hacker News](https://thehackernews.com/2025/09/salesforce-patches-critical-forcedleak.html); [Willison](https://simonwillison.net/2025/Sep/26/agentforce/)
- **ChatGPT Connectors "AgentFlayer"** (Zenity, Black Hat USA, Aug 2025)
  - Attack: a single poisoned Google Drive document carried hidden instructions to search Drive for API keys. ChatGPT exfiltrated them through a rendered markdown image URL, logged via Azure Blob.
  - OpenAI mitigated the specific attack.
  - Sources: [Zenity Labs](https://labs.zenity.io/p/agentflayer-chatgpt-connectors-0click-attack-5b41); [CSO Online](https://csoonline.com/article/4036868/black-hat-researchers-demonstrate-zero-click-prompt-injection-attacks-in-popular-ai-agents.html); [Gigazine, 8 Aug 2025](https://gigazine.net/gsc_news/en/20250808-chatgpt-agentflayer)
- **GitHub Copilot Chat "CamoLeak"** (Legit Security; GitHub disabled Copilot Chat image rendering on 14 Aug 2025; disclosed about 8–9 Oct 2025; CVSS 9.6)
  - Attack: hidden markdown comments in PRs, invisible in the web UI but read by Copilot, made the model emit a sequence of pre-signed GitHub Camo image URLs. The order of those URLs encoded private-repo data.
  - CVE-2025-59145 is reported by MintMCP only; it is secondary and I did not verify it.
  - Sources: [Legit Security](https://legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code); [The Register](https://assets.theregister.com/2025/10/09/github_copilot_chat_vulnerability/); [MintMCP](https://www.mintmcp.com/blog/camoleak-github-copilot-vulnerability-private-repo-exfiltration)

**Spec and framework guidance on injection through tool results**
- MCP tools spec, security considerations:
  - "Servers MUST: Validate all tool inputs; Implement proper access controls; Rate limit tool invocations; Sanitize tool outputs."
  - Clients "SHOULD … Show tool inputs to the user before calling the server, to avoid malicious or accidental data exfiltration" and "Validate tool results before passing to LLM".
  - Source: [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- CoSAI defines "Resource Content Poisoning" as an MCP-specific threat: hidden instructions in backend data (databases, documents, API responses) that the server returns to the LLM, "achieving persistent prompt injection through trusted data channels". It also defines "Overreliance on the LLM": server developers "may implement overly permissive tools, assuming the LLM will invoke them correctly", but "model-level controls … are not ironclad". — [CoSAI MCP Security paper, 8 Jan 2026](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)
- Microsoft MSRC, 29 Jul 2025:
  - Spotlighting (delimiting, datamarking, encoding) and Prompt Shields are "probabilistic".
  - Microsoft's design goal: "even if some prompt injections are successful, this will not lead to security impacts".
  - Data-access attacks "can be deterministically mitigated using fine-grained permissions and access controls".
  - Source: [MSRC blog](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- OWASP LLM01:2025 mitigations include "Enforce privilege control and least privilege access" (handle privileged functions in code, not through the model), "Require human approval for high-risk actions" and "Segregate and identify external content". — [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
- OWASP MCP Security Cheat Sheet:
  - "Treat all tool responses as untrusted, including from approved servers."
  - Separate and label tool data in the model context.
  - Tag stripping and pattern detection are supplementary only: they "cannot establish that the remaining text is safe".
  - "Enforce authorization and validate subsequent tool calls in trusted application code."
  - For web tools, extract structured fields rather than passing raw HTML.
  - Source: [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- "Design Patterns for Securing LLM Agents against Prompt Injections" (Beurer-Kellner et al., arXiv 2506.08837, Jun 2025) proposes plan-then-execute, dual LLM, context-minimization and other patterns. These are mostly agent or host patterns, not server patterns. — [arXiv 2506.08837](https://arxiv.org/abs/2506.08837); [Willison review, 13 Jun 2025](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/). I only read secondary summaries.

### Inferences
- **web-agent's planned server is a one-server lethal trifecta by default.**
  - Support tickets with customer-written text are untrusted content, the same vector as Atlassian JSM, Supabase and ForcedLeak.
  - Customer accounts and internal runbooks are private data.
  - Send email and web search are exfiltration channels. A web search query can carry data to a third party, and any URL-fetch-capable tool is a direct channel.
  - Help center articles are lower-risk only if staff author them. If customers can comment on them, treat them as untrusted.
- **Candidate product-enforced safeguards for the ADR, roughly strongest first:**
  1. **Trifecta check at server-creation time.**
     - Classify every dataset as trusted-authored, untrusted (customer- or web-sourced), or private/sensitive.
     - Classify every tool as an exfiltration channel or not. Send email, web search, any URL fetch, and any write to a customer-visible field count, because the Atlassian, Supabase and GitHub incidents all exfiltrated by writing back to a channel the attacker could read.
     - Warn or block when one server combines all three legs. Offer to split into separate servers, which follows Meta's Rule of Two.
  2. **Remove the exfiltration leg where possible.**
     - Restrict send email recipients to an allowlist (for example, the authenticated user or the company's own domain), or force a draft-only mode.
     - Make "post reply to ticket" or "update customer-visible field" a destructive/confirm-required tool when the server also exposes private data.
  3. **Run tools as the end user with least privilege**: OAuth identity, per-dataset scoping, row-level filtering. Never use a service-role credential, which is the Supabase root cause. Never expose tables or fields that hold secrets such as tokens.
  4. **Mark untrusted fields in results.** Put customer-written ticket bodies in delimited or structured fields with provenance metadata, as Supabase and Microsoft's spotlighting do. Document this as risk-reducing, not a security boundary.
  5. **Require confirmation for exfiltration-capable tools** (see section 3), and add rate limits and audit (see section 5).
- **Limits of what the server can do.** The server cannot see other MCP servers the person has connected, so it cannot prevent cross-server trifectas. web-agent should avoid becoming the exfiltration leg for other servers' data. An unrestricted `send_email` was exactly the target in Invariant's shadowing demo (section 2).
- **Statelessness constrains session tainting.** Under 2026-07-28, `tools/list` cannot change per connection. Any "taint" logic, such as "this user just read untrusted tickets, so require confirmation for send email", has to run at call time and be keyed on user identity and a time window. That is an approximation, because the server cannot see the client's conversation boundaries. This is my inference from the spec's statelessness rules.

### Gaps
- I did not find a quantitative evaluation of spotlighting or result-wrapping effectiveness specific to MCP tool results.
- The Notion AI agents web-search exfiltration (reported Sept 2025, CodeIntegrity) did not come up in my searches and is not verified.
- Other 2026 incidents appeared only in search snippets and are unverified: Anthropic Git MCP server CVE-2025-68143/68144/68145 (Jan 2026, attributed to Cyata), Kong Konnect MCP CVE-2026-13341, Cursor + Jira MCP token leak, and a Microsoft Incident Response rug-pull walkthrough (reported 30 Jun 2026).
- I did not open the Tenet Security primary write-up. Sentry figures come from the CSA summary.

---

## 2. Tool poisoning, rug pulls, tool-name shadowing and collisions, and over-broad descriptions

### Takeaway
Tool metadata (name, description, full input schema, annotations) is model-readable and acts as a prompt. It can carry hidden instructions, including invisible Unicode, and can change after a user approves it. Silent drift is common: 40.6% of multi-version servers in the public registry changed their advertised metadata silently. Clients mostly do not re-prompt when definitions change. Because web-agent lets admins author tool descriptions, it is effectively a tool-metadata publisher. It should lint and freeze definitions, version and hash the full definition, review changes, signal changes through `tools/list_changed`, and namespace tool names.

### Cited Findings
- **Tool poisoning, rug pull, shadowing** (Invariant Labs, 1 Apr 2025)
  - Tool poisoning hides instructions in descriptions that are "invisible to users but visible to AI models". The example `add` tool's `<IMPORTANT>` block told the agent to read `~/.cursor/mcp.json` and `~/.ssh/id_rsa` and pass them as an argument, and Cursor leaked both files.
  - Rug pull: "a malicious server can change the tool description after the client has already approved it."
  - Cross-server shadowing: a malicious server's description rewrote the behavior of a trusted `send_email` tool so that "The Cursor agent sends all emails to the attacker, even if the user explicitly specifies a different recipient". The malicious tool never had to be called.
  - Recommended: show descriptions to users, pin and hash tool descriptions, and enforce cross-server dataflow boundaries.
  - Source: [Invariant Labs](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)
- **"Line jumping"** (Trail of Bits, 21 Apr 2025): injection in tool descriptions takes effect when `tools/list` loads them into context, before any tool is called. The post includes examples that exfiltrate conversation history and that hide instructions with ANSI escape codes. Trail of Bits later released `mcp-context-protector`. — [Trail of Bits](https://blog.trailofbits.com/2025/04/21/jumping-the-line-how-mcp-servers-can-attack-you-before-you-ever-use-them/)
- **Full-Schema Poisoning and Advanced Tool Poisoning** (CyberArk, 30 May 2025): the attack surface covers the whole schema, including parameter names, types, defaults and required arrays, not just descriptions. ATPA puts the instructions in tool outputs, including error strings, which defeats static review of definitions. — [CyberArk](https://www.cyberark.com/resources/threat-research-blog/poison-everywhere-no-output-from-your-mcp-server-is-safe); [Nullcon abstract](https://nullcon.net/talk/your-mcp-server-executes-commands-but-from-whom/). I saw only summaries; I did not read the PoC details.
- **Invisible-character concealment** (arXiv 2607.05744, 7 Jul 2026)
  - Payloads in the Unicode TAG block (U+E0000–U+E007F) render invisibly in approval dialogs but reach the model's tokenizer.
  - All 8 techniques tested delivered payloads. 4 of 8 evaded a string-matching sanitizer. MCP forced re-approval in 0 of 8, "including under a time-of-check to time-of-use rug-pull".
  - The paper describes this as an "approval-view fidelity gap".
  - Source: [arXiv 2607.05744](https://arxiv.org/abs/2607.05744)
- **Silent drift census** (arXiv 2609.14119, 12 Sep 2026)
  - Coverage: 21,643 servers and 72,606 version records in the public MCP registry, August 2026 snapshot.
  - 51.1% of multi-version servers changed what they advertise between versions, and 40.6% did so silently.
  - 4.2% moved their remote endpoint to a different host under the same registry identity.
  - Silent drift correlated with high-severity findings (OR 2.96).
  - Source: [arXiv 2609.14119](https://arxiv.org/abs/2609.14119)
- **Supply-chain example, postmark-mcp** (Koi Security; malicious v1.0.16 released 17 Sep 2025, disclosed late Sep 2025): an npm copy of a legitimate Postmark MCP server added one line that BCC'd every sent email to the attacker. It had about 1,643 total downloads per THN; SC World says 1,500 per week. It shows that a "send email" tool is a high-value exfiltration point. — [The Hacker News](https://thehackernews.com/2025/09/first-malicious-mcp-server-found.html); [CSO Online](https://www.csoonline.com/article/4064009/trust-on-mcp-takes-first-in-the-wild-hit-via-squatted-postmark-connector.html)
- **Name collisions** (MCP spec 2026-07-28): tool names SHOULD be 1–128 characters from `[A-Za-z0-9_.-]` and unique within a server. "Clients or proxies that aggregate tools from multiple servers MAY encounter naming collisions … and SHOULD implement a disambiguation strategy such as prefixing tool names with a server identifier." The `serverInfo` name "SHOULD NOT be relied upon for disambiguation". Anthropic's directory caps tool names at 64 characters. — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools); [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
- **Change signaling** (MCP spec 2026-07-28): servers declaring `listChanged` "SHOULD send" `notifications/tools/list_changed` to clients subscribed through `subscriptions/listen`. They "SHOULD return tools in a deterministic order". The set "MUST NOT vary per-connection" but "MAY vary by the authorization presented". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- **CoSAI** (8 Jan 2026) lists Tool Poisoning, Full Schema Poisoning and Typosquatting/Confusion as MCP-specific threats. It warns that "consent fatigue … can significantly undermine" human-in-the-loop. Its controls include integrity checks (MACs and signatures on tools and resources), single-purpose tools, and "execute a prepared statement versus executing any SQL statement". — [CoSAI paper](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)
- **OWASP MCP Security Cheat Sheet**
  - Hash the full tool definition, because "a flipped readOnlyHint or destructiveHint can change client approval behavior without any visible description change".
  - "Pin reviewed tool definitions using cryptographic hashes and require review when they change."
  - "Prevent tool descriptions from one server from referencing or modifying the behavior of tools from another server."
  - Source: [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- **Anthropic Software Directory Policy** (MCP Directory Policy consolidated into it as of 15 Apr 2026)
  - Descriptions must be "narrow and unambiguous" (2.A) and "precisely match actual functionality" (2.B).
  - Software must not call or coerce Claude into calling other software unless the user asks (2.D), and must not interfere with other tools (2.E).
  - It must not direct Claude to pull instructions dynamically from external sources (2.F), and "must not contain hidden, obfuscated, or encoded instructions" (2.G).
  - Material changes to tool descriptions must be notified to Anthropic and "may be subject to re-review" (3.H).
  - Sources: [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358); [old MCP Directory Policy notice](https://support.claude.com/en/articles/11697096-anthropic-mcp-directory-policy)
- **Conflicting Anthropic guidance on changes**: Claude's developer docs say "You don't resubmit to Anthropic to change a listed MCP server's tools … deploy the change to your server". Only the tool names shown on the listing go through a reviewer-approved listing edit. That sits uneasily with Policy 3.H, which says material changes "may be subject to re-review". — [Claude docs, after publishing](https://claude.com/docs/connectors/building/after-publishing.md); [Software Directory Policy](https://support.claude.com/en/articles/13145358)
- **Claude review criteria (anti-injection rules for descriptions)**: descriptions are rejected if they instruct Claude to call tools the user didn't request, interfere with other tools, pull behavioral instructions from external sources, contain hidden or encoded instructions, or "attempt to override system instructions". — [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
- **OpenAI app submission guidelines**
  - Metadata must not instruct the model "to prefer one plugin over others", "must not recommend overly broad triggering beyond the explicit user intent", and "must not seek secrets or protected context, direct unauthorized data transfers or actions … override platform instructions or safeguards, conceal behavior, or impersonate another party".
  - "Encoded or obfuscated instructions do not exempt a plugin from these requirements."
  - OpenAI docs: "Keep published tool names and schemas backward compatible", and "If metadata changes, refresh the custom MCP server connection and rerun the evaluation set before submission."
  - Sources: [OpenAI App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines); [OpenAI Apps SDK docs](https://developers.openai.com/apps-sdk/llms-full.txt)
- **Claude's user-facing advice** puts rug-pull detection on the user: "Monitor for unexpected changes in tool behavior." — [Claude docs, custom connectors](https://claude.com/docs/connectors/custom/remote-mcp.md)

### Inferences
- **Where the poisoning risk sits for web-agent.** web-agent is the trusted publisher, so external tool poisoning is not the main concern. The risks are:
  - (a) an admin, or a compromised admin account, writes descriptions with model-directed instructions;
  - (b) imported content such as a recipe or template carries hidden characters;
  - (c) definitions change after a client approved them.
- **Candidate safeguards for tool definitions:**
  - Lint every model-readable field (name, title, description, parameter names and descriptions, defaults, enums):
    - reject invisible and control Unicode (TAG block, zero-width, bidi overrides, ANSI escapes);
    - reject references to other tools or servers and imperative instructions to the model;
    - enforce length caps.
    These rules mirror Anthropic 2.A–2.G and OpenAI's rules, which also keeps directory submission open.
  - Make definitions immutable per version. Hash the full definition, including schema and annotations. Show a diff and require re-approval, ideally by a second admin, for any change. Emit `notifications/tools/list_changed` and keep tool order deterministic.
  - Keep tool names stable and backward compatible. Prefix them with a short server or tenant identifier (for example `acme_search_tickets`) to reduce cross-server collisions and shadowing confusion. Stay at or under 64 characters.
  - Ban catch-all tools such as `api_request(method=…)` or raw SQL. Prefer purpose-built tools, as CoSAI and Claude's review criteria require.
  - Return error messages from fixed server templates. Never echo raw untrusted content into error strings, which closes the ATPA output channel.

### Gaps
- I could not verify whether Claude.ai or ChatGPT re-prompt users when a remote server's tool definitions change, or whether they act on `list_changed`. The arXiv TAG-block paper found 0/8 forced re-approvals in its harness, but it does not name commercial clients.
- I found no published client behavior for collisions between same-named tools from different remote servers in Claude or ChatGPT.

---

## 3. Tool annotations: trust model, client use, elicitation, and how Claude and ChatGPT surface writes

### Takeaway
The spec says annotations are hints that clients "MUST consider … untrusted unless they come from trusted servers". Even so, the two clients that matter most do act on them. Claude auto-runs `readOnlyHint: true` tools without per-call confirmation and always prompts for `destructiveHint: true`. ChatGPT treats any tool without `readOnlyHint` as a write that needs confirmation. Accurate annotations are therefore required for both UX and directory approval, but they are not a security control: users can choose "Always allow" or "remember", and no client is guaranteed to honor them. If web-agent's destructive tools must have confirmation, the server has to enforce it itself, for example with elicitation (URL mode is the strongest) or an out-of-band approval step.

### Cited Findings

**What the spec says**
- Tools spec 2026-07-28: "For trust & safety and security, clients MUST consider tool annotations to be untrusted unless they come from trusted servers." There "SHOULD always be a human in the loop with the ability to deny tool invocations". Applications SHOULD "Present confirmation prompts to the user for operations". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- MCP blog, 16 Mar 2026 (Hungerford, Morrow of GitHub, Chang of AWS):
  - Defaults are worst-case: `readOnlyHint` false, `destructiveHint` true, `idempotentHint` false, `openWorldHint` true.
  - On trust: "An untrusted server can lie"; annotations "aren't enforcement"; "Hints inform decisions; contracts enforce them."
  - It also says "No MCP client surfaces annotations as context in approval prompts" and no client lets users filter tools by annotation. GitHub's read-only mode is the closest production analog, enabled by about 17% of users.
  - Guidance for servers: set `readOnlyHint: true` on read-only tools, `destructiveHint: false` on additive operations, `openWorldHint: false` on closed-domain tools. "Don't rely on annotations for guarantees."
  - Source: [MCP Blog](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)
- Open annotation proposals:
  - SEP-1913, "Trust and Sensitivity Annotations", co-authored by GitHub (Sam Morrow) and OpenAI (Robert Reichel). Opened 27 Nov 2025. On 10 Jun 2026 it was split into an Extensions Track `trust-annotations` extension in incubation. The June 2026 version reduces the taxonomy to `sensitive` and `untrusted`, plus `evidenceRef`, and drops `maliciousActivityHint` and session propagation rules.
  - Other open proposals: SEP-1984, SEP-1561 (`unsafeOutputHint`), SEP-1560 (`secretHint`), SEP-1487 (`trustedHint`).
  - Sources: [SEP-1913 on GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1913); [MCP Blog](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)

**How Claude uses annotations**
- Anthropic's review criteria: "Every tool must include a `title` and the applicable hint: `readOnlyHint: true` for read-only tools, and `destructiveHint: true` for tools that modify or delete data. These determine auto-permissions in Claude. Read-only tools can run without per-call confirmation, and destructive tools always prompt." — [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
- Anthropic also requires separate read and write tools: "A single tool that accepts both safe HTTP methods … and unsafe methods … is rejected." It prefers splitting writes further into create, update and delete. — [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
- The Software Directory Policy says "MCP servers must provide all applicable annotations for their tools" (5.E), naming readOnlyHint, destructiveHint and title. — [Software Directory Policy](https://support.claude.com/en/articles/13145358)
- Claude Team and Enterprise Owners can set per-connector tool permissions "categorized by type (for example, read-only tools, write/delete tools)" to Always allow, Needs approval or Blocked, and "individual users can't override it". The article does not say how tools are put into categories. — [Claude Help Center](https://support.claude.com/en/articles/11176164)
- Claude's user guidance: "Only click **Always allow** for trusted servers". Users can block individual tools. — [Claude docs, custom connectors](https://claude.com/docs/connectors/custom/remote-mcp.md)
- Possible conflict with the MCP blog's claim that no client filters by annotation (see above).

**How ChatGPT uses annotations**
- OpenAI Apps SDK: "`readOnlyHint`: `true` only when the tool cannot change state"; "`destructiveHint`: `true` when a tool can cause irreversible or difficult to reverse outcomes"; "`openWorldHint`: `true` when a tool accesses the public internet or open-ended external entities". "Annotations help ChatGPT and Codex choose appropriate confirmation and safety behavior. They do not replace authorization, validation, or confirmation in your server." — [OpenAI Apps SDK docs](https://developers.openai.com/apps-sdk/llms-full.txt)
- OpenAI submission guidelines:
  - "Use `true` for potentially destructive or irreversible effects, such as deletion, overwriting, cancellation."
  - "Being able to undo an action does not, by itself, justify setting `destructiveHint` to `false`."
  - Set `openWorldHint` "`true` for public or open-ended entities, including read-only web search and arbitrary destinations."
  - "Side effects should never be hidden or implicit."
  - Source: [OpenAI App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- ChatGPT developer mode:
  - Tools without the read-only hint are treated as write actions.
  - Write actions ask for confirmation by default.
  - Users can make an approve or deny choice persist for the rest of one conversation. New or refreshed chats prompt again.
  - OpenAI advises remembering approval only for trusted apps.
  - Sources: [OpenAI developer mode guide](https://developers.openai.com/api/docs/guides/developer-mode). Direct fetch returned 404, so this is from the indexed search snippet of that page and its `.md` variant.
- OpenAI security guide: "Requiring human confirmation for irreversible operations" and "Use the host's confirmation prompts for destructive actions". — [OpenAI Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy)

**Elicitation (server-initiated confirmation and input)**
- Spec 2026-07-28 defines two modes:
  - Form mode: in-band structured data, with flat primitive schemas.
  - URL mode: out-of-band; data "is not exposed to the client". URL mode was introduced in 2025-11-25 and is marked "may change".
  - Under 2026-07-28, a server delivers elicitation by answering `tools/call` with an `InputRequiredResult`. The client retries with `inputResponses` and `requestState`.
  - Source: [MCP Elicitation spec](https://modelcontextprotocol.io/specification/latest/client/elicitation); [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- Server obligations:
  - Servers "MUST NOT use form mode elicitation to request sensitive information such as passwords, API keys, access tokens, or payment credentials" and "MUST use URL mode" for those.
  - Servers "MUST bind elicitation requests to the client and user identity".
  - For URL mode, servers MUST NOT put PII or credentials in the URL and "MUST NOT provide a URL which is pre-authenticated". They "MUST verify the identity of the user who opens the URL", for example by comparing the session cookie's subject with the token's `sub`, to prevent phishing and account-takeover.
  - Servers "MUST NOT send elicitation requests with modes that are not supported by the client" and MUST handle decline and cancel.
  - Source: [MCP Elicitation spec](https://modelcontextprotocol.io/specification/latest/client/elicitation)
- Client obligations for URL mode: clients MUST NOT pre-fetch the URL, MUST NOT open it without consent, MUST show the full URL, and MUST open it so the client and LLM cannot inspect it (for example SFSafariViewController, not WKWebView). — [MCP Elicitation spec](https://modelcontextprotocol.io/specification/latest/client/elicitation)
- CoSAI says hosts "allow users to disable the confirmation prompt". For organizations that consider that unacceptable, it recommends locking client configuration or using "elicitation on the MCP server side to request the user confirmation of actions." — [CoSAI paper](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)
- CoSAI's "Insecure Human-in-the-Loop" and "Consent/User Approval Fatigue" are listed MCP-contextualized threats. — [CoSAI paper](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)

### Inferences
- **Annotation mapping.** Treat web-agent's three labels as a direct mapping that must be accurate, because Claude and ChatGPT both gate on them:
  - Read-only → `readOnlyHint: true`, `destructiveHint: false`.
  - Changes data (additive) → `readOnlyHint: false`, `destructiveHint: false`.
  - Destructive → `readOnlyHint: false`, `destructiveHint: true`.
  - Web search and send email → `openWorldHint: true`. OpenAI explicitly says read-only web search is open-world.
  - Closed-domain dataset tools → `openWorldHint: false`.
- **Send email.** Per OpenAI's rule that undo doesn't justify `false`, consider marking send email `destructiveHint: true`. It is irreversible and an exfiltration channel, and Claude only guarantees a prompt for destructive tools. This is my inference.
- **Server-side enforcement of "requires the person's confirmation".** Client prompts can be bypassed by "Always allow", "remember", owner settings or non-compliant clients. Options:
  - (a) **URL-mode elicitation** to a `webagent.dev` confirmation page that shows the exact action and parameters and checks that the session's `sub` matches the token's `sub`. This is the strongest option because the model and client cannot forge the click.
  - (b) **Form-mode elicitation** with a boolean confirm. Weaker, because a malicious or buggy client could auto-accept.
  - (c) **Fallback for clients that don't declare elicitation**: refuse the destructive call with an actionable `isError` message, or queue it for approval in the web-agent app.
  - Elicitation is the only spec mechanism the server controls end to end. Fatigue is the main cost, so reserve it for destructive and exfiltration-capable calls.
- **Annotation consistency.** Annotations must match server enforcement. A tool that is labeled read-only must also be implemented with read-only credentials, so a lying or mistaken label cannot cause harm.

### Gaps
- I could not confirm whether Claude.ai, Claude Desktop or ChatGPT support form-mode or URL-mode elicitation from remote connectors as of Oct 2026, or the 2026-07-28 `InputRequiredResult` flow. This is essential to test before the ADR relies on elicitation.
- Claude's handling of tools that are neither read-only nor destructive (additive writes) is not documented in the sources found.
- How Claude assigns tools to the owner-level "read-only / write/delete" categories is not stated.
- The OpenAI developer-mode page could not be fetched directly (404). Its behavior is reported from search-indexed text.

---

## 4. Output handling: marking untrusted content, structured output, data minimization, and markdown/image-link exfiltration

### Takeaway
Treat everything a tool returns as untrusted and as a possible exfiltration payload.
- **Minimize.** Return only the fields the task needs; no dumps, no secrets.
- **Structure.** Use `outputSchema` and `structuredContent`, with customer-written text in clearly labeled fields.
- **Neutralize rendering vectors** in untrusted text: markdown images and links, HTML, hidden comments, invisible Unicode.

Rendering-based exfiltration (images and links) is ultimately blocked on the client side, as AgentFlayer, ForcedLeak and CamoLeak show. The server can only reduce how often its own data carries such payloads.

### Cited Findings
- **Spec, structured output**: tools may declare an `outputSchema`; "Servers MUST provide structured results that conform to this schema", and "Clients SHOULD validate". For backwards compatibility, a tool returning structured content "SHOULD also return the serialized JSON in a TextContent block". `structuredContent` "is unrelated to LLM 'structured outputs'". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- **Spec, content annotations**: `audience` (`["user"]`, `["assistant"]`) and `priority` annotations exist on all content types. They are optional metadata that "the client can use to inform how objects are used or displayed". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools); [MCP schema](https://modelcontextprotocol.io/specification/2026-07-28/schema)
- **Spec, server duty**: servers MUST "Sanitize tool outputs". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- **OpenAI data minimization**
  - "Do not put secrets, access tokens, or unnecessary personal data in tool results."
  - "Treat `_meta` as hidden from the model, not as a substitute for authorization or secure storage."
  - "Include only the data required for the current prompt."
  - "Gather only the minimum data required … Avoid 'just in case' fields."
  - "Do not request the full conversation history, raw chat transcripts …"
  - Sources: [OpenAI Apps SDK docs](https://developers.openai.com/apps-sdk/llms-full.txt); [OpenAI Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy); [OpenAI App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- **Anthropic data minimization**
  - "Keep responses reasonably sized for the task, and don't return a full database dump when a summary was requested."
  - "Don't collect conversation data beyond what the tool needs."
  - Policy 1.D–1.E: "Software must not collect extraneous conversation data, even for logging purposes."
  - Policy 5.B: keep token use proportional.
  - Sources: [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md); [Software Directory Policy](https://support.claude.com/en/articles/13145358)
- **Marking untrusted content**
  - Supabase wraps SQL results "with warnings to the LLM not to follow embedded commands" (mitigation, not fix). — [Supabase blog](https://supabase.com/blog/mcp)
  - Microsoft's spotlighting uses delimiting with randomized delimiters, datamarking and encoding; it is "probabilistic". — [MSRC](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
  - OWASP LLM01: "Segregate and identify external content". — [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
  - OWASP cheat sheet: label tool data, extract structured fields from web content rather than raw HTML; stripping is supplementary only. — [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- **Markdown and image exfiltration**
  - Microsoft: "In order to render the image, the user's browser makes a request to the attacker's server". Microsoft "took steps to deterministically block … the data exfiltration technique" and also blocked certain untrusted links. — [MSRC](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
  - Google Gemini, 13 Jun 2025: "Our markdown sanitizer identifies external image URLs and will not render them", plus Safe-Browsing-based suspicious URL redaction. — [Google blog](https://blog.google/security/mitigating-prompt-injection-attacks/)
  - OWASP LLM05:2025: "Encode model output back to users to mitigate undesired code execution by JavaScript or Markdown", use context-aware output encoding, strict CSP, and "Treat the model as any other user, adopting a zero-trust approach". — [OWASP LLM05:2025](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)
  - Incidents that exfiltrated through rendered images: AgentFlayer (Azure Blob image URL), ForcedLeak (expired allowlisted CSP domain), CamoLeak (pre-signed Camo proxy URLs, delivered via hidden markdown comments). — [Zenity](https://labs.zenity.io/p/agentflayer-chatgpt-connectors-0click-attack-5b41); [The Hacker News](https://thehackernews.com/2025/09/salesforce-patches-critical-forcedleak.html); [Legit Security](https://legitsecurity.com/blog/camoleak-critical-github-copilot-vulnerability-leaks-private-source-code)
- **Output-side poisoning**: CyberArk's ATPA puts instructions in tool outputs and error messages. — [CyberArk](https://www.cyberark.com/resources/threat-research-blog/poison-everywhere-no-output-from-your-mcp-server-is-safe)
- **Sampling-based output attacks**: Unit 42, 5 Dec 2025, describes resource theft, conversation hijacking and covert tool invocation through MCP sampling. Defenses include strict templates, token limits, isolating servers from conversation history, and rate-limiting sampling. — [Unit 42](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/)

### Inferences
Candidate output-handling safeguards for the ADR:
1. **Per-dataset field allowlists.** The admin picks the exposed fields. Default-exclude secrets, tokens, internal notes and PII not needed for the task. Cap result counts and sizes, and paginate.
2. **Typed outputs.** Use `outputSchema` and `structuredContent` for every dataset tool. Put customer-written text in explicitly named fields such as `customer_message_untrusted`, with provenance (`source: "customer"`, author, ticket ID).
   - The text block still reaches the model, so this helps the model and the host but does not isolate anything.
3. **Neutralize rendering vectors in untrusted text before returning it:**
   - strip or defang markdown image syntax `![…](…)` and HTML `<img>`, `<iframe>` and `<a>`;
   - remove HTML comments (the CamoLeak vector);
   - remove invisible Unicode (TAG block, zero-width, bidi) and ANSI escapes;
   - optionally rewrite non-allowlisted URLs to plain text.
4. **Keep sampling and server-side LLM use out of v1**, or tightly bounded, given Unit 42's findings. This is my recommendation, not a sourced requirement.
5. **What the server cannot control.** It cannot stop the model from composing an exfiltration URL from data it already holds. That depends on client rendering policy (Microsoft and Google block it deterministically), and on web-agent not providing URL-fetch or open-recipient email tools in the same server.

### Gaps
- I found no source documenting whether Claude.ai and ChatGPT render external markdown images from MCP tool results as of Oct 2026. Microsoft and Google document their own products only.
- I found no measured effectiveness data for content `audience` annotations; it is unclear whether clients hide `["user"]`-only content from the model.

---

## 5. Excessive agency: limits on autonomous writes, human-in-the-loop for high-impact actions, and per-tool rate limits

### Takeaway
Frameworks agree. Minimize tools, functionality and permissions. Enforce authorization in code, not through the model. Require human approval for high-impact actions. Use rate limits, quotas and logging to bound the damage when something goes wrong. The MCP spec makes server-side rate limiting a MUST. Directory policies add hard lines: no autonomous financial transactions without human-in-the-loop, and no catch-all read/write tools.

### Cited Findings
- **OWASP LLM06:2025, Excessive Agency**
  - Root causes: excessive functionality, permissions and autonomy.
  - Mitigations: minimize extensions; minimize extension functionality; avoid open-ended extensions (such as shell or URL fetch); minimize permissions (for example read-only DB rights); "Execute extensions in user's context"; "Require user approval"; "Complete mediation" (authorize in downstream systems, not via the LLM); sanitize inputs and outputs.
  - Logging, monitoring and rate limiting "won't prevent" excessive agency but limit damage.
  - Source: [OWASP LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- **MCP spec**: servers MUST "Rate limit tool invocations". — [MCP Tools spec](https://modelcontextprotocol.io/specification/latest/server/tools)
- **MCP security best practices (scope minimization)**: use a minimal initial scope set, then step-up via targeted `WWW-Authenticate scope="…"` challenges when privileged operations are first attempted. Avoid wildcard or omnibus scopes. Log elevation events. — [MCP Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **MCP security best practices (state handles)**: servers "MUST NOT treat possession of a state handle as authentication" and SHOULD bind handles to the authenticated user. — [MCP Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **CoSAI threats**: "Resource exhaustion and denial of wallet", "Invisible Agent Activity", "Insecure Human-in-the-Loop", "Consent/User Approval Fatigue". — [CoSAI paper](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)
- **CoSAI controls**
  - "Tool implementations should not rely on the LLM to perform security-critical operations, validate inputs, or enforce constraints."
  - "Safe and secure execution should not rely solely on the human user, who … can easily become fatigued."
  - Logging at all layers: "what tools have been decided to use, with which parameters, and as a result of which prompt".
  - Source: [CoSAI paper](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf)
- **OWASP MCP Security Cheat Sheet**
  - "Require explicit user confirmation for destructive, financial, or data-sharing operations."
  - "Never auto-approve tool calls, especially in multi-server setups."
  - Apply "resource controls (rate limits, quotas, timeouts) per session or tenant".
  - Log "all MCP tool invocations with full parameters, user context, and timestamps", redacting secrets and PII.
  - Source: [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- **OWASP MCP Top 10 (beta)**: MCP02 "Privilege Escalation via Scope Creep" and MCP08 "Lack of Audit and Telemetry". — [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/)
- **Anthropic policy**: autonomous financial transactions without human-in-the-loop are unsupported (4.A). The directory rejects connectors that "Transfer money, cryptocurrency, or other financial assets". High-risk uses require human-in-the-loop (1.A–1.B). — [Software Directory Policy](https://support.claude.com/en/articles/13145358); [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
- **OpenAI**: "Require confirmation for consequential write actions"; "Verify and enforce scopes on every tool call"; "Validate all inputs server-side, even when the model supplied them"; "Monitor for anomalous traffic". — [OpenAI Apps SDK docs](https://developers.openai.com/apps-sdk/llms-full.txt); [OpenAI Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy)
- **Meta Rule of Two**: if a session needs untrusted input, private data and state change or external communication together, it needs supervision such as human-in-the-loop. — [Meta AI](https://ai.meta.com/blog/practical-ai-agent-security/)
- **Microsoft human-in-the-loop example**: a drafted email is sent only after the user approves it. — [MSRC](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- **Google**: "potentially risky operations like deleting a calendar event may trigger an explicit user confirmation request". — [Google blog](https://blog.google/security/mitigating-prompt-injection-attacks/)

### Inferences
Candidate excessive-agency safeguards web-agent could enforce:
- **Per-tool, per-user and per-server rate limits and quotas.** Examples: send email N per hour and a recipient cap; bulk-update and delete caps per call (for example, 1 record per destructive call unless an admin raises it).
- **Draft-then-send** for email, as in Microsoft's example: the model creates a draft and a human sends it.
- **Dry-run or preview** for destructive tools, with confirmation through elicitation.
- **Idempotency keys** on write tools.
- **Soft delete with an undo window.** It does not change `destructiveHint` (per OpenAI).
- **Per-server kill switch.**
- **Immutable audit log**: user `sub`, client ID, tool, arguments (redacted), result size, and confirmation outcome.
- **Default posture for new servers**: read-only tools only, with write and destructive tools opt-in, mirroring GitHub's read-only mode and Supabase's read-only default.
- **Step-up OAuth scopes** for write and destructive tools, so a stolen read token cannot write.

### Gaps
- I found no published benchmark data on appropriate default rate limits for agent-invoked tools.
- No source quantified consent-fatigue rates for MCP confirmation prompts.

---

## 6. What the frameworks and vendors say

### Takeaway
By Oct 2026 there is a dense, mostly consistent body of guidance:
- **OWASP**: LLM Top 10 2025; MCP Top 10 (beta); Agentic Top 10 (Dec 2025); MCP Security Cheat Sheet.
- **CoSAI**: MCP Security paper (Jan 2026).
- **Government**: NSA CSI on MCP (May 2026); NIST CAISI RFI on agent security (Jan 2026).
- **MITRE ATLAS**: agent techniques added (Oct 2025).
- **Vendors**: directory and submission policies from Anthropic and OpenAI, and defense-in-depth write-ups from Microsoft and Google.

They converge on these points:
- treat all tool output as untrusted;
- least privilege executed in the user's context;
- narrow, honest, stable tool metadata;
- accurate annotations, without trusting them;
- human approval for high-impact actions;
- deterministic blocking of exfiltration channels;
- rate limits and audit logging.

None claims prompt injection is solved.

### Cited Findings
- **OWASP Top 10 for LLM Applications 2025** (the entries most relevant to this server)
  - LLM01 Prompt Injection: indirect injection "occur[s] when an LLM accepts input from external sources". Mitigations include least privilege, human approval, segregating external content, and adversarial testing. — [OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)
  - LLM05 Improper Output Handling. — [OWASP LLM05:2025](https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/)
  - LLM06 Excessive Agency. — [OWASP LLM06:2025](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- **OWASP MCP Top 10** (beta; entries suffixed ":2025"; page © 2026): MCP01 Token Mismanagement & Secret Exposure; MCP02 Privilege Escalation via Scope Creep; MCP03 Tool Poisoning; MCP04 Supply Chain & Dependency Tampering; MCP05 Command Injection & Execution; MCP06 Prompt Injection via Contextual Payloads; MCP07 Insufficient AuthN/AuthZ; MCP08 Lack of Audit and Telemetry; MCP09 Shadow MCP Servers; MCP10 Context Injection & Over-Sharing. — [OWASP MCP Top 10](https://owasp.org/www-project-mcp-top-10/)
- **OWASP MCP Security Cheat Sheet** (undated; references spec 2026-07-28): hash and pin full definitions, treat responses as untrusted, confirm destructive, financial and data-sharing operations, rate limits, and full-parameter logging. — [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- **OWASP Top 10 for Agentic Applications 2026** (published 9 Dec 2025 per secondary sources): ASI01 Agent Goal Hijack; ASI02 Tool Misuse & Exploitation; ASI03 Identity & Privilege Abuse; ASI04 Agentic Supply Chain; ASI05 Unexpected Code Execution; ASI06 Memory & Context Poisoning; ASI07 Insecure Inter-Agent Communication; ASI08 Cascading Failures; ASI09 Human-Agent Trust Exploitation; ASI10 Rogue Agents. — [HUMAN Security summary](https://www.humansecurity.com/learn/blog/owasp-top-10-agentic-applications/); [Cycode summary](https://cycode.com/blog/owasp-top-10-agentic-applications/). Secondary only; I did not fetch the OWASP primary.
- **CoSAI, "Model Context Protocol (MCP) Security"** (Workstream 4; dated and board-approved 8 Jan 2026; OASIS announced 27 Jan 2026; developed with Anthropic and MCP maintainers)
  - About 40 threats in 12 categories (MCP-T1 to T12), in three tiers: MCP-specific, MCP-contextualized and conventional.
  - MCP-specific threats include Tool Poisoning, Full Schema Poisoning, Resource Content Poisoning, Typosquatting/Confusion, Shadow MCP Servers and Overreliance on the LLM.
  - Controls relevant to servers: input and data sanitization (treat "all data returned from MCP servers including tool and resource definitions, resources, prompts, elicitation requests, and tool responses" as untrusted); secure tool and UX design (single-purpose tools; don't rely on the LLM for security); human-in-the-loop via server-side elicitation; logging; lifecycle governance (signing, SBOMs, version pinning).
  - Sources: [CoSAI paper (PDF)](https://www.coalitionforsecureai.org/wp-content/uploads/2026/03/model-context-protocol-security-1.pdf); [OASIS press release](https://www.oasis-open.org/2026/01/27/coalition-for-secure-ai-releases-extensive-taxonomy-for-model-context-protocol-security)
- **MITRE ATLAS**: in Oct 2025, 14 agent-focused techniques from Zenity's AI Agents Attack Matrix were added. The CSA gap analysis cites them by ID: Exfiltration via AI Agent Tool Invocation (AML.T0086), AI Agent Context Poisoning (AML.T0080), Modify AI Agent Configuration (AML.T0081), RAG Credential Harvesting (AML.T0082). — [Zenity](https://zenity.io/blog/zenity-labs-and-mitre-atlas-collaborate-to-advances-ai-agent-security-with-the-first-release-of); [CSA ATLAS gap analysis, 27 Mar 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-atlas-agentic-gap-analysis-20260327/). The ATLAS technique pages themselves were not reachable (404); IDs come from secondary sources.
- **NIST CAISI RFI** on securing AI agent systems: Federal Register 8 Jan 2026, docket NIST-2025-0035, comments closed 9 Mar 2026. It names hijacking and backdoor attacks as risks and will inform voluntary guidelines. — [NIST news](https://www.nist.gov/news-events/news/2026/01/caisi-issues-request-information-about-securing-ai-agent-systems); [Federal Register](https://www.govinfo.gov/content/pkg/FR-2026-01-08/html/2026-00206.htm)
- **NSA AISC Cybersecurity Information Sheet**, "Model Context Protocol (MCP): Security Design Considerations for AI-Driven Automation" (20 May 2026, Ver. 1.0)
  - Per press coverage: MCP adoption "has outpaced the development of its security model".
  - Risks named: dynamic tool invocation, implicit trust relationships, context sharing, weak access controls, poor approval workflows, limited audit logging, DoS patterns.
  - Sources: [NSA press release](https://www.nsa.gov/Press-Room/Press-Releases-Statements/Press-Release-View/Article/4496698/); [IC News](https://intelligencecommunitynews.com/nsa-releases-security-design-considerations-for-ai-driven-automation/); [TechInformed](https://techinformed.com/nsa-warns-enterprises-over-security-gaps-in-ai-agent-protocol/). The PDF ([nsa.gov](https://www.nsa.gov/Portals/75/documents/Cybersecurity/CSI_MCP_SECURITY.pdf)) returned 403, so the specific controls are unverified.
- **MCP spec security best practices (2026-07-28)**: covers confused deputy (OAuth proxy per-client consent), token passthrough (forbidden: "MUST NOT accept any tokens that were not explicitly issued for the MCP server"), SSRF, state-handle hijacking, scope minimization, and local-server compromise. It is mostly about authorization; it does not address prompt injection directly. — [MCP Security Best Practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- **Anthropic**
  - Software Directory Policy: narrow and accurate descriptions, no coercion, no hidden instructions, annotations mandatory, OAuth 2.0 for remote auth, notify material changes. — [Software Directory Policy](https://support.claude.com/en/articles/13145358)
  - Connector review criteria: separate read and write tools, annotations drive auto-permissions, avoid prompt-injection patterns, reasonable response sizes. — [Claude review criteria](https://claude.com/docs/connectors/building/review-criteria.md)
  - User guidance for custom connectors: only connect trusted servers, "Be aware of prompt injection risks. Claude has built-in protections", "Only click Always allow for trusted servers". — [Claude docs, custom connectors](https://claude.com/docs/connectors/custom/remote-mcp.md)
- **OpenAI**: the Apps SDK security guide says "Assume prompt injection and malicious inputs will reach your server" and "Custom MCP servers enable full MCP access, including write tools". It also covers least privilege, confirmations and data minimization. Submission guidelines cover annotation semantics, metadata anti-manipulation and restricted data (PCI, PHI, credentials). — [OpenAI Security & Privacy](https://developers.openai.com/apps-sdk/guides/security-privacy); [OpenAI App submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- **Microsoft** (MSRC, 29 Jul 2025): defense in depth with probabilistic spotlighting and Prompt Shields, deterministic exfiltration blocking, data governance, and human-in-the-loop consent. — [MSRC](https://www.microsoft.com/en-us/msrc/blog/2025/07/how-microsoft-defends-against-indirect-prompt-injection-attacks)
- **Google** (13 Jun 2025): model hardening, injection classifiers, security thought reinforcement, markdown sanitization and URL redaction, a user confirmation framework, and end-user notifications. — [Google blog](https://blog.google/security/mitigating-prompt-injection-attacks/)
- **Cloud Security Alliance** (2026 research notes): treat MCP-sourced content as adversarial; agents currently "treat MCP-sourced content as authoritative data". — [CSA agentjacking note](https://labs.cloudsecurityalliance.org/research/csa-research-note-agentjacking-mcp-sentry-injection-20260612/)

### Inferences
- Draft "product enforces" list for the ADR, each item traceable to at least two independent sources above:
  1. Least-privilege execution in the user's context. (OWASP LLM06; MSRC; GA/Supabase)
  2. Separate read and write tools, with no catch-all tools. (Anthropic; CoSAI)
  3. Accurate annotations derived automatically from the tool's label, plus server-side enforcement that matches them. (Anthropic; OpenAI; MCP blog)
  4. Linted, versioned, hashed and reviewed tool metadata, with `list_changed`. (Invariant; OWASP cheat sheet; MCP spec; arXiv drift census)
  5. Output minimization and untrusted-content labeling and neutralization. (OpenAI; Anthropic; OWASP LLM01 and LLM05; Supabase)
  6. A trifecta guard: restrict exfiltration channels and require confirmation when untrusted plus private data are present. (Willison; Meta; MSRC)
  7. Server-side confirmation for destructive and exfiltration-capable tools through elicitation. (CoSAI; MCP elicitation spec)
  8. Rate limits, quotas and audit logs. (MCP spec MUST; OWASP; CoSAI)
- Aligning with Anthropic's and OpenAI's directory rules has a side benefit: servers web-agent publishes stay eligible for directory listing if customers want that later.

### Gaps
- NSA CSI full text was not accessible (403). Specific NSA controls are unverified.
- OWASP Agentic Top 10 was verified only through vendor summaries.
- MITRE ATLAS technique descriptions were not fetched.
- Microsoft's MCP-specific developer post, "Protecting against indirect injection attacks in MCP" (devblogs, believed Apr 2025), could not be fetched because of a redirect loop. Its content is not included.
- Not verified in this session: Elastic Security Labs' MCP attack-vector post, HiddenLayer's MCP parameter-abuse research, and Anthropic's general prompt-injection research posts.
- No follow-up NIST guidance after the CAISI RFI was found as of Oct 2026.
