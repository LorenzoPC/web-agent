# Design — web-agent

**Status:** Approved (pipeline execution) / Draft (run history persistence)
**Created:** 2026-07-17
**PRD:** [`../prds/web-agent.md`](../prds/web-agent.md)
**Implementation plan:** tracked directly in [`../project/backlog.md`](../project/backlog.md)

---

## Overview

web-agent runs a fixed pipeline of steps, each backed by one of three source types — local hardware, rented remote hardware, or a paid API. All three are called from one server-side Route Handler through a single AI SDK provider registry, so a step only differs from another by its config (which model, which cost formula), not by separate execution code. Cost is computed per step using whichever metric that source is actually billed on: free for local, wall-clock duration for rented hardware, and token counts (or a flat charge) for APIs. Run history (a planned, not-yet-built piece) will persist each run's output and cost to a Neon Postgres database so past runs can be reviewed instead of only seen live.

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

```sql
-- Migration 001_run_history.sql
CREATE TABLE pipeline_runs (
  id           SERIAL          PRIMARY KEY,
  step_id      TEXT            NOT NULL,
  input        TEXT            NOT NULL,
  output       TEXT,
  error        TEXT,
  duration_ms  INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd     NUMERIC(10, 6),
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX pipeline_runs_step_id_idx ON pipeline_runs (step_id, created_at DESC);
```

`step_id` intentionally isn't a foreign key — `MOCK_PIPELINE` is in-memory config, not a database table, so a run history row just tags which step id it was for at the time it ran (steps can be renamed/removed without needing a migration).

**Migrations required:**
- `001_run_history.sql` — creates `pipeline_runs`. Not yet written to a `db/migrations/` folder — no migration tooling chosen yet (open question).

---

## API surface

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/pipeline/run` | none (local/single-user) | `{ stepId: string, input: string }` | `{ output: string, usage: ActualUsage }` or `{ error: string }` |
| GET | `/api/pipeline/runs` *(planned)* | none | `?stepId=` (optional filter) | `{ runs: PipelineRun[] }` — not yet implemented |

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
        registry.languageModel  registry.embeddingModel     plain fetch
        (generateText)          (embed)                     (stubbed)
                 │                   │                    │
         local/remote: OpenAI-compatible endpoint (Ollama, rented GPU)
         api: direct provider SDK (@ai-sdk/openai, @ai-sdk/anthropic)
                 │
        [planned] write run to Neon Postgres (pipeline_runs)
```

**Data flow (current):**
1. Client POSTs `{ stepId, input }` to the route handler.
2. Handler looks up the step in `MOCK_PIPELINE`, resolves its model via `registry` (`src/lib/providers.ts`).
3. Handler calls `generateText` (chat steps) or `embed` (embedding steps), or returns a stub (`external` steps).
4. Handler measures wall-clock duration and reads token usage from the SDK result, returns both as `ActualUsage`.
5. Client computes `actualCost(step, usage)` and replaces the pre-run projection with the real number.

**Data flow (planned addition — run history):**
6. Handler inserts a `pipeline_runs` row after step 4, before responding.
7. A `GET /api/pipeline/runs` route (or a client-side history view) reads them back.

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

---

## Open questions

- [ ] Migration tooling for `001_run_history.sql` — raw `neon()` + hand-run SQL, or an ORM (Drizzle)?
- [ ] Should `GET /api/pipeline/runs` support filtering/pagination from day one, or start minimal?
- [ ] Real search API for `call-tool` — deferred to a Marketplace-integration task
- [ ] Vercel project's GitHub auto-deploy connection failed on `vercel link` — retry or leave as local-dev-only for now?

---

## Out of scope

- Real external search API for `call-tool` (stub only)
- Auth/rate-limiting on any route
- Editing/deleting past runs once persisted
