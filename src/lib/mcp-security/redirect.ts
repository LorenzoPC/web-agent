/**
 * Exact redirect URI matching, an MCP mandatory pattern.
 *
 * Each registered client has a list of exact redirect URIs. An authorization
 * request's `redirect_uri` must equal one of them, character for character:
 * no extra query parameters or path segments, no trailing-slash leniency, no
 * case folding, no wildcards.
 */

export interface RegisteredClient {
  clientId: string;
  name: string;
  redirectUris: string[];
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);

/**
 * Why a URI can't be registered, or null when it can. Run when an admin adds a
 * client, so the registry never holds something exact matching can't protect.
 */
export function redirectUriProblem(uri: string): string | null {
  if (uri.includes("*")) return "Wildcards aren't allowed.";
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return "Not an absolute URL.";
  }
  if (url.hash || uri.includes("#")) return "Fragments aren't allowed.";
  if (url.username || url.password) return "Credentials in the URL aren't allowed.";
  if (url.protocol === "javascript:" || url.protocol === "data:" || url.protocol === "file:") return "That scheme isn't allowed.";
  if (url.protocol === "http:" && !LOOPBACK_HOSTS.has(url.hostname)) return "Use https, except for loopback addresses.";
  if (url.protocol !== "https:" && url.protocol !== "http:" && !/^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/.test(url.protocol)) {
    // Native apps may use a private-use scheme, which must be reverse-DNS (RFC 8252 section 7.1).
    return "Custom schemes must be reverse-DNS, like com.example.app:";
  }
  return null;
}

/** True only when `uri` is one of the client's registered URIs, compared as plain strings. */
export function isRegisteredRedirectUri(client: RegisteredClient, uri: string | null | undefined): boolean {
  if (typeof uri !== "string" || uri.length === 0) return false;
  return client.redirectUris.some((registered) => registered === uri);
}

export interface ClientRegistry {
  get(clientId: string): RegisteredClient | undefined | Promise<RegisteredClient | undefined>;
}

export type RedirectCheck =
  | { ok: true; client: RegisteredClient; redirectUri: string }
  | { ok: false; reason: "unknown_client" | "redirect_uri_mismatch" };

/**
 * Checks a client and redirect URI before anything else in the authorization
 * request is looked at. On failure the caller must show an error page and must
 * not redirect, since the URI can't be trusted to receive anything.
 */
export async function checkRedirect(registry: ClientRegistry, clientId: string, redirectUri: string): Promise<RedirectCheck> {
  const client = await registry.get(clientId);
  if (!client) return { ok: false, reason: "unknown_client" };
  if (!isRegisteredRedirectUri(client, redirectUri)) return { ok: false, reason: "redirect_uri_mismatch" };
  return { ok: true, client, redirectUri };
}
