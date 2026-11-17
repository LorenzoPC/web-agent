import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";

/** Test-only signing helpers. Real tokens come from the authorization server. */

export const ISSUER = "https://auth.webagent.test";
export const BASE = "https://webagent.test/mcp";
export const SLUG = "support-kb";
export const RESOURCE = `${BASE}/${SLUG}`;
export const KID = "test-key-1";

export function makeKeys() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  return { publicKey, privateKey };
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

export function signToken(
  privateKey: KeyObject,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = {},
): string {
  const head = encode({ alg: "ES256", typ: "at+jwt", kid: KID, ...header });
  const body = encode(claims);
  const signature = sign("sha256", Buffer.from(`${head}.${body}`), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${head}.${body}.${signature.toString("base64url")}`;
}

export const NOW = Date.UTC(2026, 10, 17, 15, 0, 0); // Tue 17 Nov 2026, 10:00 in Montréal

export function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Math.floor(NOW / 1000);
  return {
    iss: ISSUER,
    sub: "user-123",
    aud: RESOURCE,
    client_id: "claude",
    scope: "mcp:read mcp:write",
    iat: now - 10,
    exp: now + 300,
    ...overrides,
  };
}
