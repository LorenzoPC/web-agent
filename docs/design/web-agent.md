# Design — web-agent

**Status:** Approved (pipeline execution, chained runs, tabs UI, Ecosystem catalog database, Ecosystem builder v2 — Agents/Tools/MCP/RAG, full-catalog search, per-item rationale) / Draft (run history persistence, Dashboard + Agent Marketplace + Patterns + Prompts screens — all UI built against mock data, persistence not yet applied; Flow Patterns/Prompts design still being refined, see `agentic_component_enhancement.md`)
**Created:** 2026-07-17
**PRD:** [`../prds/web-agent.md`](../prds/web-agent.md)
**Implementation plan:** tracked directly in [`../project/backlog.md`](../project/backlog.md)

---

## Overview

web-agent runs a fixed pipeline of steps, each backed by one of three source types — local hardware, rented remote hardware, or a paid API. All three are called from one server-side Route Handler through a single AI SDK provider registry, so a step only differs from another by its config (which model, which cost formula), not by separate execution code. Cost is computed per step using whichever metric that source is actually billed on: free for local, wall-clock duration for rented hardware, and token counts (or a flat charge) for APIs.

The UI is three tabs on one page: **Ecosystem** (describe a challenge in plain language, get back proposed blocks with real catalog options as selectable cards, build a flow from the selection — see below), **Pipeline** (a primary "Run pipeline" action chains all steps client-side — each step's `output` string becomes the next step's `input`, seeded by the user's prompt for step 1; each step also keeps its own standalone "Run" button for isolated testing), and **History** (past runs, once persistence is wired). Chaining is orchestrated client-side by calling the existing single-step endpoint in sequence, not by a new server-side "run everything" endpoint — this reuses the per-step execution path as-is and gives natural per-step live UI updates without needing a streaming response. If a step errors mid-chain, the chain stops there; later steps are never invoked with no valid input.

**Ecosystem builder:** backed by a real, task-categorized catalog stored in Neon Postgres (`catalog_entries`) — ~300 models synced live from the Vercel AI Gateway plus a hand-curated set of services, agent personas, SDK/framework hooks, RAG patterns, and MCP servers. The builder has two runnable blocks (**data source**, **delivery** — `kind IN ('model', 'service')` entries with a `blockType` set, single-select) plus an **Agent** section that fills the middle "processing" role (`kind = 'agent'`, persona = `modelRef` + a `systemPrompt` column + purpose, single-select, 6 curated personas), and three optional attachment sections on the Agent — multi-select **Tools** (reuses the `hook` kind, 13 entries), **MCP servers**, and **RAG sources** (reuse `mcp-server`/`rag-pattern` kinds). The goal textarea gets an LLM-refined, editable restatement (`refinedGoal`), and there's an editable, LLM-drafted **Success criteria** section. `POST /api/ecosystem/analyze` queries up to 15 candidates per section from the database, sends them plus the user's challenge to an LLM, which recommends `{ id, rationale }` pairs per section — a short, item-specific rationale for each recommended option, not just one blurb per section — (never invents new ids — the route filters/dedupes the model's response against the real candidate set, falling back to the first N candidates with a generic rationale if none validate). The user picks per section; each option card shows its own rationale text (when it has one) while selected. Every section also ends with a **"Search something else"** card that opens a modal listing that section's *entire* catalog — uncapped, lazy-loaded via `GET /api/ecosystem/catalog?category=...&offset=...&limit=...`, with a text-search box (`q` param, `ILIKE` over name/description/provider) — so a user isn't limited to the ~15 LLM-surfaced candidates. Anything picked from that modal is merged into the section's option list client-side (not persisted server-side) so "Build flow" can still resolve it. "Build flow" assembles the selections into a `PipelineStep[]` (data-source, agent-with-attachments, delivery), which becomes the active flow shown in the Pipeline tab (replacing `MOCK_PIPELINE`, which remains the default until a flow is built).

Most catalog entries beyond the runnable data-source/delivery/agent ones stay selection-only — captured on the built flow, no execution change — **except 3 specific catalog rows get real execution**, flagged via `metadata.executor`, all verified working:
- `"exa-search"` — a real AI SDK `tool()` calling the Exa Search API (`exa-js`, `EXA_API_KEY` — provisioned via Vercel Marketplace 2026-07-17), attached to the agent step's `tools` for agentic tool-calling (`stopWhen: isStepCount(4)`). Verified the Exa API call itself works (direct test, real current results). **Caveat found during verification:** the free local default model (`llama3.2:latest`) doesn't reliably invoke attached tools at all — it answered "I can't search the web" even with the tool available, rather than calling it. This is a model tool-calling-capability limitation, not a bug in the integration; a stronger tool-calling model (OpenAI/Anthropic, or a larger local model) would be needed to actually exercise this in practice.
- `"github-mcp"` — a real `@ai-sdk/mcp` `createMCPClient` connection to GitHub's remote MCP server (`https://api.githubcopilot.com/mcp/`, user-supplied `GITHUB_TOKEN` PAT — not a Marketplace resource), `client.tools()` merged into the same `tools` object, `client.close()` in a `finally`. Verified the code path triggers correctly and fails cleanly ("Missing GITHUB_TOKEN") without a token — the real success path is untested since no token was available during this session.
- `"local-rag"` — no new infra: pasted reference text is chunked and embedded via the existing `registry.embeddingModel("local > nomic-embed-text")` path (required pulling that model locally — it wasn't in the Ollama install used during development), ranked against the query by in-memory cosine similarity (no vector DB), and prepended to the prompt before calling the agent's model. **Fully verified**: a test run with a planted fact ("the secret code word is PURPLE ELEPHANT") in the pasted text produced a response that explicitly referenced it back — real retrieval, not hallucination.

Everything else selected (other tools, other MCP servers, other RAG patterns) is captured on the built flow but does nothing extra when run — same treatment as today's catalog-only kinds. `PipelineStep` gained optional `systemPrompt`/`toolRefs`/`mcpServerRefs`/`ragSource` fields that only `/api/pipeline/run`'s chat-step branch consumes.

**Bug found and fixed during this pass:** `/api/pipeline/run` previously looked up steps by id from the hardcoded `MOCK_PIPELINE` array — meaning a flow built via Ecosystem (whose step ids come from the catalog, not `MOCK_PIPELINE`) could never actually run; every built-flow step would 404. Fixed by having the client send the full `PipelineStep` object in the request body instead of just an id.

**Analyze endpoint reliability finding:** the local default analysis model produced hallucinated/cross-contaminated `rationale` text (e.g. a stray URL repeated everywhere, then an MCP server id leaking into the RAG section's rationale) when multiple recommendation groups shared one structured-output call — even though the actual id *selections* stayed correct throughout. The fix was fully isolating each group into its own `generateText` call: one call for goal+blocks+agent (held up fine bundled), and separate calls each for tools, MCP servers, and RAG sources (needed full isolation — even a 2-group "attachments" call still bled). This is now 4 sequential/parallel LLM calls per analysis instead of 1.

Run history (planned, not yet built) will persist to a Neon Postgres database: one row per pipeline run (whether it came from a full chain or a single isolated step) with child rows per step result, so past runs can be reviewed instead of only seen live.

**Dashboard + Agent Marketplace (2026-07-30, UI only — mock data, no persistence yet):** the app gained real routing — the old single-page builder moved from `/` to `/builder`, `/` now renders a signed-in **Dashboard**, and a new **Marketplace** page lives at `/marketplace`. A shared nav shell (`src/components/shell/app-nav.tsx`, rendered from the now-`async` root `layout.tsx`) links all three and shows the current user's name via a mock-auth seam (`src/lib/auth.ts`'s `getCurrentUser()`, hardcoded, `async` on purpose so a real session lookup can replace the body later with no call-site changes). The Dashboard first shipped with only a **Results** section (recent pipeline runs — mock data), since replaced by the layout described under "Dashboard redesign" below. The Marketplace has two sections: **Business Capabilities Agents** — a **Capabilities**/**Roles** toggle over pool cards (Capabilities mirrors the already-seeded-but-previously-unread `catalog_task_categories`/`catalog_entry_categories` tables — NLP, Agentic Tool Use, etc.; Roles is a new, not-yet-persisted taxonomy — Customer Support, Sales, Engineering, Customer Experience) — and **Tasks Agents**, a card grid of individual agent personas (name + role) that opens a right-side sidebar with the full persona (role, source, cost, description, system prompt) on click, reusing the persona data shape (`PipelineStep`, now carrying an optional `role`) rather than inventing a parallel type. Pool cards are independently click-to-expand (accordion per card, several can be open at once), showing that pool's mapped agents and/or a **Pre / Work / Post** breakdown of business processes the pool could support — content drafted collaboratively over several rounds in conversation (16-20 processes per Role, phase-classified, then hand-reviewed) before being hardcoded into `src/lib/mock-data.ts`. Only the 4 Role pools have process content so far; Capability pools have none yet. Support Agent and Code Reviewer Agent are deliberately excluded from the flat Tasks Agents grid — they're shown only under the Engineering pool instead, per an explicit scoping call.

This entire feature is intentionally sequenced UI-first: a `role` column on `catalog_entries` and a new `pipeline_runs` table were drafted in `src/db/schema.ts` (plus a matching backfill in `scripts/seed-catalog-agents.ts`) but deliberately **not** pushed or applied — the Dashboard/Marketplace validate layout and content against `src/lib/mock-data.ts` first, with real persistence (and the API routes/queries to back it) as explicit follow-up work once the mock is settled. No new API routes exist for either screen yet.

**Flow Patterns + Prompts (2026-07-30, UI only — mock data; full plan in `docs/project/pattern_libraries.md`, design refinement in `docs/prds/agentic_component_enhancement.md`):** two more new screens, same UI-first posture. **`/patterns`** is a gallery of 9 curated, linear Flow Patterns (e.g. "Research → Synthesize," "Draft → Review") — click-to-expand cards showing each pattern's ordered agent-task slots, plus a "Create new pattern" card opening a local-state-only authoring form (name, description, add/reorder steps — not persisted, demonstrates the interaction ahead of the real curated-only V1 decision). **`/prompts`** is a library of 8 seeded prompts scoped to Business Unit/Role/Task-process (filterable, with specificity fallback designed but not yet enforced by any picker UI since the Flow tab that would consume it isn't built), a create/edit form, a soft-archive toggle, and a **Test panel that runs for real** — it calls the actual `/api/pipeline/run` with a chosen catalog agent's `systemPrompt` as persona and the prompt body as instructions, the same execution path the Builder uses. Both screens' "Create new" affordance shares one generalized component, `src/components/ui/create-new-card.tsx`, generalized from what used to be the Ecosystem tab's one-off "Search something else" card (which now also uses it). A further design pass (`agentic_component_enhancement.md`) checked this plan against a fuller agent mental model (Reasoning/Goals/Tools/Context/Memory/Policies/Evaluation) and found two corrections needed before the next piece — a new Builder "Flow" tab between Ecosystem and Pipeline — gets built: slots should receive the full chain transcript rather than just the immediately-prior step's output, and prompt resolution needs a policy/instruction split (policies compose additively, instructions fall back to one match). Neither correction has been applied to the shipped mock code yet.

**Dashboard redesign (2026-10-23, UI only — mock data):** `/` is now four bands, widened to `max-w-7xl`. **Top row** — a **Metrics** column (left third; 2×2 stat tiles: value + signed delta vs a named period, colored by whether the move is good news, with an arrow so color isn't the only signal) beside a **Newsfeed** (right two-thirds) of one-line notification headers (kind chip, unread dot, timestamp). The feed list is taken out of flow on wide screens so the metric tiles set the row height and the feed scrolls to match. Pipeline runs now surface here as "Run completed / partially completed / failed" headers (`runNotification()` maps each `MOCK_RUNS` row), replacing the old standalone Results list, so `listRecentRuns()` still has a consumer once persistence lands. **Top priorities** — five ranked, full-width cards, each a short title, about five lines of context (`line-clamp-5`), two text actions (linking to an existing screen where one fits, inert otherwise) and a "+" button labeled "Delegate to an agent" (no behavior yet). **Agentic capability coverage** — a table of business units × Pre / Work / Post phases, each cell a stacked live / piloting / not-covered bar with its counts printed beside it, plus an overall column and an "All units" total row. Totals come from each unit's mapped task-processes (`MOCK_TASK_PROCESSES`); only the live/pilot counts are hand-set. The bars use one indigo ramp (darker = further along, inverted in dark mode), with the live/pilot steps checked for color-vision-deficiency separation and 3:1 contrast against the card surface in both modes. All four bands read from `src/lib/mock-data.ts` (`MOCK_METRICS`, `MOCK_NOTIFICATIONS`, `MOCK_PRIORITIES`, `MOCK_UNIT_COVERAGE`); none has a real data source yet.

**Dashboard — Product screen (2026-10-23, UI only — mock data):** the Dashboard now has two screens, switched by tabs under the page heading: **Overview** (`/`, above) and **Product** (`/product`). The app nav keeps "Dashboard" active on both. Product is for the PM of the agentic product or the manager of one of its supporting functions, and is built from the same section components. A **function switcher** (All functions · Customer Support · Sales · Engineering · Customer Experience, the existing business units) reloads every section, and its choice lives in the URL (`?lens=…&coverage=…`), so the page stays a Server Component and views can be linked to:
- **Metrics:** product health for All functions (activation, eval pass rate, autonomy, cost per task), or that function's own numbers.
- **Newsfeed:** product signals, each chip naming the function it came from. A function view shows its own items plus product-wide ones.
- **Systems heartbeat (top right):** the services agents depend on, each with a red/yellow/green dot. Problem systems sort to the top and spell out their status and reading, and the heading summarizes counts per color. A system that is down gets a pulse on its dot.
- **Top priorities:** one ranked pool. Each view shows the first five its function raised or is affected by. The "+" is "Add to roadmap" for All functions and "Delegate to an agent" for a function view.
- **Coverage:** an **Our customers / Our team** toggle. Our customers shows the share of customer workspaces with an agent on each use case's processes, as percentages. Our team reuses the Overview's process counts. The default is customers for All functions and team for a function view, which also gets its own row marked.

Mock data lives in `src/lib/mock-product-data.ts`, kept apart from `mock-data.ts` so each screen's data can change separately.

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

`PipelineStep` also carries optional execution-only fields, populated for a built Ecosystem flow's agent step: `systemPrompt?: string`, `toolRefs?: string[]`, `mcpServerRefs?: string[]`, `ragSource?: { id: string; documents: string }`.

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
  systemPrompt: text("system_prompt"),    // 'agent' kind: the persona's system prompt
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
- `scripts/seed-catalog-curated.ts` — hand-written entries: 2 runnable API services (search, email) + 3 runnable local Ollama options (`curated:local-documents`, `curated:local-llama`, `curated:dashboard-only` — restoring what the old static catalog had, since the AI Gateway sync only covers cloud providers and local hardware is a core part of the app's premise) + 13 hooks ("Tools" — one, "Web Search," marked `metadata.executor: "exa-search"`) + 4 RAG patterns (one, "Local documents (real)," marked `"local-rag"`) + 3 MCP servers (GitHub marked `"github-mcp"`). Modest starting set, not exhaustive.
- `scripts/seed-catalog-agents.ts` — 6 curated `kind='agent'` personas (Research, Summarizer, Support, Code Reviewer, Data Analyst, General Assistant), each pairing an existing runnable model with a `systemPrompt` and purpose description.

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

**Drafted, not applied — Dashboard/Marketplace schema (`src/db/schema.ts`):** written ahead of the UI-first pivot below, kept in the file as a ready-to-push draft rather than reverted:

```ts
// catalogEntries gains one nullable column, agent rows only:
role: text("role"), // e.g. "Research Analyst"; null for non-agent rows

// a new, separate table — one row per full "Run pipeline" chain, not per step
// (deliberately simpler than the pipeline_runs/pipeline_run_steps split above,
// to avoid threading a runId through /api/pipeline/run):
export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // no `users` table yet — the mock-auth constant
  rootInput: text("root_input").notNull(),
  successCriteria: text("success_criteria"),
  status: text("status").notNull(), // 'success' | 'partial' | 'error'
  totalCostUsd: numeric("total_cost_usd").notNull(),
  stepCount: integer("step_count").notNull(),
  steps: jsonb("steps").notNull(), // per-step snapshot, shape TBD
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

`scripts/seed-catalog-agents.ts` was updated in lockstep with a `role` string per curated agent (Research Analyst, Content Summarizer, Customer Support Specialist, Code Reviewer, Data Analyst, General Assistant) — idempotent, ready to re-run once `role` is actually pushed.

**Current — Dashboard/Marketplace UI, mock data only (`src/lib/mock-data.ts`):** both screens render entirely from static exports, no database reads:
- `MOCK_AGENTS: PipelineStep[]` — the 6 curated personas plus `role`, standing in for a real `getMarketplaceAgents()` query.
- `MOCK_CAPABILITY_POOLS` / `MOCK_ROLE_POOLS: MockAgentPool[]` — `{ id, name, description, entryCount, agents?, processes? }`; `agents?: { name, note }[]` (only Engineering populated); `processes?: { pre, work, post }: string[]` (all 4 Role pools populated, no Capability pool has this yet).
- `MOCK_RUNS: MockRun[]` — `{ id, rootInput, status, totalCostUsd, stepCount, completedAt }`, standing in for `listRecentRuns()` reading the drafted `pipelineRuns` table above.

These shapes were deliberately kept close to what the real query results will look like, so swapping mock data for real queries later should be a low-diff change to the page components, not a rewrite.

---

## API surface

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| POST | `/api/pipeline/run` | none (local/single-user) | `{ step: PipelineStep, input: string, runId?: string }` *(runId planned — not yet required)* — the **full step**, not just an id: a built flow's steps aren't in any server-side list to look up by id | `{ output: string, usage: ActualUsage }` or `{ error: string }` |
| POST | `/api/ecosystem/analyze` | none | `{ challenge: string }` | `{ refinedGoal, successCriteria, blocks: [...], agent, tools, mcpServers, ragSources }` — each group is `{ rationale, allOptions, recommendations }`, where `recommendations` is `{ id, rationale }[]` (one rationale per recommended item, not just per section); `allOptions` sourced from `catalog_entries` (`getCatalogOptionsForBlock`/`getAgentOptions`/`getCatalogCardsByKind`), capped at 15 candidates/group |
| GET | `/api/ecosystem/catalog` | none | query params: `category` (one of `CatalogCategory`), `offset`, `limit`, optional `q` | `{ title, subtitle, items, hasMore }` — uncapped, paginated fetch (`searchCatalogCategory`) backing each section's "Search something else" modal; `q` does an `ILIKE` match on name/description/provider |
| GET | `/api/pipeline/runs` *(planned)* | none | — | `{ runs: (PipelineRun & { steps: PipelineRunStep[] })[] }` — not yet implemented |
| — | Dashboard / Marketplace | — | — | **No API routes yet.** Both pages read directly from `src/lib/mock-data.ts` — see Data model. |

Chaining a full pipeline run is orchestrated **client-side**: the browser calls `POST /api/pipeline/run` once per step, in order, reusing the same `runId` for all of them and threading each response's `output` into the next call's `input`. There is no separate "run everything" server endpoint.

---

## Architecture

```
[browser: Pipeline tab]
   "Run pipeline" ──▶ client-side loop, one runId for the whole chain:
                        for each step in order:
                          POST /api/pipeline/run { step, input, runId }
                          input(next) := output(this)
                          update that step's card: running → done/error
                          on error: stop, don't call remaining steps
   step's own "Run" ──▶ POST /api/pipeline/run { step, input, runId } (single call, fresh runId)
                                     │
                          [route handler dispatches by stepKind]
                                     │
                 ┌───────────────────┼────────────────────┐
                 │                   │                    │
           stepKind="chat"    stepKind="embedding"   stepKind="external"
                 │                   │                    │
        registry.languageModel  registry.embeddingModel     plain fetch
        (generateText, with       (embed)                   (stubbed)
         system/tools/RAG if
         attached — see below)
                 │                   │                    │
         local/remote: OpenAI-compatible endpoint (Ollama, rented GPU)
         api: direct provider SDK (@ai-sdk/openai, @ai-sdk/anthropic)
                 │
        [planned] upsert pipeline_runs (by runId) + insert pipeline_run_steps row

For a chat step carrying Ecosystem v2's optional fields: `ragSource` (if present) triggers
`retrieveRelevantChunks()` first, prepending top-K chunks to the prompt; `toolRefs`/`mcpServerRefs`
are checked against known `metadata.executor` ids (currently `exa-search`, `github-mcp`) to build a
real `tools` object passed to `generateText` alongside `system: step.systemPrompt`.

[browser: History tab] ──▶ GET /api/pipeline/runs [planned] ──▶ list of past runs + their step results
```

**Data flow (current):**
1. Client POSTs `{ step, input }` to the route handler (once per step; chained or isolated, driven entirely by the client — `step` is the full `PipelineStep`, not an id to look up).
2. Handler resolves the step's model via `registry` (`src/lib/providers.ts`) using `step.modelRef`.
3. Handler calls `generateText` (chat steps — applying `system`/`tools`/RAG augmentation if the step carries them) or `embed` (embedding steps), or returns a stub (`external` steps).
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
| Ecosystem section taxonomy | Fixed sections always shown: data-source, delivery (`BLOCK_TYPES`), plus a dedicated Agent section (`kind='agent'`, replaces the old "processing" block) and Tools/MCP servers/RAG sources attachments | Dynamic section set decided per challenge | Predictable UI and cost model; "not needed" is handled by a no-op option in the catalog (e.g. delivery's "Dashboard display only") or simply leaving an attachment section empty, rather than conditional section logic. |
| Ecosystem analysis model | Local Ollama by default (`ECOSYSTEM_ANALYZE_MODEL`, no API key required) | Hardcoded to a paid API model | Keeps the whole app (pipeline + ecosystem builder) usable with zero paid keys out of the box; still overridable via env var. |
| Local/remote provider config | `supportsStructuredOutputs: true` on both `createOpenAICompatible` providers | Leave default (`false`) | Without it, the AI SDK sends no JSON schema to Ollama at all and small local models rarely produce valid structured output unprompted — confirmed via `AI SDK Warning: responseFormat... not supported` and a resulting `No object generated` error until this was set. |
| Ecosystem response robustness | Server dedupes + validates each `recommendations[].id` against the real catalog before responding | Trust the model's output as-is | Smaller local models sometimes return the same catalog id twice for one block; deduping server-side avoids duplicate React keys and keeps the client dumb. |
| Catalog storage | Neon Postgres via Drizzle ORM, not the static `block-catalog.ts` file | Keep hand-typing entries into a growing TS file | The catalog needed to grow to hundreds of real, live-priced entries (models, services, hooks, RAG patterns, MCP servers) categorized by task — a database with real querying beats a static file once it's this size, and this is the same database run history will use. |
| Migration tooling | Drizzle ORM (`drizzle-kit push`, `src/db/schema.ts`) | Raw SQL + `neon()` | Resolves the open question from the run-history sketch: this project will keep growing schema (catalog now, run history next), worth setting up type-safe schema-as-code once rather than hand-writing SQL twice. |
| Which gateway models are "runnable" (get a `blockType`) | Only `language` models from `openai`/`anthropic` and `embedding` models from `openai` | Set `blockType` for every synced model | `src/lib/providers.ts`'s registry only resolves those providers directly (the app's earlier choice: direct provider SDKs, not the AI Gateway itself, for execution) — giving every gateway model a `blockType` would let Ecosystem build flows that fail immediately when run. Everything else is still synced and categorized, just catalog-only. |
| Candidate cap for the analyze prompt | 15 per block (alphabetical, no ranking yet) | Send every matching catalog row | With ~300 synced models, the `processing` block alone had 59 runnable candidates — enough to bloat the prompt and risk overwhelming smaller local analysis models. Real relevance ranking (e.g. by task category match) is a follow-up, not built now. |
| Local Ollama catalog entries | Re-added as curated entries (`curated:local-documents`, `curated:local-llama`, `curated:dashboard-only`) | Let the AI Gateway sync be the only source | The Gateway only covers cloud providers — without hand-adding these, every Ecosystem-built flow would require a paid API key, contradicting the app's own local/remote/API comparison premise. |
| `/api/pipeline/run` request shape | Client sends the full `PipelineStep` object | Server looks up the step by id (original design) | Found during Ecosystem v2 verification: a built flow's step ids only exist in the catalog, never in `MOCK_PIPELINE` — the id-lookup design meant no built-flow step could ever actually run (404). Sending the full step removes the need for any server-side list. |
| Real execution scope (Ecosystem v2) | Exactly 3 catalog rows wired for real (Exa search, GitHub MCP, local RAG); everything else in `hook`/`mcp-server`/`rag-pattern` stays catalog-only | Wire real execution for every catalog entry | Explicit user scoping — proving the pattern on a focused set first, rather than building N different real integrations (search APIs, every MCP server, every RAG pattern) in one pass. |
| Local RAG cost/complexity | In-memory cosine similarity over user-pasted text, no vector DB | Provision a vector store (Upstash Vector, pgvector) | At this scale (one user's pasted reference text per run, recomputed per call) a real vector DB is unneeded infrastructure; revisit if RAG sources need to persist across runs. |
| Analyze call granularity | One `generateText` call per recommendation group (goal+blocks+agent bundled; tools/MCP/RAG each fully separate) | One large call for everything | The local default model produced cross-contaminated `rationale` text once more than ~4 things were asked for in one structured call (confirmed via testing — a 2-group "attachments" call still bled, only full per-group isolation was clean). Costs more calls/latency (4 total) but the actual id selections were never the problem, only the free-text explanations. |
| Tool-calling model choice | Not enforced/warned in the UI | Restrict tool/MCP attachment to models known to support tool-calling well | Found during verification: the free local default model (`llama3.2:latest`) doesn't reliably invoke attached tools (claims it "can't search" rather than calling Exa) — a real limitation, but out of scope to solve now; noted as an open question instead of blocking the feature. |
| Access to candidates beyond the 15-per-section cap | A "Search something else" card per section opens a modal over the *entire* uncapped catalog for that category (`GET /api/ecosystem/catalog`, paginated + text-searchable) | Raise or remove the cap in the analyze prompt itself | The cap exists to protect the analyze LLM call from an oversized prompt (see the cap's own decision row below); a separate uncapped *browse* path lets a user reach anything in the catalog without touching that constraint. Selections from the modal are merged into the section's option list client-side only — nothing is written back to `catalog_entries`. |
| Per-item vs per-section rationale | Analyze schema carries `recommendations: { id, rationale }[]` — one short rationale per recommended item | Keep the single per-section `rationale` string only | A section-level blurb can't explain *why this specific card* over another one in the same tray; per-item rationale is shown on that card while selected, giving a concrete reason tied to what the user actually picked. The existing section-level `rationale` is kept alongside it as the tray's subtitle. |
| Dashboard/Marketplace build order | UI first, entirely against static mock data (`src/lib/mock-data.ts`); schema/API work deferred | Build the `role` column + `pipeline_runs` table and real queries first, then the UI | Explicit user call mid-implementation — the schema/seed edits were already drafted when the user paused to validate layout and content (including several rounds of iterating on business-process copy) before committing to a data model. |
| Landing route | `/` becomes the Dashboard now; the old single-page builder moved to `/builder` | Leave `/` as the builder, add the Dashboard at a new `/dashboard` path | User confirmed wanting `/` to literally be the landing screen, accepting the risk of colliding with a concurrent session's in-flight edits to the builder's run code — mitigated by the move being a pure file relocation, no logic changes. |
| Auth (Dashboard/Marketplace) | Mocked via a single `getCurrentUser()` seam (`src/lib/auth.ts`), `async` on purpose | Wire a real auth provider (e.g. Clerk via Vercel Marketplace) as part of this pass | Keeps scope to the two screens; every call site already awaits the result, so swapping in a real session lookup later is a same-signature change. |
| "Agent pools" definition | Categorized groupings to build a flow from, shown two ways — **Capabilities** (mirrors the existing `catalog_task_categories`/`catalog_entry_categories` tables) and **Roles** (a new business-function taxonomy: Customer Support, Sales, Engineering, Customer Experience) | "Agent pools" = saved/named pipeline configs | User's explicit clarification when the term was ambiguous — not related to the Ecosystem builder's "Build flow" output. |
| Business-process content generation | Hand-drafted collaboratively in conversation (16-20 items per Role, phase-classified into Pre/Work/Post, iterated over several rounds) then hardcoded into mock data | Generate the process list via an LLM call at request/render time | The content needed multiple rounds of human judgment (add more items, reorder by phase, rebalance an underrepresented phase) that a live LLM call wouldn't reliably reproduce; a reviewed static list was the right fit for this first pass. |
| Pool card interaction | Click-to-expand in place, accordion-style per card (several can be open at once), showing mapped agents and/or the Pre/Work/Post breakdown | A separate detail sidebar/modal, matching the Marketplace agent card's pattern | The content (short bullet lists) doesn't need the extra real estate a sidebar gives a full agent persona — inline expansion is lighter-weight and keeps pool cards scannable in the grid. |
| Support Agent / Code Reviewer Agent placement | Excluded from the Marketplace's flat "Tasks Agents" grid; shown only under the Engineering pool | List every agent in both the flat grid and any pool mapping | Explicit user scoping call — these two conceptually belong to a specific business capability, not the general task-agent list. |

---

## Open questions

- [ ] Should `GET /api/pipeline/runs` support filtering/pagination from day one, or start minimal? (`001_run_history.sql` migration itself is still unwritten — will use Drizzle now that the tooling question is resolved)
- [ ] Vercel project's GitHub auto-deploy connection failed on `vercel link` — retry or leave as local-dev-only for now?
- [ ] Does the History tab need a run detail view (click a run → see full per-step breakdown), or is the list with nested steps sufficient at this scale?
- [ ] Should the 15-per-block/15-per-group candidate cap become relevance-ranked (task category match, cost, recency) instead of alphabetical?
- [ ] Worth widening `RUNNABLE_LANGUAGE_PROVIDERS`/`RUNNABLE_EMBEDDING_PROVIDERS` (currently just openai/anthropic) if more providers get added to `src/lib/providers.ts`'s registry?
- [ ] GitHub MCP's real success path is untested (only the clean "Missing GITHUB_TOKEN" failure path was verified) — needs a real token to confirm end-to-end.
- [ ] Should the UI surface a warning when an attached Tool/MCP server is paired with an Agent whose model has weak tool-calling support (confirmed: the free local default doesn't reliably call tools)?
- [ ] When should the drafted `role` column + `pipelineRuns` table (in `src/db/schema.ts`, not yet pushed) actually be applied, and the Dashboard/Marketplace switched from `src/lib/mock-data.ts` to real queries/API routes?
- [ ] Is "Roles" (Customer Support/Sales/Engineering/Customer Experience) a taxonomy that deserves its own DB table (mirroring `catalog_task_categories`), or does it map onto something else once this becomes real?
- [ ] Only Engineering has a real agent mapping and only the 4 Role pools have Pre/Work/Post content — Capability pools have neither. Worth adding equivalent content there, or is Capabilities meant to stay summary-only?
- [ ] Should a pool card's Pre/Work/Post items ever link to specific catalog agents/ids, or stay freeform descriptive text?
- [ ] A few phase classifications (Pre vs. Work vs. Post) flagged as genuinely ambiguous during content drafting — e.g. "Summarize discovery calls into CRM notes" (Sales, called Work) and "Recommend proactive outreach for customers nearing renewal" (CX, called Pre) — still open, not yet revisited with the user.
- [x] ~~The built flow's textarea still shows the default placeholder prompt, not the Ecosystem challenge text~~ — resolved: seeded from `refinedGoal` when a flow is built via Ecosystem
- [x] ~~Should `hook`/`rag-pattern`/`mcp-server` catalog entries ever become selectable in the Ecosystem flow?~~ — resolved: Tools (`hook`), MCP servers, and RAG sources are all now selectable/attachable to the Agent step (Ecosystem builder v2)

---

## Out of scope

- Real external search API for the original `call-tool` mock pipeline step (stub only — distinct from Ecosystem's real Exa "Web Search" tool)
- Real execution for any catalog entry beyond the 3 flagged (`exa-search`, `github-mcp`, `local-rag`) — other tools/MCP servers/RAG patterns stay catalog-only/decorative
- A browsing UI for the catalog outside of Ecosystem's analyze → cards flow
- Auth/rate-limiting on any route
- Editing/deleting past runs once persisted
- Multi-tenancy, per-user auth/scoping (V2 — see PRD Non-goals)
- Retrying a failed step mid-chain, or resuming a chain from where it stopped
- Real persistence for the Dashboard/Marketplace (agent pools, results, the drafted `role` column) — mock data only in this pass; see Open questions
- Real auth for the Dashboard/Marketplace — mocked via a hardcoded `getCurrentUser()`
- Wiring the History tab to real run data — still its own separate placeholder, unrelated to the new (also mock) Dashboard Results section
- Process-phase (Pre/Work/Post) content for Capability pools, or agent mappings for any pool beyond Engineering
