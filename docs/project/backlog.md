# Backlog — web-agent

**Last reviewed:** 2026-07-30

Priority definitions:
- **P1** — Blocking. Must be resolved before the next major milestone.
- **P2** — Important. Should ship in the current cycle.
- **P3** — Nice to have. Revisit when P1 and P2 are clear.

---

## P1 — Blocking

- [ ] **Proper environment handling — move to centralized storage.** Env vars/secrets (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `EXA_API_KEY`, `GITHUB_TOKEN`, etc.) currently live only in per-machine `.env.local` files pulled via `vercel env pull`. Needs a real plan for centralized management as the number of integrations grows (this session alone added 3: Neon, Exa, and a user-supplied GitHub token) — e.g. Vercel's env vars as the single source of truth with a documented pull/sync workflow, rather than ad hoc `.env.local` drift per developer.

## P2 — Important

- [ ] **`runId` on `/api/pipeline/run`** — client generates one `crypto.randomUUID()` per chain (or per isolated single-step run) and sends it on every call; needed before run history can group step results under a run.
- [ ] **Run history persistence** — `pipeline_runs` + `pipeline_run_steps` tables (parent/child, see design doc's Data model section) in the now-provisioned Neon database, via Drizzle; write on each `/api/pipeline/run` call; `GET /api/pipeline/runs` for the History tab to read back.
- [ ] **Fix Vercel project's GitHub auto-connect** — `vercel link` created the project but failed to connect `LorenzoPC/web-agent`; deploys currently need to go through the CLI/dashboard manually, or retry the connection.
- [ ] **Relevance-ranked candidates for the analyze prompt** — currently a flat 15-per-group alphabetical cap (`src/lib/catalog-db.ts`); rank by task-category match to the challenge (or cost, or recency) instead once the catalog grows further. Note: the LLM-recommended cap itself is unchanged by the new "Search something else" full-catalog modal — that's a separate, uncapped *browse* path, not a fix to the prompt's candidate selection.
- [ ] **Verify GitHub MCP's real success path** — only the clean "Missing GITHUB_TOKEN" failure was tested (no token available this session); needs a real PAT to confirm end-to-end.
- [ ] **Apply the drafted Dashboard/Marketplace schema and switch off mock data** — `role` column on `catalog_entries` + `pipelineRuns` table are already drafted in `src/db/schema.ts` (not pushed); `scripts/seed-catalog-agents.ts` already has a `role` per curated agent ready to backfill. Once pushed: build `getMarketplaceAgents()`/`getAgentPools()`/`persistRun()`/`listRecentRuns()`, the `/api/marketplace/agents`, `/api/dashboard/pools`, `/api/runs` routes, and the small additive persistence hook in `pipeline-tab.tsx` (all designed, not yet built — see the approved plan this was paused from). Replaces `src/lib/mock-data.ts` in `src/app/page.tsx` and `src/app/marketplace/page.tsx`.
- [ ] **Define a real "Roles" taxonomy** — Capabilities pools already have a DB home (`catalog_task_categories`/`catalog_entry_categories`); Roles (Customer Support, Sales, Engineering, Customer Experience) don't yet. Needs a table + a real agent→role mapping before the Marketplace's Roles view can read from the database.
- [ ] **Populate Capability-pool content** — only the 4 Role pools have mapped agents/Pre-Work-Post process content today; Capability pools (NLP, Agentic Tool Use, etc.) have neither.

## P3 — Nice to have

- [ ] **Real search API for the original `call-tool` mock pipeline step** — needs its own provisioned integration; distinct from Ecosystem's real Exa "Web Search" tool, which is now live.
- [ ] **Auth/rate-limiting on `/api/pipeline/run`** — fine to skip while this stays local/single-user (multi-tenancy is V2, see PRD).
- [ ] **Grow the curated catalog further** — 25 hand-written entries today (2 services + 3 local models + 6 agents + 13 hooks/tools + 4 RAG patterns + 3 MCP servers); still a starting set, not exhaustive.
- [ ] **Widen runnable gateway providers** — `scripts/sync-catalog-models.ts` only marks `openai`/`anthropic` language models and `openai` embedding models as runnable (`blockType` set), matching today's registry; revisit if `src/lib/providers.ts` adds more direct provider SDKs.
- [ ] **Surface a tool-calling-reliability warning** — the free local default agent model (`llama3.2:latest`) doesn't reliably invoke attached tools (confirmed: claims it "can't search" rather than calling Exa); consider flagging this in the UI when a weak-tool-calling model is paired with Tools/MCP attachments.
- [ ] **Retry on malformed analyze responses** — recommendation groups occasionally still return a glitched response (e.g. a stray token fragment or empty string as an item's rationale, or — seen on the bundled goal+blocks+agent call specifically — no valid ids at all, falling back to the generic "A solid default option for your goal." rationale) even fully isolated into its own call; a one-time retry could smooth this over. Accepted as known flakiness for now — every section stays manually selectable either way.
- [ ] **A browsing UI for `hook`/`rag-pattern`/`mcp-server` catalog data outside the Ecosystem flow** — undecided whether this is worth building.
- [ ] **Revisit flagged Pre/Work/Post phase classifications** — a handful of business-process items were genuinely ambiguous when drafted (e.g. "Summarize discovery calls into CRM notes" called Work, "Recommend proactive outreach for customers nearing renewal" called Pre) — flagged in chat, not yet re-reviewed with the user.
- [ ] **Real auth for the Dashboard/Marketplace** — currently a hardcoded `getCurrentUser()` (`src/lib/auth.ts`); revisit once/if these screens need to be more than single-user (see PRD Non-goals on multi-tenancy).

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
- [x] **Ecosystem builder v2** (Agents, Tools, MCP servers, RAG sources, refined goal, success criteria) — shipped 2026-07-21, see design doc's "Ecosystem builder v2" section:
  - `systemPrompt` column on `catalog_entries`; `scripts/seed-catalog-agents.ts` (6 curated personas); curated hooks grown 3→13 (`"Web Search"` marked `metadata.executor: "exa-search"`); GitHub MCP entry marked `"github-mcp"`; new "Local documents (real)" RAG entry marked `"local-rag"`
  - `src/lib/catalog-db.ts` extended with `getAgentOptions`/`getCatalogCardsByKind`
  - Real execution helpers: `src/lib/tools/exa-search.ts`, `github-mcp.ts`, `local-rag.ts` — all three verified working (Exa confirmed via direct API test + real current results; GitHub MCP confirmed correctly wired via its clean "Missing GITHUB_TOKEN" failure path; local RAG fully verified end-to-end with a planted-fact test)
  - `PipelineStep` extended with `systemPrompt`/`toolRefs`/`mcpServerRefs`/`ragSource`; `/api/pipeline/run` consumes them
  - `/api/ecosystem/analyze` rewritten to 4 focused `generateText` calls (goal+blocks+agent bundled; tools/MCP/RAG each fully isolated) after a bundled/2-group call produced cross-contaminated rationale text on the local default model
  - `src/components/pipeline/ecosystem-tab.tsx` restructured: Agent/Tools/MCP servers/RAG sources sections (reusing the `SelectableCard` compact-card pattern), editable refined-goal and success-criteria boxes
  - Pipeline tab now seeds its input from the Ecosystem `refinedGoal` and displays `successCriteria`
  - Provisioned Exa Search API (Vercel Marketplace) and pulled `nomic-embed-text` locally as part of verification
  - Bug found and fixed: `/api/pipeline/run` previously looked up steps by id from `MOCK_PIPELINE` only, so built-flow steps could never actually run — client now sends the full `PipelineStep` object
- [x] **"Search something else" full-catalog search modal** — shipped 2026-07-22:
  - `src/lib/catalog-db.ts`: `searchCatalogCategory(category, offset, limit, query?)` — uncapped, paginated, optional `ILIKE` text search across name/description/provider; `CATALOG_CATEGORY_COPY` per-category title/subtitle
  - `GET /api/ecosystem/catalog` route backing it
  - `src/components/pipeline/catalog-search-modal.tsx` — modal with header/subtitle, a search box (debounced), and a lazy-loaded card grid (`IntersectionObserver` sentinel fetches the next page)
  - Every Ecosystem section (data source, delivery, agent, tools, MCP servers, RAG sources) ends with a trailing "Search something else" card that opens the modal for that category; picking an item merges it into that section's option list client-side (not persisted) so "Build flow" can still resolve it
  - Verified in-browser via Playwright: modal opens, lists real catalog items, selecting one closes the modal and shows it as a selected card in the tray
- [x] **Per-item rationale on Ecosystem recommendations** — shipped 2026-07-22:
  - `/api/ecosystem/analyze`'s schema changed from `recommendedOptionIds: string[]` to `recommendations: { id, rationale }[]` for every group (blocks, agent, tools, MCP servers, RAG sources); `resolveRecommendations()` replaces `resolveIds()`, falling back to the first N candidates with a generic rationale if the model's ids don't validate
  - Each option card shows its own rationale text (in quotes, italic) while selected, if the analyze response gave one for that specific id
  - Verified in-browser: agent/tools/MCP/RAG groups reliably returned real, item-specific rationale text; the bundled goal+blocks+agent call occasionally fell back to the generic rationale for the two block sections — pre-existing model flakiness on that specific call (see backlog's "Retry on malformed analyze responses"), not a regression
- [x] **Shared `SelectableCard` + 200px/100px card templatizing** — shipped 2026-07-29:
  - `src/components/pipeline/selectable-card.tsx` — the reusable card wrapper (`{as, selected, onSelect, header, children}`), 200px wide selected / 100px unselected, whole card is a button, `children` only rendered while selected; unselected cards show smaller name/cost text
  - Adopted by the Ecosystem tab's option cards and the Pipeline tab's `StepCard` (which gained click-to-focus, since it previously had no selection concept); both tabs' card rows became `flex flex-wrap` so several cards fit per line
  - Card headers on both tabs now show price (left) and source type (right) on the same line
  - Later reused as the base visual language for the Ecosystem builder's `StepOptionCard`/`CardOptionCard` (v2) and, unrelated to this component itself, informed (but is not directly reused by) the Marketplace's `AgentCard`/pool cards below
- [x] **Root cleanup — `drizzle.config.ts` moved into `db/`** — shipped 2026-07-29: relocated from repo root to `db/drizzle.config.ts` (git rename), `schema`/`out` paths confirmed to resolve relative to the invoking CWD (repo root) not the config file's own location; added `npm run db:generate`/`db:push` scripts pointing at the new path so the move doesn't break the usual `drizzle-kit` workflow. `skills-lock.json` deliberately left at root — likely required there by the Claude Code skill installer.
- [x] **Dashboard + Agent Marketplace screens (UI only, mock data)** — shipped 2026-07-30, see design doc's "Dashboard + Agent Marketplace" section for full detail; not yet backed by real persistence (tracked above under P2):
  - Routing: builder moved `/` → `/builder`; `/` now renders the Dashboard; new `/marketplace` page. Shared nav shell (`src/components/shell/app-nav.tsx`) in the now-`async` root `layout.tsx`, active-route highlighting, mock user name via `src/lib/auth.ts`'s `getCurrentUser()`
  - Dashboard (`/`): a Results section listing recent mock pipeline runs (status badge, cost, timestamp, step count), empty-state copy modeled on the History tab's
  - Marketplace (`/marketplace`): "Business Capabilities Agents" (Capabilities/Roles toggle over independently click-to-expand pool cards — `src/components/marketplace/agent-pools-section.tsx`) and "Tasks Agents" (a card grid of individual personas — `agent-card.tsx`/`agent-marketplace.tsx` — opening a right-side `agent-sidebar.tsx` with the full persona on click, mirroring `catalog-search-modal.tsx`'s backdrop-click-to-close pattern)
  - Support Agent and Code Reviewer Agent excluded from the Tasks Agents grid, shown only under the Engineering pool
  - Business-process content: 16-20 processes per Role pool, drafted and iterated in conversation, then classified into **Pre / Work / Post** phases and hardcoded into `src/lib/mock-data.ts`; rendered in each pool card's expanded state alongside any mapped agents (Engineering only, so far)
  - `PipelineStep` gained an optional `role` field; `src/db/schema.ts` gained a drafted-but-unpushed `role` column and `pipelineRuns` table, with a matching backfill drafted in `scripts/seed-catalog-agents.ts` — deliberately not applied yet, see P2
  - Builder's Ecosystem tab textarea label changed from "Describe your challenge" to "Describe your job-to-be-done"
