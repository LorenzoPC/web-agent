// Mock data for MCP connection settings (/app/settings/mcp): the AI clients a
// client organization's admin can let their people connect from, and how each
// one signs people in. Nothing here is live: the server, our authorization
// server and the client IDs are all mock.
//
// The server applies user-based RBAC, so every call has to carry the person's
// own token. Each sign-in option says whether it does (ADR-0003: OAuth, CIMD
// preferred, pre-registered clients, Okta enterprise-managed sign-in, no shared
// keys).
//
// BEFORE REFACTORING THIS MOCKUP
//
// Three tags mark what isn't settled. Find them all with:
//   grep -n "VERIFY\|MOCK\|DECIDE" src/lib/mock-mcp-connection-data.ts src/lib/mcp-connection.ts
//
//   VERIFY  A vendor fact we couldn't confirm in the vendor's own docs (search
//           snippet only, or not covered). Check it in the live product first.
//   MOCK    A placeholder for data the real system has to supply: our
//           authorization server, the directory, the server's telemetry.
//   DECIDE  A product or security decision that's still open.
//
// Untagged menu paths, field names, URLs and config shapes were confirmed in
// the docs listed above each client, on 2026-11-14. Summaries, notes and other
// explanations are our own wording. Vendor admin screens change often, so
// re-check paths and labels in the live product when you build, tagged or not.
//
// The page keeps every setting in its own state (connection-settings.tsx and
// client-panel.tsx): nothing is saved, and the check calls nothing.
//
// Most important first:
//   1. VERIFY that Copilot Studio sends PKCE (S256). If it doesn't, our
//      authorization server rejects it (ADR-0003), and the Copilot Studio
//      option needs a server-side exception or has to go.
//   2. VERIFY that Claude's managed authorization (Okta) works for custom
//      connectors, not only the named ones Anthropic lists.
//   3. DECIDE how each organization's shared credential really works today
//      (SHARED_CREDENTIALS is a guess) and how revoking it is enforced.
//   4. MOCK our authorization server: its URLs, scopes, issued client IDs, the
//      redirect URIs it registers, and the CIMD allowlist (claude.ai,
//      chatgpt.com, vscode.dev, and Copilot CLI's document, URL unknown).
//   5. DECIDE the MCP URL. Get started uses https://mcp.webagent.dev, while
//      ADR-0003 gives each server its own (https://webagent.dev/mcp/<slug>).
//   6. DECIDE whether people can generate personal tokens as a fallback. Only
//      VS Code, Cursor, Copilot CLI and Copilot Studio could use one.
//   7. VERIFY the config shapes still open: VS Code's enterprise-managed
//      `oauth` block, the device policies' value formats, Cursor's allowlist
//      pattern syntax.
//
// docs/project/backlog.md ("MCP connection") tracks the same items.

export interface Organization {
  slug: string;
  name: string;
  identityProvider: { name: string; tenant: string; issuer: string };
  verifiedDomains: string[];
}

// MOCK: the organization, its identity provider and verified domains come from
// the tenant record once organizations sign in (auth is V2 in the PRD).
// DECIDE: organizations on Entra ID or Google Workspace. Enterprise-managed
// sign-in (ID-JAG) only works with Okta today.
export const ORG: Organization = {
  slug: "northwind",
  name: "Northwind Logistics",
  identityProvider: { name: "Okta", tenant: "northwind.okta.com", issuer: "https://northwind.okta.com" },
  verifiedDomains: ["northwind.com", "northwind.co.uk"],
};

/** Groups synced from the organization's identity provider. */
// MOCK: synced from the identity provider (SCIM or claim mapping, ADR-0003 item 4).
// DECIDE: where "Who can connect" is enforced: by our authorization server at
// sign-in, on every call, or both.
export const ORG_GROUPS = ["Support", "Sales", "Customer Success", "Engineering", "Finance", "IT admins"];

/** People the connection check can sign in as. Each one's tools come from their own permissions. */
export interface TestPerson {
  name: string;
  group: string;
  tools: number;
}

// MOCK: the real check should sign in as a real directory person and ask the
// server's rule resolver what they'd see ("Preview as" in ADR-0003).
export const TEST_PEOPLE: TestPerson[] = [
  { name: "Maya Chen", group: "Support", tools: 9 },
  { name: "Liam Patel", group: "Engineering", tools: 14 },
  { name: "Ana Souza", group: "Finance", tools: 5 },
];

/** Tools everyone reaches through a shared organization credential: the whole organization's access. */
// MOCK: what the organization's shared credential reaches today.
export const ORG_WIDE_TOOLS = 22;

/** The server's name in config files and install links. */
export const SERVER_NAME = "web-agent";

export type HarnessId = "claude" | "chatgpt" | "m365-copilot" | "github-copilot" | "vscode" | "cursor";

export interface CopyValue {
  label: string;
  value: string;
  /** Hidden until the admin chooses to show it. */
  secret?: boolean;
}

/**
 * How an AI client proves who it is to our authorization server:
 * - client-metadata: the client's own public client ID document (CIMD), nothing to register
 * - org-client: a client ID (and maybe a secret) we issue for this organization
 * - enterprise-managed: Okta vouches for the person (ID-JAG), no sign-in screen
 * - agent-token: a static token for an agent that runs without a person
 */
export type AuthKind = "client-metadata" | "org-client" | "enterprise-managed" | "agent-token";

/** One field in the client's own settings, and the value that keeps every call tied to one person. */
export interface SettingPick {
  field: string;
  value: string;
  /** The tempting wrong choice, named so the admin can tell it apart. */
  not?: string;
}

export interface AuthMethod {
  id: string;
  kind: AuthKind;
  label: string;
  summary: string;
  /**
   * Whose token each call carries. User-based RBAC needs "person": a "shared"
   * credential can't tell people apart, so those options are listed but can't be picked.
   */
  identity: "person" | "shared";
  recommended?: boolean;
  /** Plans or products this method needs, shown as "Needs …". */
  needs?: string;
  /** Why it can't be picked, if it can't. */
  unavailable?: string;
  /** Something unconfirmed or risky about this method, shown as a warning. */
  caveat?: string;
  /** Label of the connection check's client step, e.g. "Claude's client ID is on your allowlist". */
  check: string;
  /** Set when we issue a client ID or token before this method works. */
  issuesCredential?: {
    /** client: ID and secret. public-client: ID only, for apps that can't keep a secret. token: one secret token. */
    kind: "client" | "public-client" | "token";
    action: string;
    note: string;
    /** Shown in the status line and the check until it's issued. */
    missing: string;
  };
  /** Set when the client generates a redirect URL that we need to register. */
  redirectFromClient?: { label: string; hint: string; placeholder: string };
  /** The client's fields and the one value to pick in each. */
  picks: SettingPick[];
  /** Values to paste into the client. {placeholders} are filled on the page. */
  values?: CopyValue[];
  /** Replace the harness's steps when this method needs different ones. */
  adminSteps?: string[];
  memberSteps?: string[];
  config?: { filename: string; code: string };
  /** Builds a one-click install link from the config. */
  installLink?: "vscode" | "cursor";
}

export interface Harness {
  id: HarnessId;
  name: string;
  /** Where people use it. */
  surfaces: string;
  /** Plans that let an admin set it up for the whole organization. */
  plans: string;
  /** Where in the client's own admin console the steps happen. */
  adminConsole: string;
  prerequisites?: string[];
  adminSteps: string[];
  memberSteps: string[];
  methods: AuthMethod[];
}

// MOCK: lives in the page's state. Persist it per organization and client; a
// change has to take effect on the next call, not when tokens expire (ADR-0003 item 5).
export interface HarnessSetting {
  enabled: boolean;
  methodId: string;
  access: "everyone" | "groups";
  groups: string[];
  /** Whether we've issued this organization's client ID or token for the client. */
  credentialIssued: boolean;
  /** The redirect URL the client generated, for clients that make their own. */
  redirectUrl: string;
  /** Whether the admin has revoked the client's shared organization credential, if it has one. */
  sharedRevoked: boolean;
}

// MOCK: from the server's telemetry: distinct people calling with their own
// token, per client, and the time of the last call.
export interface HarnessActivity {
  /** People who sign in as themselves. */
  people: number;
  lastCall: string;
}

/**
 * The one credential we set up for the whole organization in a client, from
 * before per-person sign-in. Every call through it looks like the organization
 * as a whole, so per-person permissions can't apply. Mock: each one uses the
 * client's own shared mode, as the 2026-11-14 research found them.
 */
export interface SharedCredential {
  how: string;
  since: string;
  /** People whose calls came through it in the last 30 days. */
  people: number;
  /** What to remove in the client once it's revoked. */
  cleanup: string;
}

// MOCK: our authorization server doesn't exist yet, so these URLs are placeholders.
// DECIDE: the scopes. ADR-0003 calls for coarse Read, Write and Manage scopes;
// these names are stand-ins.
const AUTH_URLS: CopyValue[] = [
  { label: "Authorization URL", value: "https://auth.webagent.dev/authorize" },
  { label: "Token URL", value: "https://auth.webagent.dev/token" },
  { label: "Refresh URL", value: "https://auth.webagent.dev/token" },
  { label: "Scopes", value: "openid email mcp:read mcp:write" },
];

// VERIFY: GitHub's docs say the policy is off by default (search snippet only).
// Confirmed in GitHub's changelog: since late October 2026, unset policies
// follow the enterprise's "Default policy for new features".
const GITHUB_MCP_POLICY =
  "In your GitHub organization, open Settings → Code, planning, and automation → Copilot → Policies and turn on MCP servers in Copilot. If no one has set it, it follows your enterprise's default for new features.";

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export const HARNESSES: Harness[] = [
  {
    // Sources, checked 2026-11-14:
    //   support.claude.com/en/articles/11175166 (custom connectors, member steps)
    //   support.claude.com/en/articles/15537633 (managed authorization)
    //   claude.com/docs/connectors/building/authentication (CIMD rules, callback)
    // Claude only uses CIMD when our authorization server advertises
    // client_id_metadata_document_supported and `none` in
    // token_endpoint_auth_methods_supported; otherwise it falls back to DCR.
    // It also needs a 401 carrying resource_metadata, and only reads the first
    // authorization_servers entry.
    id: "claude",
    name: "Claude",
    surfaces: "claude.ai, the Claude desktop and mobile apps, and Claude Code",
    plans: "Claude Team or Enterprise",
    adminConsole: "Claude, as an Owner or Primary Owner",
    adminSteps: [
      "Open Organization settings → Connectors → Add → Custom → Web.",
      "Name it Web Agent, paste {url} and click Continue.",
      "Set each field as in the table below, then click Add.",
    ],
    memberSteps: [
      "Open Customize → Connectors, find Web Agent and click Connect.",
      "Sign in with their work email through {idp}. The token is theirs alone.",
      // VERIFY: the in-chat step wasn't in the docs we read.
      "In a chat, turn on Web Agent from the tools menu.",
    ],
    methods: [
      {
        id: "claude-cimd",
        picks: [
          { field: "Authentication", value: "Sign in when needed", not: "No sign in" },
          { field: "OAuth client", value: "Use Claude's published identity", not: "Register automatically" },
          { field: "Request headers", value: "Leave empty" },
        ],
        kind: "client-metadata",
        label: "Claude's published identity",
        summary:
          "Claude identifies itself with Anthropic's public client ID document, so there's nothing to register. Each person signs in the first time they connect.",
        identity: "person",
        recommended: true,
        check: "Claude's client ID is on your allowlist",
      },
      {
        id: "claude-org-client",
        picks: [
          { field: "Authentication", value: "Sign in when needed", not: "No sign in" },
          { field: "OAuth client", value: "Use your own OAuth client, with the client ID and secret above", not: "Register automatically" },
          { field: "Request headers", value: "Leave empty" },
        ],
        kind: "org-client",
        label: "Your own client ID",
        summary:
          "We issue a client ID and secret for {org}. Only a connector that uses them can sign people in, so access is tied to your Claude organization. Each person still signs in.",
        identity: "person",
        check: "Your client ID is registered",
        issuesCredential: {
          kind: "client",
          action: "Issue a client ID for Claude",
          note: "Issue a client ID and secret, then paste them into the connector's OAuth client settings.",
          missing: "Issue a client ID in step 2.",
        },
        // VERIFY: a search snippet says the callback may move to
        // https://claude.com/api/mcp/auth_callback, so register both.
        values: [{ label: "Redirect URI (we register it)", value: "https://claude.ai/api/mcp/auth_callback" }],
        adminSteps: [
          "Open Organization settings → Connectors → Add → Custom → Web.",
          "Name it Web Agent, paste {url} and click Continue.",
          "Set each field as in the table below, then click Add.",
        ],
      },
      {
        id: "claude-ema",
        picks: [
          { field: "Managed authorization: Identity source", value: "IdP-managed (Okta)" },
          { field: "Request headers", value: "Leave empty" },
        ],
        kind: "enterprise-managed",
        label: "Enterprise-managed (Okta)",
        summary:
          "People are already signed in to {idp}, so Claude gets each person's own Web Agent token without a sign-in screen. Removing someone in {idp} cuts them off.",
        identity: "person",
        needs: "Claude Team or Enterprise, and Okta",
        // VERIFY: whether custom connectors can use managed authorization, and
        // how its roles and scopes step maps onto our Read, Write and Manage scopes.
        // Trusted issuers are allowlisted per organization on our side (ADR-0003 item 3).
        caveat:
          "Anthropic's managed authorization article lists named connectors and doesn't say whether custom connectors qualify. Confirm with Anthropic before relying on it.",
        check: "{idp} ({tenant}) is a trusted issuer for your organization",
        values: [{ label: "Trusted issuer", value: "{issuer}" }],
        adminSteps: [
          "Add the connector with Claude's published identity first, if it isn't there yet.",
          "Open Organization settings → Connectors → Web Agent → Configuration, and click Set up next to Managed authorization.",
          "Set the identity source as in the table below and run the test.",
          "Choose the roles and scopes, then click Save & turn on.",
        ],
        memberSteps: [
          "Open Customize → Connectors and turn on Web Agent. There's no sign-in screen.",
          "In a chat, turn on Web Agent from the tools menu.",
        ],
      },
    ],
  },
  {
    // Sources, checked 2026-11-14:
    //   learn.chatgpt.com/docs/enterprise/apps-and-connectors (naming, who can use it)
    //   learn.chatgpt.com/docs/extend/mcp (workspace permissions)
    //   developers.openai.com/api/docs/guides/custom-mcp-server (create, auth options)
    //   developers.openai.com/apps-sdk/build/auth (callback, CIMD client ID)
    // help.openai.com couldn't be fetched, so admin paths rest on the pages above.
    // ChatGPT's CIMD client ID is https://chatgpt.com/oauth/client.json. Its
    // fixed callback needs our authorization server to return the RFC 9207 `iss`
    // parameter. Enterprise domain restrictions also need the openid and email
    // scopes and a UserInfo endpoint returning email_verified: true.
    id: "chatgpt",
    name: "ChatGPT",
    surfaces: "ChatGPT on the web, as a workspace plugin",
    plans: "ChatGPT Business, Enterprise or Edu",
    adminConsole: "ChatGPT, as a workspace admin or owner",
    adminSteps: [
      "In Workspace settings → Permissions & roles, turn on Create plugins with MCPs and Publish plugins to workspace for admins.",
      "Go to chatgpt.com/plugins, click + → Add custom MCP server and paste {url}.",
      "Set each field as in the table below, click Create as a plugin, and sign in once to check it.",
      // VERIFY: the publish path (Admin Console → Plugins → Manage Legacy Apps →
      // Drafts → Publish) came from a search snippet.
      "Publish it to the workspace from the Admin Console's Plugins page. Enterprise and Edu can limit it by role; Business makes it workspace-wide.",
    ],
    memberSteps: [
      // VERIFY: the member path is our wording, not from the docs.
      "In ChatGPT, open Plugins and add Web Agent.",
      "Connect with their work email through {idp} the first time they use it. The token is theirs alone.",
    ],
    methods: [
      {
        id: "chatgpt-cimd",
        picks: [
          { field: "Authentication", value: "OAuth", not: "No authentication, or OAuth or no authentication" },
          // VERIFY: the field's real label. The docs call these "static credentials".
          { field: "Client ID and secret", value: "Leave empty" },
        ],
        kind: "client-metadata",
        label: "ChatGPT's client ID",
        summary:
          "ChatGPT identifies itself with OpenAI's public client ID document, so there's nothing to register. Each person connects with their own account on first use.",
        identity: "person",
        recommended: true,
        check: "ChatGPT's client ID (chatgpt.com) is on your allowlist",
      },
      {
        id: "chatgpt-org-client",
        picks: [
          { field: "Authentication", value: "OAuth", not: "No authentication, or OAuth or no authentication" },
          { field: "Client ID and secret", value: "The ones issued above" },
        ],
        kind: "org-client",
        label: "Your own client ID",
        summary:
          "We issue a client ID and secret for {org}. Only a plugin that uses them can sign people in, so access is tied to your workspace. Each person still connects.",
        identity: "person",
        check: "Your client ID is registered",
        issuesCredential: {
          kind: "client",
          action: "Issue a client ID for ChatGPT",
          note: "Issue a client ID and secret, then enter them in the plugin's OAuth settings before you create it.",
          missing: "Issue a client ID in step 2.",
        },
        values: [
          { label: "Redirect URI (we register it)", value: "https://chatgpt.com/connector_platform_oauth_redirect" },
        ],
      },
    ],
  },
  {
    // Sources, checked 2026-11-14 (all under learn.microsoft.com/en-us/):
    //   microsoft-copilot-studio/mcp-add-existing-server-to-agent (add the tool, auth types)
    //   microsoft-copilot-studio/add-tools-custom-agent (End user or Maker-provided)
    //   microsoft-copilot-studio/configure-no-maker-authentication (Control maker credential options)
    //   microsoft-copilot-studio/publication-add-bot-to-microsoft-teams (publish)
    //   microsoft-365/copilot/extensibility/plugin-authentication-oauth (declarative agents)
    // Copilot Studio has no CIMD, and its automatic OAuth types need DCR, which
    // our authorization server doesn't offer. Power Platform data policies
    // govern MCP tools too.
    id: "m365-copilot",
    name: "Microsoft 365 Copilot",
    surfaces: "Microsoft 365 Copilot and Teams, through a Copilot Studio agent or a declarative agent",
    plans: "Microsoft 365 Copilot, plus Copilot Studio for a Studio agent",
    adminConsole: "Copilot Studio and the Power Platform admin center",
    adminSteps: [],
    memberSteps: [
      "Open the agent in Microsoft 365 Copilot or Teams.",
      "The first time it uses Web Agent, sign in from the card it shows, with their work email through {idp}. The token is theirs alone.",
    ],
    methods: [
      {
        id: "m365-studio",
        picks: [
          { field: "Power Platform: Control maker credential options", value: "End-user credentials only" },
          { field: "Tool: Authentication", value: "OAuth 2.0", not: "None or API key" },
          { field: "Tool: OAuth type", value: "Manual", not: "Dynamic discovery or Dynamic" },
          { field: "Tool details: Authentication", value: "End user", not: "Maker-provided" },
        ],
        kind: "org-client",
        label: "Copilot Studio agent",
        summary:
          "Copilot Studio can't use client ID documents, and its automatic options register a new client each time, so we issue a client ID and secret for {org} and register the redirect URL it gives you.",
        identity: "person",
        recommended: true,
        // VERIFY: PKCE. Only one vendor's docs (Collibra) say Copilot Studio doesn't send it.
        caveat:
          "One vendor reports that Copilot Studio doesn't send PKCE, which our authorization server requires. Confirm before this ships.",
        check: "Your client ID and Copilot Studio's redirect URL are registered",
        issuesCredential: {
          kind: "client",
          action: "Issue a client ID for Copilot Studio",
          note: "Issue a client ID and secret, then paste them into the tool's OAuth 2.0 settings.",
          missing: "Issue a client ID in step 2.",
        },
        redirectFromClient: {
          label: "Redirect URL from Copilot Studio",
          hint: "Copilot Studio shows it after you create the tool. We only accept sign-ins that return here.",
          // VERIFY: this host comes from third-party docs. The real value comes
          // from the tool after Create, which is why the admin pastes it.
          placeholder: "https://global.consent.azure-apim.net/redirect/…",
        },
        values: AUTH_URLS,
        adminSteps: [
          "In the Power Platform admin center, open Manage → Environments → your environment → Settings → Product → Features, and set Control maker credential options as in the table below.",
          "In Copilot Studio, open your agent → Tools → Add a tool → New tool → Model Context Protocol.",
          "Name it Web Agent, paste {url}, set the tool's fields as in the table below, and paste the values under it.",
          "Click Create, then copy the redirect URL Copilot Studio shows and paste it below.",
          "In the tool's Details → Additional details, set Authentication as in the table below.",
          "Open Channels → Microsoft 365 and Microsoft Teams → Add channel. Under Availability options pick Show to everyone in my org and Submit to org catalog.",
          "A Teams admin approves the agent in the Teams admin center → Manage apps.",
        ],
      },
      {
        id: "m365-declarative",
        picks: [
          // VERIFY: these field labels are ours. The docs say PKCE is on by
          // default and a public client (no secret) is allowed.
          { field: "OAuth client", value: "The client ID above, with no secret" },
          { field: "PKCE", value: "On" },
        ],
        kind: "org-client",
        label: "Declarative agent",
        summary:
          "A developer builds a Microsoft 365 Copilot agent with Web Agent as an MCP plugin. It signs in with PKCE, so we issue a client ID without a secret.",
        identity: "person",
        needs: "A developer to build and deploy the agent",
        check: "Your client ID is registered for Microsoft 365 Copilot",
        issuesCredential: {
          kind: "public-client",
          action: "Issue a client ID for Microsoft 365 Copilot",
          note: "Issue a client ID and give it to the developer building the agent, with the values below.",
          missing: "Issue a client ID in step 2.",
        },
        values: [
          { label: "Redirect URI (we register it)", value: "https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect" },
          ...AUTH_URLS.filter((v) => v.label !== "Refresh URL"),
        ],
        adminSteps: [
          "Have a developer add Web Agent to a declarative agent as an MCP plugin, with OAuth set to the client ID and values below.",
          "Deploy the agent to your tenant.",
          // VERIFY: the approval path for a declarative agent's MCP plugin. The docs
          // mention the admin center's Agents → Tools → Registry and Requests pages.
          "In the Microsoft 365 admin center → Agents, approve the agent and its Web Agent tool.",
        ],
        memberSteps: [
          "Open the agent in Microsoft 365 Copilot.",
          "The first time it uses Web Agent, sign in from the card it shows. They can sign out later in Chat settings → Agents.",
        ],
      },
    ],
  },
  {
    // Sources, checked 2026-11-14 (docs.github.com unless noted):
    //   en/copilot/how-tos/use-copilot-agents/coding-agent/extend-coding-agent-with-mcp (no OAuth)
    //   en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/configure-secrets-and-variables
    //   en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers (CLI config)
    //   en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings
    //   github.com/github/copilot-cli changelog (CIMD in 1.0.83, keychain storage)
    // allowedMcpServers is enterprise-level only. The MCP registry policy is a
    // preview, matches by name and isn't enforced in the cloud agent, so we don't use it.
    id: "github-copilot",
    name: "GitHub Copilot",
    surfaces: "Copilot CLI, and the Copilot coding agent on github.com",
    plans: "Copilot Business or Enterprise",
    adminConsole: "GitHub, as an organization owner",
    prerequisites: [GITHUB_MCP_POLICY],
    adminSteps: [
      "Share the config below, or have people run /mcp add in Copilot CLI with {url}.",
      "If your enterprise limits MCP servers, add {url}/* to allowedMcpServers in its managed settings.",
    ],
    memberSteps: [
      "Update Copilot CLI to 1.0.83 or later.",
      "Run /mcp add with {url}, or save the config above as ~/.copilot/mcp-config.json.",
      "Sign in with their work email through {idp} when the browser opens. The token stays in their OS keychain.",
    ],
    methods: [
      {
        id: "github-cli-cimd",
        picks: [
          { field: "~/.copilot/mcp-config.json", value: "The file below, as it is", not: "Adding an Authorization header" },
        ],
        kind: "client-metadata",
        label: "Copilot CLI's client ID",
        summary:
          "Copilot CLI identifies itself with a public client ID document, so there's nothing to register. Each person signs in from their browser the first time they connect.",
        identity: "person",
        recommended: true,
        needs: "Copilot CLI 1.0.83 or later",
        // VERIFY: the URL of Copilot CLI's client ID document, for our CIMD allowlist.
        check: "Copilot CLI's client ID is on your allowlist",
        config: {
          filename: "~/.copilot/mcp-config.json",
          code: json({ mcpServers: { [SERVER_NAME]: { type: "http", url: "{url}" } } }),
        },
      },
      {
        id: "github-coding-agent",
        picks: [],
        kind: "agent-token",
        label: "Coding agent",
        summary:
          "The coding agent works on its own, without a person signed in, so it could only use a static token kept as a repository secret.",
        identity: "shared",
        // DECIDE: revisit if GitHub adds OAuth for the coding agent's MCP servers.
        unavailable:
          "GitHub doesn't support OAuth for the coding agent's remote MCP servers, and its secrets are set by repository admins and shared by every task in the repository.",
        check: "The repository token is registered",
      },
    ],
  },
  {
    // Sources, checked 2026-11-14:
    //   code.visualstudio.com/docs/agents/reference/mcp-configuration (auth, config formats)
    //   code.visualstudio.com/api/extension-guides/ai/mcp (install links)
    //   code.visualstudio.com/docs/enterprise/policies (device policies)
    // VS Code's CIMD client ID is https://vscode.dev/oauth/client-metadata.json,
    // with redirects http://127.0.0.1:33418 and https://vscode.dev/redirect. New
    // Copilot configs go in .mcp.json; .vscode/mcp.json is the deprecated format.
    id: "vscode",
    name: "VS Code + GitHub Copilot",
    surfaces: "Copilot Chat in agent mode, in VS Code",
    plans: "Copilot Business or Enterprise",
    adminConsole: "GitHub and your repositories",
    prerequisites: [GITHUB_MCP_POLICY],
    adminSteps: [
      "Commit the file below to the root of the repositories your people work in, or share the install link.",
      // VERIFY: the ChatAllowedMcpServers policy's value format.
      "To allow only approved servers, add {url} to the ChatAllowedMcpServers device policy, or to allowedMcpServers in GitHub's enterprise managed settings.",
    ],
    memberSteps: [
      "Open the install link, or a repository with the file, and start the Web Agent server.",
      "Click Authenticate when VS Code asks, and sign in with their work email through {idp}. VS Code keeps the token for them alone.",
      // VERIFY: the Copilot Chat step wasn't in the docs we read.
      "In Copilot Chat, switch to Agent and turn on the Web Agent tools.",
    ],
    methods: [
      {
        id: "vscode-cimd",
        picks: [
          { field: ".mcp.json", value: "The file below, as it is", not: "Adding an Authorization header" },
        ],
        kind: "client-metadata",
        label: "VS Code's client ID",
        summary:
          "VS Code identifies itself with its public client ID document on vscode.dev, so there's nothing to register. Each person signs in from VS Code the first time.",
        identity: "person",
        recommended: true,
        check: "VS Code's client ID (vscode.dev) is on your allowlist",
        // VERIFY: that the Copilot-format .mcp.json takes "type": "http", as the
        // deprecated .vscode/mcp.json did.
        config: {
          filename: ".mcp.json",
          code: json({ mcpServers: { [SERVER_NAME]: { type: "http", url: "{url}" } } }),
        },
        installLink: "vscode",
      },
      {
        id: "vscode-ema",
        picks: [
          { field: "McpEnterpriseManagedAuthIdp device policy", value: "{issuer}" },
          { field: ".mcp.json", value: "The file below, as it is", not: "Adding an Authorization header" },
        ],
        kind: "enterprise-managed",
        label: "Enterprise-managed (Okta)",
        summary:
          "People already signed in to {idp} get their own Web Agent token without a sign-in screen. This is a preview in VS Code.",
        identity: "person",
        // VERIFY: where "enterpriseManaged": true goes in the Copilot format (the
        // docs show it in the editor format's oauth block), and the value format of
        // the McpEnterpriseManagedAuthIdp policy. It's a preview in VS Code.
        needs: "VS Code 1.123 or later, and Okta",
        check: "{idp} ({tenant}) is a trusted issuer for your organization",
        adminSteps: [
          "Point the McpEnterpriseManagedAuthIdp device policy at {issuer} (Intune, a macOS profile, or /etc/vscode/policy.json).",
          "Commit the file below to the root of your repositories, or share the install link.",
        ],
        memberSteps: [
          "Open the install link, or a repository with the file, and start the Web Agent server. There's no sign-in screen.",
          "In Copilot Chat, switch to Agent and turn on the Web Agent tools.",
        ],
        config: {
          filename: ".mcp.json",
          code: json({
            mcpServers: { [SERVER_NAME]: { type: "http", url: "{url}", oauth: { enterpriseManaged: true } } },
          }),
        },
        installLink: "vscode",
      },
    ],
  },
  {
    // Sources, checked 2026-11-14:
    //   cursor.com/docs/context/mcp (OAuth, the auth block, redirects, team servers, allowlist)
    //   cursor.com/docs/context/mcp/install-links (deeplink format)
    //   Cursor forum, 2026-05-13: staff gave "no timeline" for CIMD
    // Cursor doesn't document where it stores tokens, and has no enterprise-managed sign-in.
    id: "cursor",
    name: "Cursor",
    surfaces: "Cursor's agent, in the editor",
    plans: "Cursor Teams or Enterprise",
    adminConsole: "your repositories, or Cursor's team dashboard",
    adminSteps: [
      "Commit the file below to the repositories your people work in, or share the install link.",
      // VERIFY: the allowlist's URL pattern syntax.
      "If you use the Enterprise MCP allowlist, allow {url}/* in Team Settings → MCP Configuration.",
    ],
    memberSteps: [
      "Open the install link, or a repository with the file.",
      // VERIFY: the settings path and button label.
      "Click Connect next to Web Agent in Cursor Settings → MCP, and sign in with their work email through {idp}. The token is theirs alone.",
    ],
    methods: [
      {
        id: "cursor-org-client",
        picks: [
          { field: ".cursor/mcp.json", value: "The file below, as it is", not: "Adding a token or headers" },
          { field: "Team server in Dashboard → Plugins & MCPs, if you use one", value: "No headers" },
        ],
        kind: "org-client",
        label: "Your own client ID",
        summary:
          "Cursor doesn't support client ID documents yet, so we issue a client ID for {org} and it goes in the config. It isn't secret: each person still signs in as themselves.",
        identity: "person",
        recommended: true,
        check: "Your client ID is registered",
        issuesCredential: {
          kind: "public-client",
          action: "Issue a client ID for Cursor",
          note: "Issue a client ID. It goes in the config and the install link below.",
          missing: "Issue a client ID in step 2.",
        },
        values: [
          { label: "Redirect URI, desktop (we register it)", value: "http://localhost:8787/callback" },
          { label: "Redirect URI, web (we register it)", value: "https://www.cursor.com/agents/mcp/oauth/callback" },
        ],
        config: {
          filename: ".cursor/mcp.json",
          code: json({ mcpServers: { [SERVER_NAME]: { url: "{url}", auth: { CLIENT_ID: "{clientId}" } } } }),
        },
        installLink: "cursor",
      },
    ],
  },
];

// MOCK: a demo organization partway through moving off shared credentials.
export const INITIAL_HARNESS_SETTINGS: Record<HarnessId, HarnessSetting> = {
  claude: {
    enabled: true,
    methodId: "claude-cimd",
    access: "everyone",
    groups: [],
    credentialIssued: false,
    redirectUrl: "",
    sharedRevoked: false,
  },
  chatgpt: {
    enabled: true,
    methodId: "chatgpt-cimd",
    access: "groups",
    groups: ["Support", "Customer Success"],
    credentialIssued: false,
    redirectUrl: "",
    sharedRevoked: false,
  },
  "m365-copilot": {
    enabled: true,
    methodId: "m365-studio",
    access: "everyone",
    groups: [],
    credentialIssued: true,
    redirectUrl: "",
    sharedRevoked: false,
  },
  "github-copilot": {
    enabled: false,
    methodId: "github-cli-cimd",
    access: "groups",
    groups: ["Engineering"],
    credentialIssued: false,
    redirectUrl: "",
    sharedRevoked: false,
  },
  vscode: {
    enabled: true,
    methodId: "vscode-cimd",
    access: "groups",
    groups: ["Engineering"],
    credentialIssued: false,
    redirectUrl: "",
    sharedRevoked: false,
  },
  cursor: {
    enabled: false,
    methodId: "cursor-org-client",
    access: "groups",
    groups: ["Engineering"],
    credentialIssued: false,
    redirectUrl: "",
    sharedRevoked: false,
  },
};

// MOCK: invented counts.
export const HARNESS_ACTIVITY: Partial<Record<HarnessId, HarnessActivity>> = {
  claude: { people: 31, lastCall: "4 minutes ago" },
  chatgpt: { people: 9, lastCall: "an hour ago" },
  vscode: { people: 5, lastCall: "yesterday" },
};

// DECIDE: replace with how each organization's shared credential is really set
// up today, and the real counts. Each entry is a guess based on that client's
// own shared mode. Also decide how revoking works: the server tells
// shared-credential calls from per-person tokens, keeps both working until the
// organization revokes, then answers 401 with resource_metadata so clients
// ask each person to sign in.
export const SHARED_CREDENTIALS: Partial<Record<HarnessId, SharedCredential>> = {
  claude: {
    how: "a Request header on the connector, carrying one key for all of {org}",
    since: "March 2026",
    people: 52,
    cleanup: "Then remove the Request header from the connector in Organization settings → Connectors.",
  },
  chatgpt: {
    how: "one {org} account that everyone connects the plugin with",
    since: "May 2026",
    people: 24,
    cleanup: "People still on the shared account are asked to connect with their own on their next use.",
  },
  "m365-copilot": {
    how: "the agent's maker-provided connection, so everyone uses the maker's sign-in",
    since: "June 2026",
    people: 37,
    cleanup: "Then set the tool's Authentication to End user in Copilot Studio and publish the agent again.",
  },
  vscode: {
    how: "one key for all of {org} in the Authorization header of .vscode/mcp.json, committed to your repositories",
    since: "April 2026",
    people: 12,
    cleanup: "Then delete .vscode/mcp.json from your repositories in favour of .mcp.json.",
  },
};
