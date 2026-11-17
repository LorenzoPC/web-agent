/**
 * Rejection of token passthrough, an MCP mandatory pattern.
 *
 * An MCP server never forwards the token it received. When a tool needs a
 * downstream service on the person's behalf, the server gets a token of its
 * own for that service, through OAuth 2.0 Token Exchange (RFC 8693), scoped to
 * that one audience. The person's original token stays at our edge, so a
 * compromised proxy, log or downstream API can't replay it against us.
 */

export interface DownstreamToken {
  accessToken: string;
  audience: string;
  scopes: string[];
  expiresAt: number;
}

export interface TokenExchanger {
  exchange(request: { subjectToken: string; audience: string; scopes: string[] }): Promise<DownstreamToken>;
}

/** The RFC 8693 form body for exchanging the person's token for one aimed at `audience`. */
export function tokenExchangeBody(request: {
  subjectToken: string;
  audience: string;
  scopes: string[];
  resource?: string;
}): URLSearchParams {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: request.subjectToken,
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    audience: request.audience,
  });
  if (request.scopes.length) body.set("scope", request.scopes.join(" "));
  if (request.resource) body.set("resource", request.resource);
  return body;
}

/**
 * A token exchanger that calls the authorization server's token endpoint.
 * The MCP server authenticates as itself (its own client credentials), so the
 * authorization server knows which service is asking and can apply its own
 * policy to the exchange.
 */
export function httpTokenExchanger(config: {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  now?: () => number;
}): TokenExchanger {
  const doFetch = config.fetch ?? fetch;
  return {
    async exchange(request) {
      const response = await doFetch(config.tokenEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(
            `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`,
          ).toString("base64")}`,
        },
        body: tokenExchangeBody(request),
      });
      if (!response.ok) throw new Error(`Token exchange failed with ${response.status}`);
      const json = (await response.json()) as { access_token?: unknown; expires_in?: unknown; scope?: unknown };
      if (typeof json.access_token !== "string") throw new Error("Token exchange returned no access_token");
      if (json.access_token === request.subjectToken) throw new Error("Token exchange returned the subject token");
      const now = config.now?.() ?? Date.now();
      return {
        accessToken: json.access_token,
        audience: request.audience,
        scopes: typeof json.scope === "string" ? json.scope.split(" ").filter(Boolean) : request.scopes,
        expiresAt: now + (typeof json.expires_in === "number" ? json.expires_in : 300) * 1000,
      };
    },
  };
}

export class TokenPassthroughError extends Error {
  constructor() {
    super("Refusing to forward the caller's own token downstream");
    this.name = "TokenPassthroughError";
  }
}

/**
 * Last line of defense for outbound calls: throws if any header carries the
 * token the caller sent us. Wrap every downstream fetch a tool makes with it.
 */
export function assertNoPassthrough(inboundToken: string, outboundHeaders: HeadersInit | undefined): void {
  if (!inboundToken || !outboundHeaders) return;
  const headers = new Headers(outboundHeaders);
  for (const [, value] of headers) {
    if (value.includes(inboundToken)) throw new TokenPassthroughError();
  }
}

/** A fetch for tools that refuses to send the inbound token anywhere. */
export function guardedFetch(inboundToken: string, doFetch: typeof fetch = fetch): typeof fetch {
  // async, so a refusal arrives as a rejected promise, the way fetch reports errors.
  return async (input, init) => {
    assertNoPassthrough(inboundToken, init?.headers);
    if (input instanceof Request) assertNoPassthrough(inboundToken, input.headers);
    return doFetch(input, init);
  };
}
