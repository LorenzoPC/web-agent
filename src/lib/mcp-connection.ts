import type { AuthMethod, Harness, HarnessSetting, Organization, TestPerson } from "./mock-mcp-connection-data";
import { SHARED_CREDENTIALS } from "./mock-mcp-connection-data";

export type ConnectionStatus = "on" | "off" | "needs-setup";

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  on: "On",
  off: "Off",
  "needs-setup": "Needs setup",
};

export const STATUS_CLASS: Record<ConnectionStatus, string> = {
  on: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  off: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  "needs-setup": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function currentMethod(harness: Harness, setting: HarnessSetting): AuthMethod {
  return harness.methods.find((m) => m.id === setting.methodId) ?? harness.methods[0];
}

/** What's still missing before people can sign in with this method, or null when nothing is. */
export function missingStep(method: AuthMethod, setting: HarnessSetting): string | null {
  if (method.issuesCredential && !setting.credentialIssued) return method.issuesCredential.missing;
  if (method.redirectFromClient && !setting.redirectUrl.trim()) return `Paste the ${method.redirectFromClient.label} in step 2.`;
  if (setting.access === "groups" && setting.groups.length === 0) return "Pick at least one group in step 3.";
  return null;
}

export function connectionStatus(harness: Harness, setting: HarnessSetting): ConnectionStatus {
  if (!setting.enabled) return "off";
  return missingStep(currentMethod(harness, setting), setting) ? "needs-setup" : "on";
}

/** Whether the client still has its shared organization credential switched on. */
export function sharedCredentialActive(harness: Harness, setting: HarnessSetting): boolean {
  return Boolean(SHARED_CREDENTIALS[harness.id]) && !setting.sharedRevoked;
}

/** Replaces {name} placeholders with values, leaving unknown ones as they are. */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/**
 * The client ID (and secret) we'd issue for an organization and one AI client.
 * MOCK: derived from the IDs so the values stay put between renders. The real
 * one is registered with our authorization server along with the client's
 * redirect URIs, shows its secret once, and can be rotated and revoked.
 */
export function issuedCredential(org: Organization, harnessId: string): { id: string; secret: string } {
  const tag = [...`${org.slug}:${harnessId}`].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 1_000_000, 7);
  const suffix = tag.toString(36).padStart(4, "0");
  return { id: `wa_${org.slug}_${harnessId.replace(/-/g, "_")}_${suffix}`, secret: `was_${suffix}k9QmT2vX8pLr` };
}

export interface CheckStep {
  label: string;
  ok: boolean;
  /** Shown when the step fails: what to do about it. */
  fix?: string;
  /** Shown under the step when it passes. */
  note?: string;
}

/**
 * The scripted connection check, signed in as one test person.
 * MOCK: nothing is called. Each step passes or fails from the page's own
 * settings, in the order a real sign-in would hit them. The real check probes
 * the server, our authorization server's client registration and the
 * identity provider, then asks the rule resolver what the person would see.
 */
export function checkSteps(
  harness: Harness,
  setting: HarnessSetting,
  org: Organization,
  mcpUrl: string,
  person: TestPerson,
  orgWideTools: number,
): CheckStep[] {
  const method = currentMethod(harness, setting);
  const host = new URL(mcpUrl).host;
  const credentialOk = !method.issuesCredential || setting.credentialIssued;
  const redirectOk = !method.redirectFromClient || setting.redirectUrl.trim() !== "";
  const idp = org.identityProvider.name;
  const first = person.name.split(" ")[0];

  return [
    { label: `${harness.name} is allowed for ${org.name}`, ok: setting.enabled, fix: `Turn ${harness.name} on at the top.` },
    { label: `The server answers at ${host}`, ok: true },
    {
      label: fill(method.check, { idp, tenant: org.identityProvider.tenant }),
      ok: credentialOk && redirectOk,
      fix: missingStep(method, setting) ?? undefined,
    },
    {
      label:
        method.kind === "enterprise-managed"
          ? `${person.name} gets their own token from ${idp}, without a sign-in screen`
          : `${person.name} signs in through ${idp} and gets their own token`,
      ok: true,
    },
    {
      label: `${person.group} is allowed to connect from ${harness.name}`,
      ok: setting.access === "everyone" || setting.groups.includes(person.group),
      fix: `${first} is in ${person.group}, which can't connect. Add it in step 3, or test someone else.`,
    },
    {
      label: `${first} sees ${person.tools} tools, from their own permissions`,
      ok: true,
      note: sharedCredentialActive(harness, setting)
        ? `Through the shared credential, everyone sees all ${orgWideTools}.`
        : undefined,
    },
  ];
}

/**
 * A one-click install link built from a filled config file, or null when the
 * config doesn't hold the server. VS Code takes URL-encoded JSON with the name
 * inside; Cursor takes the server object in base64, with the name beside it.
 * VERIFY: both formats come from the vendors' docs; open a generated link in
 * each client before relying on it.
 */
export function installLink(kind: "vscode" | "cursor", configJson: string, name: string): string | null {
  let server: Record<string, unknown> | undefined;
  try {
    server = (JSON.parse(configJson) as { mcpServers?: Record<string, Record<string, unknown>> }).mcpServers?.[name];
  } catch {
    return null;
  }
  if (!server) return null;
  if (kind === "vscode") return `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name, ...server }))}`;
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${btoa(JSON.stringify(server))}`;
}
