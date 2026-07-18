# Design — web-agent

**Status:** Approved (pipeline execution, chained runs, tabs UI, Ecosystem catalog database) / Draft (run history persistence)
**Created:** 2026-07-17
**PRD:** [`../prds/web-agent.md`](../prds/web-agent.md)
**Implementation plan:** tracked directly in [`../project/backlog.md`](../project/backlog.md)

---

## Overview

web-agent runs a fixed pipeline of steps, each backed by one of three source types — local hardware, rented remote hardware, or a paid API. All three are called from one server-side Route Handler through a single AI SDK provider registry, so a step only differs from another by its config (which model, which cost formula), not by separate execution code. Cost is computed per step using whichever metric that source is actually billed on: free for local, wall-clock duration for rented hardware, and token counts (or a flat charge) for APIs.

The UI is three tabs on one page: **Ecosystem** (describe a challenge in plain language, get back proposed blocks with real catalog options as selectable cards, build a flow from the selection — see below), **Pipeline** (a primary "Run pipeline" action chains all steps client-side — each step's `output` string becomes the next step's `input`, seeded by the user's prompt for step 1; each step also keeps its own standalone "Run" button for isolated testing), and **History** (past runs, once persistence is wired). Chaining is orchestrated client-side by calling the existing single-step endpoint in sequence, not by a new server-side "run everything" endpoint — this reuses the per-step execution path as-is and gives natural per-step live UI updates without needing a streaming response. If a step errors mid-chain, the chain stops there; later steps are never invoked with no valid input.

**Ecosystem builder:** a fixed taxonomy of three blocks (data source, processing, delivery), each backed by a real, task-categorized catalog stored in Neon Postgres (`catalog_entries`) — ~300 models synced live from the Vercel AI Gateway plus a hand-curated set of services, SDK/framework hooks, RAG patterns, and MCP servers. Only `kind IN ('model', 'service')` entries with a `blockType` set are runnable-as-a-`PipelineStep`; `hook`/`rag-pattern`/`mcp-server` entries (and gateway models from providers not in the registry) are catalog-only for now — real, categorized, browsable data, but not offered as Ecosystem cards since they aren't single runnable steps or the app can't execute them yet. `POST /api/ecosystem/analyze` queries up to 15 candidates per block from the database, sends them plus the user's challenge to an LLM, which recommends 1-3 option ids per block (never invents new ones — the route filters/dedupes the model's response against the real candidate set). The user picks one card per block; "Build flow" turns the three selections directly into a `PipelineStep[]`, which becomes the active flow shown in the Pipeline tab (replacing `MOCK_PIPELINE`, which remains the default until a flow is built).

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

`src/lib/block-catalog.ts` now holds only the block taxonomy (`BlockType`, `BLOCK_TYPES`) — the actual catalog data lives in Neon Postgres (`src/db/schema.ts`, Drizzle ORM):

```ts
export const catalogEntries = pgTable("catalog_entries", {
  id: text("id").primaryKey(),          // gateway id (e.g. "openai/gpt-5.4") or "curated:<slug>"
  kind: text("kind").notNull(),          // 'model' | 'service' | 'hook' | 'rag-pattern' | 'mcp-server'
  blockType: text("block_type"),         // 'data-source' | 'processing' | 'delivery' | null (catalog-only)
  sourceType: text("source_type"),        // 'local' | 'remote' | 'api' | null
  stepKind: text("step_kind"),            // 'chat' | 'embedding' | 'external' | null
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider"),
  modelRef: text("model_ref"),            // registry key, e.g. "openai > gpt-5.4"; null for non-runnable kinds
  cost: jsonb("cost").notNull(),          // CostModel payload
  unit: text("unit"),
  estimatedUnits: numeric("estimated_units"),
  source: text("source").notNull(),       // 'ai-gateway' | 'curated'
  metadata: jsonb("metadata"),            // gateway tags, pricingIncomplete flag, etc.
  syncedAt: timestamp("synced_at"),        // null for curated entries
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const catalogTaskCategories = pgTable("catalog_task_categories", {
  id: text("id").primaryKey(),   // e.g. "computer-vision"
  name: text("name").notNull(),
  description: text("description"),
});

export const catalogEntryCategories = pgTable("catalog_entry_categories", {
  entryId: text("entry_id").notNull().references(() => catalogEntries.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => catalogTaskCategories.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.entryId, t.categoryId] })]);
```

`cost` reuses the existing `CostModel` shape, so a row maps onto `PipelineStep` almost directly — that's what `src/lib/catalog-db.ts`'s `getCatalogOptionsForBlock(blockType)` does.

**Task category taxonomy** (seeded via `scripts/seed-task-categories.ts`), derived from the AI Gateway's real `type`/`tags` vocabulary plus categories curated-only kinds need: `natural-language-processing`, `computer-vision`, `multimodal`, `image-generation`, `video-generation`, `speech-audio`, `embeddings-retrieval`, `agentic-tool-use`, `search`. An entry can belong to more than one (a vision-capable chat model is both `natural-language-processing` and `computer-vision`/`multimodal`).

**Populating the catalog:**
- `scripts/sync-catalog-models.ts` — fetches `https://ai-gateway.vercel.sh/v1/models` (~300 models across 8 types), maps `type`/`tags` to categories, maps `pricing` to `CostModel` (`tokens` when per-token pricing exists; `perRequest` with `metadata.pricingIncomplete: true` when it doesn't, e.g. many image/video models), and upserts. Only `language` models from `openai`/`anthropic` and `embedding` models from `openai` get a `blockType`/`modelRef` set — those are the only providers `src/lib/providers.ts`'s registry can actually resolve; every other gateway model (200+ providers/types the registry doesn't cover) is stored as catalog-only data. Idempotent — safe to re-run to refresh pricing.
- `scripts/seed-catalog-curated.ts` — hand-written entries: 2 runnable API services (search, email) + 3 runnable local Ollama options (`curated:local-documents`, `curated:local-llama`, `curated:dashboard-only` — restoring what the old static catalog had, since the AI Gateway sync only covers cloud providers and local hardware is a core part of the app's premise) + 3 hooks + 3 RAG patterns + 3 MCP servers (catalog-only). Modest starting set, not exhaustive.

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
| POST | `/api/ecosystem/analyze` | none | `{ challenge: string }` | `{ blocks: { blockType: BlockType, rationale: string, options: PipelineStep[] }[] }` or `{ error: string }` — `options` now sourced from `catalog_entries` via `getCatalogOptionsForBlock`, capped at 15 candidates/block before the LLM call |
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
| UI layout | Three tabs on one page: Ecosystem, Pipeline, History | Separate routes/pages | Small enough surface that client-side tabs are simpler than routing; revisit if any tab grows enough to want its own URL/deep-link. |
| Multi-tenancy | Deferred to V2, not built now | Build auth/scoping now since SaaS is the long-term goal | V1 goal is proving the execution + cost model works; adding auth/tenancy now is speculative generality with no current user of it. |
| Ecosystem option generation | LLM selects from a fixed, hand-maintained catalog (real ids, real costs) | LLM freely invents block types/models per challenge | Grounded, real costs and model refs that are guaranteed runnable — no risk of the LLM proposing a model that doesn't exist in the registry. |
| Ecosystem block taxonomy | Fixed 3 blocks (data-source, processing, delivery), always all 3 shown | Dynamic block set decided per challenge | Predictable UI and cost model; "not needed" is handled by a no-op option in the catalog (e.g. delivery's "Dashboard display only") rather than conditional block logic. |
| Ecosystem analysis model | Local Ollama by default (`ECOSYSTEM_ANALYZE_MODEL`, no API key required) | Hardcoded to a paid API model | Keeps the whole app (pipeline + ecosystem builder) usable with zero paid keys out of the box; still overridable via env var. |
| Local/remote provider config | `supportsStructuredOutputs: true` on both `createOpenAICompatible` providers | Leave default (`false`) | Without it, the AI SDK sends no JSON schema to Ollama at all and small local models rarely produce valid structured output unprompted — confirmed via `AI SDK Warning: responseFormat... not supported` and a resulting `No object generated` error until this was set. |
| Ecosystem response robustness | Server dedupes + validates `recommendedOptionIds` against the real catalog before responding | Trust the model's output as-is | Smaller local models sometimes return the same catalog id twice for one block; deduping server-side avoids duplicate React keys and keeps the client dumb. |
| Catalog storage | Neon Postgres via Drizzle ORM, not the static `block-catalog.ts` file | Keep hand-typing entries into a growing TS file | The catalog needed to grow to hundreds of real, live-priced entries (models, services, hooks, RAG patterns, MCP servers) categorized by task — a database with real querying beats a static file once it's this size, and this is the same database run history will use. |
| Migration tooling | Drizzle ORM (`drizzle-kit push`, `src/db/schema.ts`) | Raw SQL + `neon()` | Resolves the open question from the run-history sketch: this project will keep growing schema (catalog now, run history next), worth setting up type-safe schema-as-code once rather than hand-writing SQL twice. |
| Which gateway models are "runnable" (get a `blockType`) | Only `language` models from `openai`/`anthropic` and `embedding` models from `openai` | Set `blockType` for every synced model | `src/lib/providers.ts`'s registry only resolves those providers directly (the app's earlier choice: direct provider SDKs, not the AI Gateway itself, for execution) — giving every gateway model a `blockType` would let Ecosystem build flows that fail immediately when run. Everything else is still synced and categorized, just catalog-only. |
| Candidate cap for the analyze prompt | 15 per block (alphabetical, no ranking yet) | Send every matching catalog row | With ~300 synced models, the `processing` block alone had 59 runnable candidates — enough to bloat the prompt and risk overwhelming smaller local analysis models. Real relevance ranking (e.g. by task category match) is a follow-up, not built now. |
| Local Ollama catalog entries | Re-added as curated entries (`curated:local-documents`, `curated:local-llama`, `curated:dashboard-only`) | Let the AI Gateway sync be the only source | The Gateway only covers cloud providers — without hand-adding these, every Ecosystem-built flow would require a paid API key, contradicting the app's own local/remote/API comparison premise. |

---

## Open questions

- [ ] Should `GET /api/pipeline/runs` support filtering/pagination from day one, or start minimal? (`001_run_history.sql` migration itself is still unwritten — will use Drizzle now that the tooling question is resolved)
- [ ] Real search API for `call-tool` — deferred to a Marketplace-integration task
- [ ] Vercel project's GitHub auto-deploy connection failed on `vercel link` — retry or leave as local-dev-only for now?
- [ ] Does the History tab need a run detail view (click a run → see full per-step breakdown), or is the list with nested steps sufficient at this scale?
- [ ] The built flow's textarea still shows the default placeholder prompt, not the Ecosystem challenge text — worth seeding it from the challenge?
- [ ] Should the 15-per-block candidate cap become relevance-ranked (task category match, cost, recency) instead of alphabetical?
- [ ] Should `hook`/`rag-pattern`/`mcp-server` catalog entries ever surface in the Ecosystem UI (browsable, even if not selectable), or stay purely backend data until there's a real consumer?
- [ ] Worth widening `RUNNABLE_LANGUAGE_PROVIDERS`/`RUNNABLE_EMBEDDING_PROVIDERS` (currently just openai/anthropic) if more providers get added to `src/lib/providers.ts`'s registry?

---

## Out of scope

- Real external search API for `call-tool` (stub only)
- Auth/rate-limiting on any route
- Editing/deleting past runs once persisted
- Multi-tenancy, per-user auth/scoping (V2 — see PRD Non-goals)
- Retrying a failed step mid-chain, or resuming a chain from where it stopped
