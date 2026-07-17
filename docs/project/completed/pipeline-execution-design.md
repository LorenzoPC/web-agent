# Design — Pipeline Execution & Cost Accounting

> **Superseded 2026-07-17** by the project-level [`../../design/web-agent.md`](../../design/web-agent.md). Kept for history.

**Status:** Approved
**Created:** 2026-07-17
**PRD:** [`pipeline-execution-prd.md`](pipeline-execution-prd.md)
**Implementation plan:** see `docs/project/backlog.md` — no separate implementation-plan.md; the remaining steps are small enough to track directly in the backlog

---

## Overview

Local/remote hardware and paid APIs are unified behind one server-side Next.js Route Handler, not called from the browser — one code path calls out to "an endpoint" regardless of source type. Local/remote hardware are OpenAI-compatible endpoints (e.g. Ollama, a rented GPU box running an OpenAI-compatible or Ollama server); APIs are direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic` — chosen explicitly over the Vercel AI Gateway). Both are resolved through one AI SDK provider registry, so a pipeline step just needs a `modelRef` string to run, regardless of which of the three sources it's calling.

---

## Data model

`src/lib/types.ts` — no database, this is the in-memory pipeline config shape:

```ts
export type ModelSourceType = "local" | "remote" | "api";
export type StepKind = "chat" | "embedding" | "external";

export type CostModel =
  | { kind: "free" }
  | { kind: "duration"; dollarsPerHour: number }
  | { kind: "tokens"; inputPerMillion: number; outputPerMillion: number }
  | { kind: "perRequest"; dollarsPerRequest: number };

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  sourceType: ModelSourceType;
  sourceLabel: string;
  stepKind: StepKind;
  modelRef?: string;       // provider registry key, e.g. "local > llama3.2:3b"
  unit: string;
  estimatedUnits: number;
  cost: CostModel;
}

export interface ActualUsage {
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
}
```

**Migrations required:** none — no database in this feature.

---

## API surface

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/pipeline/run` | none (local/single-user) | `{ stepId: string, input: string }` | `{ output: string, usage: ActualUsage }` or `{ error: string }` |

---

## Architecture

```
[browser: pipeline list UI] → POST /api/pipeline/run
                                     │
                          [route handler resolves step]
                                     │
                 ┌───────────────────┼────────────────────┐
                 │                   │                    │
           stepKind="chat"    stepKind="embedding"   stepKind="external"
                 │                   │                    │
        registry.languageModel  registry.textEmbedding      plain fetch
        (generateText)          Model (embed)               (stubbed)
                 │                   │                    │
         local/remote: OpenAI-compatible endpoint (Ollama, rented GPU)
         api: direct provider SDK (@ai-sdk/openai, @ai-sdk/anthropic)
```

**Data flow:**
1. Client POSTs `{ stepId, input }` to the route handler.
2. Handler looks up the step in `MOCK_PIPELINE`, resolves its model via `registry` (`src/lib/providers.ts`).
3. Handler calls `generateText` (chat steps) or `embed` (embedding steps), or returns a stub (`external` steps — no real search API wired yet).
4. Handler measures wall-clock duration and reads token usage from the SDK result, returns both as `ActualUsage`.
5. Client computes `actualCost(step, usage)` and replaces the pre-run projection with the real number.

---

## Key decisions

| Decision | Choice | Alternative rejected | Reason |
|---|---|---|---|
| Where local/remote calls happen | Server-side Route Handler | Browser calls `localhost:11434` directly | Ollama blocks cross-origin browser requests by default; browser-side also can't reach a remote GPU box on a different network. One server-side code path handles all three source types uniformly. |
| Provider strategy | Direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic`) | Vercel AI Gateway | Explicit user choice — already installed in `package.json` before this feature started. |
| Cost model shape | Discriminated union (`free` / `duration` / `tokens` / `perRequest`) per step | Single flat `unitCost * estimatedUnits` (original mock) | The three source types are billed on genuinely different metrics: local is sunk-cost free, rented GPU is billed by wall-clock time (`performance.stepTimeMs`), APIs are billed per token or per flat request. A single number can't represent all three honestly. |
| Local/remote model access | `createOpenAICompatible` behind a shared `createProviderRegistry` | A bespoke fetch wrapper per source | Ollama and most rented-GPU inference servers already speak the OpenAI-compatible chat API — reusing the AI SDK's existing provider abstraction avoids hand-rolling request/response parsing and keeps local/remote/api steps behind the identical `LanguageModel` interface. |
| Registry separator | Custom `" > "` separator (`createProviderRegistry(..., { separator: " > " })`) | Default `:` separator | Local/remote model ids (e.g. Ollama's `llama3.2:3b`) contain colons, which collide with the default provider:model separator. |
| `retrieve-context` step call shape | Real `embed()` call, not `generateText` | Stub it like `call-tool` | It's a legitimate, different AI SDK call shape (embeddings bill by input tokens only, no output) — implementing it properly demonstrates the token-cost model at essentially no extra cost, unlike wiring a real external search API. |
| `rerank-candidates` step | Added as a new mock step (source: `remote`) | Leave `remote` sourceType undemonstrated | The original 4-step mock had no `remote` example, so the `duration` cost model had nothing to exercise. `unit: "hour"` / `estimatedUnits` represents a fraction of an hour for the projection, consistent with how `tokens`/`perRequest` steps use `unit`+`estimatedUnits`. |

---

## Open questions

- [ ] Should run history persist, or is live display sufficient for now? (tracked in the PRD)
- [ ] Real search API for `call-tool` — deferred to a Marketplace-integration task

---

## Out of scope

- Real external search API for `call-tool` (stub only — plain response, no network call)
- Auth/rate-limiting on the route handler
- Persistence of run history
