# Backlog — web-agent

**Last reviewed:** 2026-07-17

Priority definitions:
- **P1** — Blocking. Must be resolved before the next major milestone.
- **P2** — Important. Should ship in the current cycle.
- **P3** — Nice to have. Revisit when P1 and P2 are clear.

---

## P1 — Blocking

*(none currently)*

## P2 — Important

- [ ] **`runId` on `/api/pipeline/run`** — client generates one `crypto.randomUUID()` per chain (or per isolated single-step run) and sends it on every call; needed before run history can group step results under a run.
- [ ] **Run history persistence** — `pipeline_runs` + `pipeline_run_steps` tables (parent/child, see design doc's Data model section) in the now-provisioned Neon database, via Drizzle; write on each `/api/pipeline/run` call; `GET /api/pipeline/runs` for the History tab to read back.
- [ ] **Fix Vercel project's GitHub auto-connect** — `vercel link` created the project but failed to connect `LorenzoPC/web-agent`; deploys currently need to go through the CLI/dashboard manually, or retry the connection.
- [ ] **Relevance-ranked candidates for the analyze prompt** — currently a flat 15-per-block alphabetical cap (`src/lib/catalog-db.ts`); rank by task-category match to the challenge (or cost, or recency) instead once the catalog grows further.

## P3 — Nice to have

- [ ] **Real search API for `call-tool`** — needs a provisioned integration (Vercel Marketplace), separate from the execution architecture itself.
- [ ] **Auth/rate-limiting on `/api/pipeline/run`** — fine to skip while this stays local/single-user (multi-tenancy is V2, see PRD).
- [ ] **Seed the built pipeline's textarea from the Ecosystem challenge text** — currently the Pipeline tab always starts with the default placeholder prompt, even after building a flow from a specific challenge.
- [ ] **Grow the curated catalog** — 14 hand-written entries today (2 services + 3 local models + 3 hooks + 3 RAG patterns + 3 MCP servers); this was a starting set, not exhaustive.
- [ ] **Widen runnable gateway providers** — `scripts/sync-catalog-models.ts` only marks `openai`/`anthropic` language models and `openai` embedding models as runnable (`blockType` set), matching today's registry; revisit if `src/lib/providers.ts` adds more direct provider SDKs.
- [ ] **Surface `hook`/`rag-pattern`/`mcp-server` entries somewhere in the UI** — they're real, categorized catalog data now but have no consumer; a browse view, or a way to reference them from a built flow, is undecided.

---

## Done

- [x] **`CostModel`/`ActualUsage`/`modelRef` added to `src/lib/types.ts`** — shipped 2026-07-17
- [x] **`stepCost`/`actualCost` implemented in `src/lib/pipeline-data.ts`**, `MOCK_PIPELINE` updated with real model refs and a new `rerank-candidates` (remote/duration) step — shipped 2026-07-17
- [x] **`src/lib/providers.ts` provider registry** (local/remote via `@ai-sdk/openai-compatible`, api via `@ai-sdk/openai`/`@ai-sdk/anthropic`) — shipped 2026-07-17
- [x] **`src/app/api/pipeline/run/route.ts`** — POST handler dispatching to `generateText`/`embed`/stub per `stepKind` — shipped 2026-07-17
- [x] **`src/app/page.tsx` pipeline UI** — step list with projected/actual cost and a "Run" action per step — shipped 2026-07-17
- [x] **`.env.example`** documenting `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_MODEL_BASE_URL`, `REMOTE_MODEL_BASE_URL`, `REMOTE_MODEL_API_KEY` — shipped 2026-07-17
- [x] **End-to-end verification** — lint + typecheck clean; confirmed in a real browser (Playwright) that the pipeline renders and the local step reaches Ollama and surfaces a clean error rather than crashing — 2026-07-17
- [x] **`docs/` filled out to bespoke-core minimal tier** (`design/`, `adr/`, `project/changelog.md`, `project/completed/`, `reference/glossary.md`) — 2026-07-17
- [x] **Vercel CLI installed, project linked** (`lorenzopcs-projects/web-agent`) — 2026-07-17
- [x] **Project-level PRD + design doc** ([`../prds/web-agent.md`](../prds/web-agent.md), [`../design/web-agent.md`](../design/web-agent.md)), superseding the feature-scoped pipeline-execution PRD/design (archived to `project/completed/`) — 2026-07-17
- [x] **Tabs UI (Ecosystem / Pipeline / History)** — `src/components/pipeline/` (`pipeline-app.tsx`, `pipeline-tab.tsx`, `history-tab.tsx`, `ecosystem-tab.tsx`, `step-card.tsx`) — shipped 2026-07-17
- [x] **Chained "Run pipeline" action** — client-side loop threading `output` → next `input`, stopping on the first error; per-step "Run" buttons kept alongside it — shipped 2026-07-17
- [x] **Ecosystem builder** — `src/lib/block-catalog.ts` (fixed data-source/processing/delivery taxonomy, real costed catalog options) + `POST /api/ecosystem/analyze` (LLM selects from the catalog, server dedupes/validates against real ids) + card-selection UI + "Build flow" replacing the active pipeline — shipped 2026-07-17
- [x] **Fixed `llama3.2:3b` → `llama3.2:latest`** in `pipeline-data.ts`/`block-catalog.ts` — the referenced tag didn't match what was actually pulled locally, causing "model not found" on every local/remote step run
- [x] **`supportsStructuredOutputs: true` on local/remote providers** (`src/lib/providers.ts`) — without it the AI SDK sent no JSON schema to Ollama, so structured analysis (`generateText` with `Output.object`) failed on small local models
- [x] **`ECOSYSTEM_ANALYZE_MODEL` env var** — defaults to `local > llama3.2:latest`, so the ecosystem builder works with zero paid API keys out of the box
- [x] **Neon Postgres provisioned** (`vercel integration add neon`, project `neon-alizarin-queen`) — 2026-07-17
- [x] **Catalog database** — `src/db/schema.ts` (Drizzle: `catalog_entries`, `catalog_task_categories`, `catalog_entry_categories`), `scripts/sync-catalog-models.ts` (~300 models synced live from the AI Gateway), `scripts/seed-catalog-curated.ts` (14 hand-curated services/local-models/hooks/RAG-patterns/MCP-servers), `src/lib/catalog-db.ts` (`getCatalogOptionsForBlock`), `/api/ecosystem/analyze` updated to read from the database instead of the static file — shipped 2026-07-17
