/**
 * Per-client consent: the MCP mandatory pattern against confused deputies.
 *
 * Signing in proves who a person is. It doesn't say which AI clients may act
 * for them. A person who connected Claude to a server hasn't thereby let any
 * other client in, even one that can get a token for them. So the server
 * keeps its own registry, keyed by person, client and server, and checks it on
 * every call. The client's own word is never enough.
 */

export interface ConsentGrant {
  /** The person, as the identity provider's (iss, sub). */
  subject: { iss: string; sub: string };
  clientId: string;
  /** The MCP server's resource identifier. */
  resource: string;
  scopes: string[];
  grantedAt: number;
  /** Optional end date, in ms. */
  expiresAt?: number;
}

export type ConsentResult =
  | { ok: true; grant: ConsentGrant; scopes: string[] }
  | { ok: false; reason: "no_consent" | "consent_expired" | "scope_not_consented"; missing?: string[] };

export interface ConsentStore {
  get(subject: ConsentGrant["subject"], clientId: string, resource: string): Promise<ConsentGrant | undefined>;
  put(grant: ConsentGrant): Promise<void>;
  revoke(subject: ConsentGrant["subject"], clientId: string, resource: string): Promise<boolean>;
  /** Everything one person has granted. For their "connected apps" page. */
  listForSubject(subject: ConsentGrant["subject"]): Promise<ConsentGrant[]>;
}

function key(subject: ConsentGrant["subject"], clientId: string, resource: string): string {
  // JSON keeps the parts apart even when one of them contains a separator.
  return JSON.stringify([subject.iss, subject.sub, clientId, resource]);
}

/**
 * In-memory store, for tests and the mockup. The real one is a Postgres table
 * with a unique key on (iss, sub, client_id, resource), never a module-level
 * cache shared across tenants.
 */
export class MemoryConsentStore implements ConsentStore {
  private grants = new Map<string, ConsentGrant>();

  async get(subject: ConsentGrant["subject"], clientId: string, resource: string) {
    return this.grants.get(key(subject, clientId, resource));
  }

  async put(grant: ConsentGrant) {
    this.grants.set(key(grant.subject, grant.clientId, grant.resource), { ...grant, scopes: [...new Set(grant.scopes)] });
  }

  async revoke(subject: ConsentGrant["subject"], clientId: string, resource: string) {
    return this.grants.delete(key(subject, clientId, resource));
  }

  async listForSubject(subject: ConsentGrant["subject"]) {
    return [...this.grants.values()].filter((g) => g.subject.iss === subject.iss && g.subject.sub === subject.sub);
  }
}

/**
 * Checks that this person consented to this client on this server, for every
 * scope the token carries. A token with a scope the person never approved for
 * this client is refused outright rather than quietly narrowed: it means the
 * authorization server and our registry disagree, and that's worth a 403.
 */
export async function checkConsent(
  store: ConsentStore,
  request: { subject: ConsentGrant["subject"]; clientId: string; resource: string; scopes: string[] },
  now: number = Date.now(),
): Promise<ConsentResult> {
  const grant = await store.get(request.subject, request.clientId, request.resource);
  if (!grant) return { ok: false, reason: "no_consent" };
  if (grant.expiresAt !== undefined && now >= grant.expiresAt) return { ok: false, reason: "consent_expired" };

  const missing = request.scopes.filter((scope) => !grant.scopes.includes(scope));
  if (missing.length) return { ok: false, reason: "scope_not_consented", missing };

  return { ok: true, grant, scopes: request.scopes };
}
