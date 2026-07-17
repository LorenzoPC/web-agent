# Design — web-agent

**Status:** Approved (pipeline execution) / Draft (chained runs, tabs UI, run history persistence)
**Created:** 2026-07-17
**PRD:** [`../prds/web-agent.md`](../prds/web-agent.md)
**Implementation plan:** tracked directly in [`../project/backlog.md`](../project/backlog.md)

---

## Overview

web-agent runs a fixed pipeline of steps, each backed by one of three source types — local hardware, rented remote hardware, or a paid API. All three are called from one server-side Route Handler through a single AI SDK provider registry, so a step only differs from another by its config (which model, which cost formula), not by separate execution code. Cost is computed per step using whichever metric that source is actually billed on: free for local, wall-clock duration for rented hardware, and token counts (or a flat charge) for APIs.

The UI is two tabs on one page: **Pipeline** (a primary "Run pipeline" action chains all steps client-side — each step's `output` string becomes the next step's `input`, seeded by the user's prompt for step 1; each step also keeps its own standalone "Run" button for isolated testing) and **History** (past runs, once persistence is wired). Chaining is orchestrated client-side by calling the existing single-step endpoint in sequence, not by a new server-side "run everything" endpoint — this reuses the per-step execution path as-is and gives natural per-step live UI updates without needing a streaming response. If a step errors mid-chain, the chain stops there; later steps are never invoked with no valid input.

Run history (planned, not yet built) will persist to a Neon Postgres database: one row per pipeline run (whether it came from a full chain or a single isolated step) with child rows per step result, so past runs can be reviewed instead of only seen live.

V1 is built and scoped as a single-user personal tool. Broad-audience SaaS with multi-tenancy is the long-term ambition but explicitly deferred to V2 — see the PRD's Non-goals.

---

## Data model

**Current:** no database. Pipeline config is an in-memory array (`src/lib/pipeline-data.ts`):

```ts
// src/lib/types.ts
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

**Planned — run history (Neon Postgres, not yet applied):**

A run is a parent record (whether it's a full chained run or a single isolated step run); each step invocation within it is a child row. The client generates a `runId` (`crypto.randomUUID()`) once per "Run pipeline" click or per isolated single-step "Run" click, and includes it on every `/api/pipeline/run` call in that run — the first call for a given `runId` creates the parent row, every call adds a child row.

```sql
-- Migration 001_run_history.sql
CREATE TABLE pipeline_runs (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  root_input  TEXT            NOT NULL,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE TABLE pipeline_run_steps (
  id            SERIAL          PRIMARY KEY,
  run_id        UUID            NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  step_id       TEXT            NOT NULL,
  step_order    INTEGER         NOT NULL,
  input         TEXT            NOT NULL,
  output        TEXT,
  error         TEXT,
  duration_ms   INTEGER,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      NUMERIC(10, 6),
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX pipeline_run_steps_run_id_idx ON pipeline_run_steps (run_id, step_order);
```

`step_id` intentionally isn't a foreign key to a `pipeline_steps` table — `MOCK_PIPELINE` is in-memory config, not persisted, so a run step row just tags which step id it was for at the time it ran (steps can be renamed/removed without a migration).

**Migrations required:**
- `001_run_history.sql` — creates `pipeline_runs` + `pipeline_run_steps`. Not yet written to a `db/migrations/` folder — no migration tooling chosen yet (open question).

---

## API surface

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/pipeline/run` | none (local/single-user) | `{ stepId: string, input: string, runId: string }` *(runId planned — not yet required by the current implementation)* | `{ output: string, usage: ActualUsage }` or `{ error: string }` |
| GET | `/api/pipeline/runs` *(planned)* | none | — | `{ runs: (PipelineRun & { steps: PipelineRunStep[] })[] }` — not yet implemented |

Chaining a full pipeline run is orchestrated **client-side**: the browser calls `POST /api/pipeline/run` once per step, in order, reusing the same `runId` for all of them and threading each response's `output` into the next call's `input`. There is no separate "run everything" server endpoint.

---

## Architecture

```
[browser: Pipeline tab]
   "Run pipeline" ──▶ client-side loop, one runId for the whole chain:
                        for each step in order:
                          POST /api/pipeline/run { stepId, input, runId }
                          input(next) := output(this)
                          update that step's card: running → done/error
                          on error: stop, don't call remaining steps
   step's own "Run" ──▶ POST /api/pipeline/run { stepId, input, runId } (single call, fresh runId)
                                     │
                          [route handler resolves step]
                                     │
                 ┌───────────────────┼────────────────────┐
                 │                   │                    │
           stepKind="chat"    stepKind="embedding"   stepKind="external"
                 │                   │                    │
        registry.languageModel  registry.embeddingModel     plain fetch
        (generateText)          (embed)                     (stubbed)
                 │                   │                    │
         local/remote: OpenAI-compatible endpoint (Ollama, rented GPU)
         api: direct provider SDK (@ai-sdk/openai, @ai-sdk/anthropic)
                 │
        [planned] upsert pipeline_runs (by runId) + insert pipeline_run_steps row

[browser: History tab] ──▶ GET /api/pipeline/runs [planned] ──▶ list of past runs + their step results
```

**Data flow (current):**
1. Client POSTs `{ stepId, input }` to the route handler (once per step; chained or isolated, driven entirely by the client).
2. Handler looks up the step in `MOCK_PIPELINE`, resolves its model via `registry` (`src/lib/providers.ts`).
3. Handler calls `generateText` (chat steps) or `embed` (embedding steps), or returns a stub (`external` steps).
4. Handler measures wall-clock duration and reads token usage from the SDK result, returns both as `ActualUsage`.
5. Client computes `actualCost(step, usage)` and replaces the pre-run projection with the real number. If chaining, the client also feeds `output` into the next step's `input` and advances to it; on error, the client stops the chain.

**Data flow (planned addition — run history):**
6. Client includes a `runId` (generated once per chain or per isolated run) on every call in step 1.
7. Handler upserts the `pipeline_runs` parent row (first call for that `runId`) and inserts a `pipeline_run_steps` child row, after step 4, before responding.
8. The History tab calls `GET /api/pipeline/runs` to read runs back with their nested step results.

---

## Key decisions

| Decision | Choice | Alternative rejected | Reason |
|---|---|---|---|
| Where local/remote calls happen | Server-side Route Handler | Browser calls `localhost:11434` directly | Ollama blocks cross-origin browser requests by default; browser-side also can't reach a remote GPU box on a different network. |
| Provider strategy | Direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic`) | Vercel AI Gateway | Explicit user choice, made before this feature started. |
| Cost model shape | Discriminated union (`free` / `duration` / `tokens` / `perRequest`) per step | Single flat `unitCost * estimatedUnits` | The three source types are billed on genuinely different metrics — a single number can't represent all three honestly. |
| Local/remote model access | `createOpenAICompatible` behind a shared `createProviderRegistry` | A bespoke fetch wrapper per source | Ollama and most rented-GPU inference servers already speak the OpenAI-compatible chat API. |
| Registry separator | Custom `" > "` separator | Default `:` separator | Local/remote model ids (e.g. Ollama's `llama3.2:3b`) contain colons, which collide with the default separator. |
| Run history store | Neon Postgres (Vercel Marketplace) | Upstash Redis / Vercel Blob | Run history is structured, queryable data (filter by step, sort by date, aggregate cost) — a relational store fits better than a KV cache or blob storage. |
| Run history schema | `step_id` as a plain text tag, not a foreign key | A `pipeline_steps` table with a real FK | `MOCK_PIPELINE` is in-memory config, not persisted — there's nothing to key against yet. Revisit if pipeline config ever moves into the database. |
| Run history shape | Parent `pipeline_runs` row + child `pipeline_run_steps` rows, one run per "Run pipeline" click *or* per isolated single-step click | A flat one-row-per-step-call table (original plan) | A chained run is one meaningful unit of work with N step results, not N unrelated events — reviewing history should show "this prompt produced this chain," not a flat list that loses the grouping. |
| Chaining orchestration | Client-side loop calling the existing single-step `/api/pipeline/run` endpoint, threading `output` → next `input` | A new server-side "run the whole pipeline" endpoint (single request, server loops and streams progress) | Reuses the existing endpoint and per-step error handling as-is; gives per-step live UI updates for free (each fetch resolves independently) without needing SSE/streaming infrastructure. Cost: one HTTP round-trip per step instead of one for the whole chain — acceptable at this scale. |
| Chain failure handling | Stop the chain on the first step error; don't invoke later steps | Skip the failed step and continue, or auto-retry | A later step's `input` would be the failed step's (nonexistent) output — there's nothing valid to pass forward. Simplest and safest for V1. |
| UI layout | Two tabs on one page: Pipeline, History | Separate routes/pages | Small enough surface that client-side tabs are simpler than routing; revisit if either tab grows enough to want its own URL/deep-link. |
| Multi-tenancy | Deferred to V2, not built now | Build auth/scoping now since SaaS is the long-term goal | V1 goal is proving the execution + cost model works; adding auth/tenancy now is speculative generality with no current user of it. |

---

## Open questions

- [ ] Migration tooling for `001_run_history.sql` — raw `neon()` + hand-run SQL, or an ORM (Drizzle)?
- [ ] Should `GET /api/pipeline/runs` support filtering/pagination from day one, or start minimal?
- [ ] Real search API for `call-tool` — deferred to a Marketplace-integration task
- [ ] Vercel project's GitHub auto-deploy connection failed on `vercel link` — retry or leave as local-dev-only for now?
- [ ] Does the History tab need a run detail view (click a run → see full per-step breakdown), or is the list with nested steps sufficient at this scale?

---

## Out of scope

- Real external search API for `call-tool` (stub only)
- Auth/rate-limiting on any route
- Editing/deleting past runs once persisted
- Multi-tenancy, per-user auth/scoping (V2 — see PRD Non-goals)
- Retrying a failed step mid-chain, or resuming a chain from where it stopped
