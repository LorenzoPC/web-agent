import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * Access token validation for MCP servers, run on every request.
 *
 * Covers two of the MCP mandatory patterns:
 * - Token audience validation: `aud` must name this exact server. A token
 *   issued for another slug, or for any other service, is rejected even when
 *   it's properly signed and unexpired.
 * - Per-request validation: nothing here reads a session. Each request
 *   carries its own bearer token, and each token is checked in full.
 *
 * Tokens are JWT access tokens in the RFC 9068 profile, signed by our
 * authorization server with an asymmetric key. Symmetric algorithms and
 * `none` are never accepted.
 */

export type JwsAlgorithm = "RS256" | "PS256" | "ES256" | "EdDSA";

const ALGORITHMS: Record<JwsAlgorithm, { hash: string | null; options: object }> = {
  RS256: { hash: "sha256", options: {} },
  PS256: { hash: "sha256", options: { padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: 32 } },
  ES256: { hash: "sha256", options: { dsaEncoding: "ieee-p1363" } },
  EdDSA: { hash: null, options: {} },
};

/** Claims we rely on, from RFC 9068 and RFC 7519. */
export interface AccessTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat?: number;
  nbf?: number;
  jti?: string;
  /** The OAuth client the token was issued to (RFC 9068 section 2.2). */
  client_id: string;
  /** Space-separated scopes. */
  scope?: string;
  [claim: string]: unknown;
}

/** Who the token says is calling, after every check has passed. */
export interface VerifiedToken {
  claims: AccessTokenClaims;
  /** The identity provider's stable pair. People are keyed on this, never on email. */
  subject: { iss: string; sub: string };
  clientId: string;
  scopes: string[];
}

export type TokenFailure =
  | "malformed"
  | "unsupported_algorithm"
  | "wrong_type"
  | "unknown_key"
  | "bad_signature"
  | "wrong_issuer"
  | "wrong_audience"
  | "expired"
  | "not_yet_valid"
  | "missing_claim";

export type TokenResult = { ok: true; token: VerifiedToken } | { ok: false; reason: TokenFailure; detail: string };

/** Looks up a public key by `kid` from the issuer's JWKS. */
export type KeyResolver = (kid: string, alg: JwsAlgorithm) => KeyObject | undefined | Promise<KeyObject | undefined>;

export interface VerifyOptions {
  /** The one issuer we trust. Exact match. */
  issuer: string;
  /** This MCP server's resource identifier, e.g. https://webagent.dev/mcp/<slug>. Exact match. */
  audience: string;
  keys: KeyResolver;
  algorithms?: JwsAlgorithm[];
  /** Seconds of clock skew allowed on exp, nbf and iat. */
  clockToleranceSeconds?: number;
  /**
   * Require the RFC 9068 header `typ: at+jwt`. On by default: it stops an ID
   * token, which may carry the same issuer and subject, being used as an
   * access token.
   */
  requireAccessTokenType?: boolean;
  now?: () => number;
}

function fail(reason: TokenFailure, detail: string): TokenResult {
  return { ok: false, reason, detail };
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Validates a compact JWS access token for one MCP server. Never throws on bad input. */
export async function verifyAccessToken(token: string, options: VerifyOptions): Promise<TokenResult> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts.every((p) => BASE64URL.test(p))) return fail("malformed", "Not a compact JWS");

  let header: { alg?: unknown; kid?: unknown; typ?: unknown; crit?: unknown };
  let claims: Partial<AccessTokenClaims>;
  try {
    header = decodeSegment(parts[0]) as typeof header;
    claims = decodeSegment(parts[1]) as Partial<AccessTokenClaims>;
  } catch {
    return fail("malformed", "Header or payload isn't JSON");
  }
  if (!header || typeof header !== "object" || !claims || typeof claims !== "object") {
    return fail("malformed", "Header or payload isn't an object");
  }

  const allowed = options.algorithms ?? (Object.keys(ALGORITHMS) as JwsAlgorithm[]);
  const alg = header.alg as JwsAlgorithm;
  if (typeof header.alg !== "string" || !allowed.includes(alg) || !(alg in ALGORITHMS)) {
    return fail("unsupported_algorithm", `alg ${String(header.alg)} isn't accepted`);
  }
  if (header.crit !== undefined) return fail("malformed", "crit headers aren't supported");

  if (options.requireAccessTokenType !== false) {
    const typ = typeof header.typ === "string" ? header.typ.toLowerCase() : "";
    if (typ !== "at+jwt" && typ !== "application/at+jwt") return fail("wrong_type", "typ must be at+jwt");
  }

  if (typeof header.kid !== "string" || !header.kid) return fail("unknown_key", "No kid");
  const key = await options.keys(header.kid, alg);
  if (!key) return fail("unknown_key", `No key for kid ${header.kid}`);

  const { hash, options: verifyOptions } = ALGORITHMS[alg];
  let valid = false;
  try {
    valid = verify(hash, Buffer.from(`${parts[0]}.${parts[1]}`), { key, ...verifyOptions }, Buffer.from(parts[2], "base64url"));
  } catch {
    valid = false;
  }
  if (!valid) return fail("bad_signature", "Signature doesn't verify");

  // Claims are only trusted after the signature checks out.
  if (claims.iss !== options.issuer) return fail("wrong_issuer", `iss ${String(claims.iss)} isn't trusted`);

  const audiences = typeof claims.aud === "string" ? [claims.aud] : Array.isArray(claims.aud) ? claims.aud : [];
  if (!audiences.some((aud) => aud === options.audience)) {
    return fail("wrong_audience", `Token is for ${audiences.join(", ") || "no audience"}, not ${options.audience}`);
  }

  const now = Math.floor((options.now?.() ?? Date.now()) / 1000);
  const skew = options.clockToleranceSeconds ?? 30;
  if (typeof claims.exp !== "number") return fail("missing_claim", "No exp");
  if (now >= claims.exp + skew) return fail("expired", "Token expired");
  if (typeof claims.nbf === "number" && now + skew < claims.nbf) return fail("not_yet_valid", "Token not valid yet");
  if (typeof claims.iat === "number" && now + skew < claims.iat) return fail("not_yet_valid", "Token issued in the future");

  if (typeof claims.sub !== "string" || !claims.sub) return fail("missing_claim", "No sub");
  if (typeof claims.client_id !== "string" || !claims.client_id) return fail("missing_claim", "No client_id");

  const full = claims as AccessTokenClaims;
  return {
    ok: true,
    token: {
      claims: full,
      subject: { iss: full.iss, sub: full.sub },
      clientId: full.client_id,
      scopes: typeof full.scope === "string" ? full.scope.split(" ").filter(Boolean) : [],
    },
  };
}

/** Pulls the token out of an `Authorization: Bearer` header, or null. Tokens in query strings are never read. */
export function bearerToken(authorization: string | null | undefined): string | null {
  const match = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/.exec(authorization?.trim() ?? "");
  return match ? match[1] : null;
}

/** Builds a key resolver from a JWKS document. Keys without a kid, or private keys, are skipped. */
export function jwksResolver(jwks: { keys: Array<Record<string, unknown>> }): KeyResolver {
  const byKid = new Map<string, KeyObject>();
  for (const jwk of jwks.keys) {
    if (typeof jwk.kid !== "string" || "d" in jwk) continue;
    if (jwk.use !== undefined && jwk.use !== "sig") continue;
    try {
      byKid.set(jwk.kid, createPublicKey({ key: jwk as never, format: "jwk" }));
    } catch {
      // A key we can't parse is a key we don't trust.
    }
  }
  return (kid) => byKid.get(kid);
}

/** The resource identifier, and so the only accepted audience, for one MCP server. */
export function resourceForSlug(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${slug}`;
}
