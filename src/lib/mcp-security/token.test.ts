import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BASE, ISSUER, KID, NOW, RESOURCE, claims, makeKeys, signToken } from "./test-helpers";
import { bearerToken, jwksResolver, resourceForSlug, verifyAccessToken } from "./token";

const { publicKey, privateKey } = makeKeys();
const options = { issuer: ISSUER, audience: RESOURCE, keys: (kid: string) => (kid === KID ? publicKey : undefined), now: () => NOW };

describe("verifyAccessToken", () => {
  it("accepts a valid token for this server", async () => {
    const result = await verifyAccessToken(signToken(privateKey, claims()), options);
    assert.ok(result.ok);
    assert.deepEqual(result.token.subject, { iss: ISSUER, sub: "user-123" });
    assert.equal(result.token.clientId, "claude");
    assert.deepEqual(result.token.scopes, ["mcp:read", "mcp:write"]);
  });

  it("rejects a properly signed token for another slug", async () => {
    const result = await verifyAccessToken(signToken(privateKey, claims({ aud: resourceForSlug(BASE, "billing") })), options);
    assert.deepEqual(result.ok ? null : result.reason, "wrong_audience");
  });

  it("rejects a near-miss audience (prefix, trailing slash, case)", async () => {
    for (const aud of [`${RESOURCE}/`, `${RESOURCE}-admin`, RESOURCE.toUpperCase(), BASE]) {
      const result = await verifyAccessToken(signToken(privateKey, claims({ aud })), options);
      assert.equal(result.ok ? aud : result.reason, "wrong_audience");
    }
  });

  it("accepts an audience array that names this server exactly", async () => {
    const result = await verifyAccessToken(signToken(privateKey, claims({ aud: ["https://other.test", RESOURCE] })), options);
    assert.ok(result.ok);
  });

  it("rejects expired and not-yet-valid tokens", async () => {
    const now = Math.floor(NOW / 1000);
    const expired = await verifyAccessToken(signToken(privateKey, claims({ exp: now - 60 })), options);
    assert.equal(expired.ok ? null : expired.reason, "expired");
    const early = await verifyAccessToken(signToken(privateKey, claims({ nbf: now + 600 })), options);
    assert.equal(early.ok ? null : early.reason, "not_yet_valid");
  });

  it("rejects alg none and symmetric algorithms", async () => {
    const [, body] = signToken(privateKey, claims()).split(".");
    for (const alg of ["none", "HS256"]) {
      const head = Buffer.from(JSON.stringify({ alg, typ: "at+jwt", kid: KID })).toString("base64url");
      const result = await verifyAccessToken(`${head}.${body}.AAAA`, options);
      assert.equal(result.ok ? alg : result.reason, "unsupported_algorithm");
    }
  });

  it("rejects an ID token used as an access token", async () => {
    const result = await verifyAccessToken(signToken(privateKey, claims(), { typ: "JWT" }), options);
    assert.equal(result.ok ? null : result.reason, "wrong_type");
  });

  it("rejects a tampered payload", async () => {
    const [head, , sig] = signToken(privateKey, claims()).split(".");
    const forged = Buffer.from(JSON.stringify(claims({ scope: "mcp:manage" }))).toString("base64url");
    const result = await verifyAccessToken(`${head}.${forged}.${sig}`, options);
    assert.equal(result.ok ? null : result.reason, "bad_signature");
  });

  it("rejects a token signed by another key", async () => {
    const other = makeKeys();
    const result = await verifyAccessToken(signToken(other.privateKey, claims()), options);
    assert.equal(result.ok ? null : result.reason, "bad_signature");
  });

  it("rejects unknown keys, other issuers and missing client_id", async () => {
    const unknown = await verifyAccessToken(signToken(privateKey, claims(), { kid: "nope" }), options);
    assert.equal(unknown.ok ? null : unknown.reason, "unknown_key");
    const issuer = await verifyAccessToken(signToken(privateKey, claims({ iss: "https://evil.test" })), options);
    assert.equal(issuer.ok ? null : issuer.reason, "wrong_issuer");
    const noClient = await verifyAccessToken(signToken(privateKey, claims({ client_id: undefined })), options);
    assert.equal(noClient.ok ? null : noClient.reason, "missing_claim");
  });

  it("never throws on garbage", async () => {
    for (const token of ["", "a.b", "a.b.c.d", "!!.!!.!!", "e30.e30.e30"]) {
      const result = await verifyAccessToken(token, options);
      assert.equal(result.ok, false);
    }
  });
});

describe("bearerToken", () => {
  it("reads only a well-formed Bearer header", () => {
    assert.equal(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
    assert.equal(bearerToken("bearer abc"), null);
    assert.equal(bearerToken("Basic abc"), null);
    assert.equal(bearerToken("Bearer a b"), null);
    assert.equal(bearerToken(undefined), null);
  });
});

describe("jwksResolver", () => {
  it("loads public signing keys and skips private ones", () => {
    const jwk = publicKey.export({ format: "jwk" });
    const priv = privateKey.export({ format: "jwk" });
    const resolve = jwksResolver({ keys: [{ ...jwk, kid: "pub", use: "sig" }, { ...priv, kid: "priv" }, { ...jwk, kid: "enc", use: "enc" }] });
    assert.ok(resolve("pub", "ES256"));
    assert.equal(resolve("priv", "ES256"), undefined);
    assert.equal(resolve("enc", "ES256"), undefined);
  });
});
