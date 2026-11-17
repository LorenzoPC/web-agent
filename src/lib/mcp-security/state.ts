import { createHash, randomBytes } from "node:crypto";

/**
 * OAuth state parameter validation, an MCP mandatory pattern.
 *
 * Each authorization request gets a fresh random state with 256 bits of
 * entropy (the guidance is at least 128). It's stored before the redirect and
 * must come back unchanged on the callback, once, within its lifetime, for the
 * same client and redirect URI. A missing, unknown, reused or mismatched state
 * is treated as a CSRF attempt.
 *
 * Only a hash of the state is stored, so a leaked store can't be replayed.
 */

export const STATE_BYTES = 32;
export const STATE_TTL_MS = 10 * 60 * 1000;

export interface PendingAuthorization {
  clientId: string;
  redirectUri: string;
  resource: string;
  /** PKCE S256 challenge sent to the authorization server. */
  codeChallenge?: string;
  /** Ties the state to the browser that started the flow, e.g. a signed cookie value. */
  browserBinding?: string;
  createdAt: number;
}

export interface StateStore {
  put(stateHash: string, value: PendingAuthorization): Promise<void>;
  /** Returns and deletes in one step, so a state can't be used twice. */
  take(stateHash: string): Promise<PendingAuthorization | undefined>;
}

export class MemoryStateStore implements StateStore {
  private pending = new Map<string, PendingAuthorization>();

  async put(stateHash: string, value: PendingAuthorization) {
    this.pending.set(stateHash, value);
  }

  async take(stateHash: string) {
    const value = this.pending.get(stateHash);
    this.pending.delete(stateHash);
    return value;
  }
}

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("base64url");
}

/** Creates and stores a state for one authorization request. Returns the value to send. */
export async function issueState(
  store: StateStore,
  request: Omit<PendingAuthorization, "createdAt">,
  now: number = Date.now(),
): Promise<string> {
  const state = randomBytes(STATE_BYTES).toString("base64url");
  await store.put(hashState(state), { ...request, createdAt: now });
  return state;
}

export type StateCheck =
  | { ok: true; pending: PendingAuthorization }
  | { ok: false; reason: "missing_state" | "unknown_state" | "expired_state" | "state_mismatch" };

/**
 * Validates the state on the callback and consumes it. Whatever the outcome,
 * the stored state is gone afterwards, so a second try with it always fails.
 */
export async function consumeState(
  store: StateStore,
  state: string | null | undefined,
  expected: { clientId: string; redirectUri: string; browserBinding?: string },
  now: number = Date.now(),
): Promise<StateCheck> {
  if (typeof state !== "string" || state.length === 0) return { ok: false, reason: "missing_state" };
  // Our own states are exactly 43 base64url characters. Anything else was never issued.
  if (!/^[A-Za-z0-9_-]{43}$/.test(state)) return { ok: false, reason: "unknown_state" };

  const pending = await store.take(hashState(state));
  if (!pending) return { ok: false, reason: "unknown_state" };
  if (now - pending.createdAt > STATE_TTL_MS) return { ok: false, reason: "expired_state" };
  if (
    pending.clientId !== expected.clientId ||
    pending.redirectUri !== expected.redirectUri ||
    (pending.browserBinding !== undefined && pending.browserBinding !== expected.browserBinding)
  ) {
    return { ok: false, reason: "state_mismatch" };
  }
  return { ok: true, pending };
}
