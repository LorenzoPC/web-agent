# ADR-0004: Per-person sign-in for MCP connections

**Status:** Proposed. It comes from a tech review on 2026-11-24 and 2026-11-25. Nothing is built: the MCP connection page (`/app/settings/mcp`) is a mockup on mock data, and no MCP endpoint or authorization server exists yet.
**Created:** 2026-11-25
**Amends:** [ADR-0003](0003-mcp-server-security-and-governance.md) decisions 2 and 3, and decision 12 if open question 6 goes the recommended way.
**Related:** the MCP connection page (every file is listed under [Files for the MCP connection page](#files-for-the-mcp-connection-page)); the "MCP connection" items in [`../project/backlog.md`](../project/backlog.md).

**Redesigning the MCP connection page?** Read [Decision](#decision), then [What changes on the MCP connection page](#what-changes-on-the-mcp-connection-page) and [Files for the MCP connection page](#files-for-the-mcp-connection-page). The open questions are still open: don't build an answer to them into the page without checking.

---

## Context

**Today**, Sherweb sets up MCP access per client organization: one credential per AI client, shared by everyone at that company. How that credential works (a key in a header, an OAuth client using client credentials, a token in a config file) still has to be confirmed in Sherweb's code and docs. A shared credential hides who is calling, so the server can't apply permissions per person, audit what a person did, or cut off one person who leaves.

**The goal** is that every call carries the person's own token, and the server decides on every call what that person may reach (ADR-0003 decisions 4 and 5).

### What the tech review established

Answers from Sherweb, 2026-11-24 and 2026-11-25:

| Topic | Answer |
|---|---|
| Customers' identity providers | Mostly Microsoft Entra ID, since Sherweb is mainly a Microsoft reseller. Some Google Workspace. A few others, possibly Okta. |
| Companies with no identity provider | Sherweb provides the identity. What form that takes is open (open question 2). |
| Who can connect | Anyone with an email on the company's verified domain. |
| Admins | Each company has at least two. |
| Partners and resellers (MSPs) | They don't work in their customers' data, but they do some operations work. One identity, acting on behalf of the customer, with an organization picker. |
| Sherweb's own identity platform | Entra ID and the Microsoft stack. |
| Scale | About 100 customer companies and 5,000 monthly active users. |
| Target date | As soon as possible. |
| Security team | Would prefer to stay on Microsoft for operations. A preference, not a hard requirement. |
| Today's shared credential | Confirmed as shared. How it works is still to be checked in code and docs. |

### What the research found (2026-11-24)

- **Entra ID can now be an MCP server's authorization server, but only in preview.**
  - Microsoft documents support for Client ID Metadata Documents (CIMD) at a versioned endpoint, `https://login.microsoftonline.com/<tenant>/oauth21/2026-08`. Using `organizations` in place of the tenant accepts users from any Entra tenant. The guide is dated 2026-11-05.
  - It's a public preview, "not recommended for production workloads", with no service-level agreement.
  - Microsoft's table of tested clients:
    - Supported: Claude, Claude Code, Codex, and custom clients built on the MCP SDKs.
    - Not supported: ChatGPT ("Its confidential-client authentication flow isn't supported by the Microsoft Entra preview"). Also VS Code and GitHub Copilot, because Microsoft's own clients use Microsoft's existing app registrations, not CIMD.
    - Cursor isn't listed.
  - The token's audience is the MCP server app's client ID (a GUID), not the server's URL. So each audience needs its own app registration.
- **Entra's consent rules limit what people can approve for themselves.**
  - Entra treats CIMD clients as unverified. Under the default consent policy, users can only grant them basic permissions such as `openid` and `User.Read`.
  - In tenants set to "Do not allow user consent", users can't add them at all.
  - So with Entra used directly, each company's admin approves each AI client once.
  - Entra offers no tenant-wide allowlist of CIMD domains.
- **Entra External ID can't sign in users from other companies' Entra tenants.**
  - Microsoft says direct SAML or WS-Fed federation between two Entra tenants isn't supported.
  - OIDC federation from another company's tenant is unsupported or in preview, depending on the source.
  - Its free tier (50,000 monthly active users) doesn't help if it can't sign in most customers.
- **Okta enterprise-managed sign-in (ID-JAG) only works with Okta** (research from 2026-11-14), so it doesn't suit customers who are mostly on Microsoft.
- **Hosted vendors support CIMD in production.**
  - WorkOS has since 2025-11-30, and keeps Dynamic Client Registration (DCR) for older clients.
  - Clerk's support has been generally available since 2026-09-17.
- **Entra's `email` claim can't be trusted on its own.**
  - A tenant admin can set a user's email to any value, and apps that matched accounts on it were taken over (the "nOAuth" flaw, Descope, June 2023).
  - The tenant ID (`tid`) and the user's object ID (`oid`) are stable.

## Decision

1. **Every call carries a person's own token.**
   - This confirms ADR-0003 decision 4.
   - Shared credentials are legacy. The page helps admins move off them, and no new one is issued.
   - GitHub's coding agent can't do OAuth, so it stays unavailable.

2. **For launch, a vendor runs the authorization server that AI clients talk to.**
   - It's the only authorization server listed in our Protected Resource Metadata.
   - It must offer:
     - CIMD;
     - DCR for clients without CIMD;
     - PKCE (S256);
     - refresh tokens that rotate;
     - RFC 9207 `iss`;
     - a separate audience per MCP server (ADR-0003 decision 1).
   - WorkOS is the first candidate and Clerk the second. The choice depends on the checks in [Follow-ups](#follow-ups).
   - This settles ADR-0003 decision 2's "a hosted vendor or our own".

3. **People sign in through the vendor with their own identity provider, Microsoft first.**
   - **Sign in with Microsoft:** one multi-tenant app registered in Sherweb's Entra tenant. It covers every Entra customer and Sherweb staff. Sign-in happens at Microsoft, so each customer's MFA and conditional access rules still apply.
   - **Sign in with Google** for Google Workspace companies.
   - **A per-company OIDC or SAML connection** for the few companies on Okta or another provider.
   - **Accounts the vendor runs** (emailed code or passkey) for companies with no identity provider, if that's what "Sherweb provides" means (open question 2).

4. **A company is matched by its identity provider, never by email alone.**
   - **Microsoft:** the tenant ID (`tid`). Sherweb's reseller records may already hold each customer's tenant ID (open question 4).
   - **Google:** the `hd` (hosted domain) claim.
   - **Accounts we run:** the company proves it owns its domain with a DNS record.
   - **Email domain:** a second check only. Public email domains (gmail.com, outlook.com and the like) never match a company.

5. **A person is identified by their identity provider's IDs, not the vendor's.**
   - Microsoft: `tid` plus `oid`. Other providers: `iss` plus `sub`, as in ADR-0003 decision 4.
   - The vendor must pass these through.
   - Then dropping the vendor later doesn't mean re-identifying 5,000 people.

6. **Enrolling a company.**
   - The company's admin approves the web-agent Microsoft app once in Entra (admin consent). Some tenants let users approve it themselves, since it asks only for basic profile access, but the page plans for the admin step.
   - After that, anyone on a verified domain can connect without being invited, within the groups the admin allows ("Who can connect").
   - A company always keeps at least two admins: the page won't remove an admin when only two are left.

7. **We enforce which AI clients may connect, per company.**
   - With the vendor in the middle, the customer's Entra only sees the web-agent app, not Claude or ChatGPT.
   - So the page's Allow switch for each AI client is the control.
   - The authorization server enforces it with a per-company allowlist of client IDs, and the MCP server checks it again on every call.

8. **Partners (MSPs) act from their own company, through a relationship.**
   - This follows Microsoft's GDAP (granular delegated admin privileges), which Sherweb's partners already use.
   - The technician keeps one identity in their own company.
   - A relationship the customer's admin approves gives them an Operations role in the customer's company, which never reaches customer data. Relationships live in the relationship store from ADR-0003 decision 9.
   - Where the organization picker lives is open (open question 6). We recommend choosing on each call, defaulting to the person's own company. That would amend ADR-0003 decision 12, which ignores company IDs passed in tool arguments: the company would be checked against the relationship store on every call instead.

9. **Okta enterprise-managed sign-in is no longer a main path.**
   - This amends ADR-0003 decision 3.
   - Offer it only if an Okta customer asks.

10. **Using Entra directly is the planned later path.**
    - Revisit when Entra's CIMD support is generally available and works with ChatGPT.
    - Entra customers could then use their own Entra as the authorization server, and admins would approve each AI client there.
    - Decision 5 keeps that move cheap.

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| **Entra ID directly as the authorization server** | All Microsoft, free, and admins would approve AI clients in their own Entra. But its CIMD support is a preview "not recommended for production", ChatGPT isn't supported and Cursor isn't listed. It also only signs in Entra accounts: Google, Okta and companies without an identity provider would need guest accounts in a tenant Sherweb runs. And since Claude only uses the first authorization server a resource lists, those guests and users from other tenants couldn't share one MCP URL. This is the planned later path (decision 10). |
| **Entra External ID plus our own MCP layer** | Hosted by Microsoft and free up to 50,000 monthly active users. But it can't sign in users from other companies' Entra tenants, who are most of the customers. We'd still have to build the part that speaks MCP's OAuth, too. |
| **Our own authorization server** | The most control and no vendor. Too slow for "as soon as possible", and the security work (issuing and rotating tokens, fetching and caching client ID documents) is what vendors already do. |
| **Okta enterprise-managed sign-in as the main path** | Customers are mostly on Entra, and this only works with Okta. |
| **A per-company SSO connection for every Entra customer** | Vendors usually charge per connection, and each company would need its own setup. One multi-tenant Microsoft app covers them all. |
| **Keep the shared credential** | It hides who is calling, and every permission, audit and offboarding control depends on knowing (ADR-0003). |

## Consequences

**Positive**

- The launch uses production-ready pieces and works with every AI client we support, ChatGPT included.
- Identities, MFA, conditional access and offboarding stay in each customer's Entra and in Sherweb's. The vendor only issues tokens.
- Leaving the vendor later is a configuration change, not a migration of people.

**Negative / risks**

- A non-Microsoft vendor sits in the sign-in path, against the security team's preference.
- Until the Entra-direct path, admins approve AI clients on our page, not in their own Entra.
- Nobody at a company can connect until its admin approves the web-agent app in Entra.
- Partner relationships need a relationship store and an approval flow that don't exist yet.

## What changes on the MCP connection page

This is for the session that redesigns `/app/settings/mcp`. The page stays a frontend on mock data. Anything that needs a backend that isn't built yet gets `unbuilt("action" | "panel", …)` from `src/lib/unbuilt.ts`, which paints it orange.

- **Put the sample company on Entra, not Okta.**
  - `ORG` in `src/lib/mock-mcp-connection-data.ts` is Northwind Logistics on Okta. Switch it to Entra, with a tenant ID.
  - The summary strip shows the Microsoft tenant, and how each verified domain was verified (decision 4).
- **Add a first step: approve web-agent in Microsoft Entra** (decision 6).
  - Show whether it's approved, by whom and when, plus the link to approve it.
  - Until it's approved, every AI client shows Needs setup.
- **Every AI client signs in through our authorization server** (decision 2):
  - Claude, ChatGPT, VS Code and Copilot CLI use their own client ID document (CIMD).
    - Copilot CLI's document URL is still a `VERIFY` in the mockup.
    - Microsoft's table lists `https://github.com/copilot/desktop/client-metadata.json` for GitHub Copilot, which may be it.
  - Cursor uses a client ID our authorization server issues, since Cursor has no CIMD.
  - Microsoft 365 Copilot uses a Copilot Studio agent or a declarative agent pointed at our authorization server. Whether Copilot Studio sends PKCE is still to be verified.
  - GitHub's coding agent stays unavailable (no OAuth).
  - Remove the "Enterprise-managed (Okta)" options (`claude-ema`, `vscode-ema`), or move them out of the way (decision 9).
  - The "Your own client ID" options for Claude and ChatGPT (`claude-org-client`, `chatgpt-org-client`) issue one client per company. Decide whether they stay, now that CIMD covers both and decision 7 handles the allowlist.
- **Add an Admins section.** It lists the company's admins and disables Remove when only two are left (decision 6). Where admins come from is open question 3.
- **Add a Partner access section** (decision 8). It lists which partners have Operations access, with approve, revoke and an expiry if there is one (open question 5).
- **Who can connect:** groups still come from the identity provider. Where this is enforced, and how groups reach us, is open question 8.
- **Keep what already works:** the move off the shared credential (`SharedCredentialCard` in `client-panel.tsx`), the "Set these exactly" tables, and the connection check.
- **Update the tags in `src/lib/mock-mcp-connection-data.ts`:**
  - Decisions 3 and 9 settle the `DECIDE` about organizations on Entra ID or Google Workspace.
  - The Okta-only `VERIFY` items (Claude's managed authorization for custom connectors, VS Code's enterprise-managed `oauth` block) drop in priority.
  - The ranked list in the file's header should match.

## Files for the MCP connection page

All paths are from the repo root, as of `main` on 2026-11-25.

**The page**

| File | What it holds |
|---|---|
| `src/app/app/settings/mcp/page.tsx` | The page itself (a server component): heading, description, a link to Get started, and the mock data passed to the settings component. |
| `src/components/mcp-connection/connection-settings.tsx` | Client component: the summary strip (server URL, identity provider, verified domains, clients allowed), the banner counting shared credentials still on, the list of AI clients, and the selected client's panel. |
| `src/components/mcp-connection/client-panel.tsx` | One AI client's panel: Allow switch, the shared-credential card, "How people sign in" (the options), "Set up in …" (steps, credential, "Set these exactly" table, values, config or install link), "Who can connect", and "Check the connection". |
| `src/lib/mcp-connection.ts` | Logic: each client's status and current sign-in option, whether a shared credential is still on, filling `{placeholders}` in text, mock issued credentials, the connection check's steps, and VS Code and Cursor install links. |
| `src/lib/mock-mcp-connection-data.ts` | Types and mock data: the organization, its groups, test people, the six AI clients (with sources per client and `VERIFY`, `MOCK` and `DECIDE` tags), starting settings, activity and shared credentials. Its header ranks what to validate before refactoring. |

**Shared code it uses**

| File | What it provides |
|---|---|
| `src/lib/mock-onboarding-data.ts` | `MCP_URL`, shared with Get started. |
| `src/components/onboarding/copy-button.tsx` | The copy buttons. |
| `src/components/tools/form-controls.tsx` | `Field`, `Section`, `Segmented`, `INPUT_CLASS` and `MONO_INPUT_CLASS`. |
| `src/lib/unbuilt.ts` and `src/app/globals.css` | The orange "not built yet" markers and the CSS that paints them. |

**Pages and docs that point at it**

| File | What to keep in step |
|---|---|
| `src/app/app/onboarding/page.tsx` | Get started links here: "Choose which AI clients your people can use". |
| `docs/prds/sitemap.html` | The Client workspace entry "MCP connection" and its one-line purpose. |
| `docs/design/web-agent.md` | The "MCP connection (2026-11-14, UI only, mock data)" paragraph, which describes the current page. Update it after the redesign. |
| `docs/project/backlog.md` | The "MCP connection" items: what to validate, the move off shared credentials, and Get started. |
| `docs/adr/0003-mcp-server-security-and-governance.md` | The security and governance decisions this ADR amends. |

## Open questions

1. **How today's shared credential works.** To be checked in Sherweb's code and docs:
   - What it is (a key in a header, client credentials, something else), and which file checks it.
   - How it maps to a company: one per company, or one per company per AI client.
   - Who issues and rotates it, and where companies paste it.
   - Whether anything identifies the person: a user header, `clientInfo`, an IP address, or nothing.
   - Where permissions are applied today.
   - Whether the logs can count calls per company and per AI client.
2. **What "Sherweb provides" means** for companies with no identity provider: accounts we run, or a Microsoft tenant Sherweb sets up for them?
3. **Where admins come from:** named in web-agent, or taken from an Entra role or group?
4. **Customer tenant IDs:** do Sherweb's records already hold each customer's Microsoft tenant ID?
5. **Partner access approval:** does the customer's admin approve each partner, and does the access expire?
6. **Where the organization picker lives.**
   - At sign-in: a token per company. Simplest, and fits ADR-0003 decision 12, but switching means reconnecting.
   - On each call: smooth switching, but it amends decision 12.
   - One answer in the review was cut off at "one person can only exist within…"; it probably settles this.
7. **The MCP URL:** one URL, `https://mcp.webagent.dev` (as Get started shows), or one per server, `https://webagent.dev/mcp/<slug>` (ADR-0003 decision 1)? It's the OAuth resource, so decide it before the authorization server is set up.
8. **Who can connect.**
   - Where it's enforced: at sign-in, on every call, or both.
   - How groups reach us: Microsoft's groups claim, Microsoft Graph, or SCIM.
9. **Personal tokens:** should people be able to generate one as a fallback for IDEs and command-line tools?

## Follow-ups

**Before choosing the vendor (a day or two)**

- [ ] Its Microsoft sign-in passes through `tid` and `oid` (decisions 4 and 5).
- [ ] The cost at 5,000 monthly active users, with Microsoft as one shared login rather than a paid connection per company.
- [ ] Data can stay in Canada, for Québec's Law 25.
- [ ] Each of these connects end to end to a test MCP server, with a per-server audience: Claude, ChatGPT, Cursor, VS Code, Copilot CLI and a Copilot Studio agent.
- [ ] It supports RFC 9207 `iss` and per-company client allowlists (decision 7).

**In parallel**

- [ ] Try Entra directly with Claude against a test server, using the `organizations` endpoint, so we know the gap when Microsoft makes CIMD generally available.
- [ ] Verify that Copilot Studio sends PKCE (S256). It's already the top `VERIFY` in the mockup.

**Docs and mockup**

- [ ] Redesign `/app/settings/mcp` as described in [What changes on the MCP connection page](#what-changes-on-the-mcp-connection-page).
- [ ] Update `docs/design/web-agent.md` and the backlog after the redesign.

## Sources

Checked on 2026-11-24.

- Microsoft Learn, [Secure an MCP server with Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/agent-id/secure-mcp-server-with-entra-id) (dated 2026-11-05)
- Microsoft Learn, [Client ID Metadata Documents in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/agent-id/client-id-metadata-documents) (dated 2026-10-30): preview status, tested clients, consent policy and limitations
- Microsoft Learn, [SAML/WS-Fed identity provider federation](https://learn.microsoft.com/en-us/entra/external-id/direct-federation-overview): federation between two Entra tenants isn't supported
- Microsoft Q&A, [Entra External ID: can we sign in with our workforce tenant as OIDC IdP?](https://learn.microsoft.com/en-us/answers/questions/5533119/entra-external-id-can-we-sign-in-with-our-workforc)
- Microsoft Learn, [External ID pricing](https://learn.microsoft.com/en-gb/entra/external-id/external-identities-pricing)
- WorkOS, [Client ID metadata support for MCP auth](https://workos.com/changelog/client-id-metadata-support-for-mcp-auth) and [AuthKit MCP docs](https://workos.com/docs/authkit/mcp)
- Clerk, [Client ID Metadata Documents generally available](https://clerk.com/changelog/2026-09-17-client-id-metadata-documents-ga.md)
- The per-client facts behind the mockup (checked 2026-11-14) are listed above each client in `src/lib/mock-mcp-connection-data.ts`.
