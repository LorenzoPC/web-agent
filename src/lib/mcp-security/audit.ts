import { createHash, createHmac } from "node:crypto";
import type { Obligation, Principal } from "./policy";

/**
 * Every authorization decision, allowed or not, becomes one audit event with
 * the full decision context: who, through which client, with which scopes,
 * on which server and tool, the outcome, and the policies behind it.
 *
 * Arguments are stored as an HMAC, never in clear text, so the log can prove
 * what was asked without becoming a copy of the data. Events are hash-chained:
 * each one carries the hash of the one before, so a removed or edited event
 * breaks the chain.
 */

export type AuditStage = "registry" | "token" | "consent" | "directory" | "policy";

export interface AuditEvent {
  at: string;
  requestId: string;
  server: string;
  method: "tools/list" | "tools/call";
  tool?: string;
  allow: boolean;
  /** The check that ended the request, or "policy" when every check passed. */
  stage: AuditStage;
  code: string;
  reason: string;
  subject?: { iss: string; sub: string };
  clientId?: string;
  scopes?: string[];
  /** The directory record as read for this request. */
  principal?: Principal;
  determiningPolicies?: string[];
  obligations?: Obligation[];
  /** For tools/list: the tool names returned. */
  toolsReturned?: string[];
  argumentsHmac?: string;
}

export interface ChainedAuditEvent extends AuditEvent {
  prevHash: string;
  hash: string;
}

export interface AuditSink {
  write(event: AuditEvent): Promise<void>;
}

/** Canonical JSON: keys sorted at every level, so the same event always hashes the same. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function hmacArguments(key: string | Buffer, args: unknown): string {
  return createHmac("sha256", key).update(canonicalJson(args ?? null)).digest("base64url");
}

const GENESIS = "0".repeat(64);

function hashEvent(prevHash: string, event: AuditEvent): string {
  return createHash("sha256").update(prevHash).update(canonicalJson(event)).digest("hex");
}

/** In-memory, hash-chained sink for tests and local runs. The real log is append-only storage. */
export class MemoryAuditSink implements AuditSink {
  readonly events: ChainedAuditEvent[] = [];

  async write(event: AuditEvent) {
    const prevHash = this.events.at(-1)?.hash ?? GENESIS;
    this.events.push({ ...event, prevHash, hash: hashEvent(prevHash, event) });
  }
}

/** Index of the first event whose hash doesn't follow from the one before, or -1 when the chain holds. */
export function verifyAuditChain(events: ChainedAuditEvent[]): number {
  let prevHash = GENESIS;
  for (let i = 0; i < events.length; i++) {
    const { prevHash: storedPrev, hash, ...event } = events[i];
    if (storedPrev !== prevHash || hash !== hashEvent(prevHash, event)) return i;
    prevHash = hash;
  }
  return -1;
}
