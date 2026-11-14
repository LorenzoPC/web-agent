# Backlog — web-agent

**Last reviewed:** 2026-11-11

Priority definitions:
- **P1** — Blocking. Must be resolved before the next major milestone.
- **P2** — Important. Should ship in the current cycle.
- **P3** — Nice to have. Revisit when P1 and P2 are clear.

---

## P1 — Blocking

- [ ] **Proper environment handling — move to centralized storage.** Env vars/secrets (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `EXA_API_KEY`, `GITHUB_TOKEN`, etc.) currently live only in per-machine `.env.local` files pulled via `vercel env pull`. Needs a real plan for centralized management as the number of integrations grows (this session alone added 3: Neon, Exa, and a user-supplied GitHub token) — e.g. Vercel's env vars as the single source of truth with a documented pull/sync workflow, rather than ad hoc `.env.local` drift per developer.

## P2 — Important

- [ ] **`runId` on `/api/pipeline/run`** — client generates one `crypto.randomUUID()` per chain (or per isolated single-step run) and sends it on every call; needed before run history can group step results under a run.
- [ ] **Run history persistence** — `pipeline_runs` + `pipeline_run_steps` tables (parent/child, see design doc's Data model section) in the now-provisioned Neon database, via Drizzle; write on each `/api/pipeline/run` call; `GET /api/pipeline/runs` for the Builder's Run history to read back.
- [ ] **Fix Vercel project's GitHub auto-connect** — `vercel link` created the project but failed to connect `LorenzoPC/web-agent`; deploys currently need to go through the CLI/dashboard manually, or retry the connection.
- [ ] **Relevance-ranked candidates for the analyze prompt** — currently a flat 15-per-group alphabetical cap (`src/lib/catalog-db.ts`); rank by task-category match to the challenge (or cost, or recency) instead once the catalog grows further. Note: the LLM-recommended cap itself is unchanged by the new "Search something else" full-catalog modal — that's a separate, uncapped *browse* path, not a fix to the prompt's candidate selection. On hold: no screen calls the analyze route since the Ecosystem tab was removed (2026-11-01).
- [ ] **Verify GitHub MCP's real success path** — only the clean "Missing GITHUB_TOKEN" failure was tested (no token available this session); needs a real PAT to confirm end-to-end.
- [ ] **Apply the drafted Dashboard/Marketplace schema and switch off mock data** — `role` column on `catalog_entries` + `pipelineRuns` table are already drafted in `src/db/schema.ts` (not pushed); `scripts/seed-catalog-agents.ts` already has a `role` per curated agent ready to backfill. Once pushed: build `getMarketplaceAgents()`/`getAgentPools()`/`persistRun()`/`listRecentRuns()`, the `/api/marketplace/agents`, `/api/dashboard/pools`, `/api/runs` routes, and the small additive persistence hook in `pipeline-tab.tsx` (all designed, not yet built — see the approved plan this was paused from). Replaces `src/lib/mock-data.ts` in `src/app/page.tsx` and `src/app/marketplace/page.tsx`. The redesigned Dashboard also needs sources for its metrics, notifications, priorities, and coverage counts, none of which the drafted schema covers yet.
- [ ] **Dashboard: decide what the "+" and the inert priority actions do** — on both screens, "Delegate to an agent", "Add to roadmap", "Approve", "Ship v12", "Revert model", etc. render but have no behavior yet; the Product screen's systems heartbeat also has no real health checks behind it.
- [ ] **Define a real "Roles" taxonomy** — Capabilities pools already have a DB home (`catalog_task_categories`/`catalog_entry_categories`); Roles (Customer Support, Sales, Engineering, Customer Experience) don't yet. Needs a table + a real agent→role mapping before the Marketplace's Roles view can read from the database.
- [ ] **Populate Capability-pool content** — only the 4 Role pools have mapped agents/Pre-Work-Post process content today; Capability pools (NLP, Agentic Tool Use, etc.) have neither.
- [ ] **Confirm and apply the Context transcript revision before building the Flow tab** — `pattern_libraries.md` assumed the chain-runner needs no changes; `agentic_component_enhancement.md`'s Context section proposes each slot receive the full running transcript of prior steps, not just the immediately-prior output. Changes `pipeline-tab.tsx`'s `runPipeline` loop. Needs sign-off before the Flow tab is built on top of the old assumption.
- [ ] **Confirm and apply the Policy/Instruction resolution split before building the Flow tab's prompt-picker** — `agentic_component_enhancement.md`'s Policies section proposes `prompts.kind: "instruction" | "policy"`, with policies composing additively across every matching scope level instead of falling back to one match like instructions do. Affects the drafted `prompts` schema, `MockPrompt`, and the not-yet-built prompt-resolution logic for pattern slots.
- [ ] **Builder: AI-generated Explore proposal** — "Explore how to build this" (`src/components/pipeline/explore-panel.tsx`) builds its proposal client-side in `proposeFlow()`: always a text step, plus the first image, voice or video option whose group `keywords` appear in the idea (`MOCK_MODEL_TYPE_GROUPS` in `src/lib/mock-data.ts`). Replace it with a server route where a model picks and orders steps from those groups, with a one-line reason per step. Follow `/api/ecosystem/analyze`'s pattern: `generateText` + `Output.object`, ids validated server-side, model from `ECOSYSTEM_ANALYZE_MODEL` (defaults to the free local `llama3.2:latest`). Keep the keyword match as the fallback when the call fails or returns no valid ids. The panel's layout, per-step Add and "Add all to pipeline" stay as they are.
- [ ] **Builder: run image, voice and video steps for real** — the 30 image, voice and avatar & video options in `MOCK_MODEL_TYPE_GROUPS` are `stepKind: "external"`, so `/api/pipeline/run` only returns `[stub] would call …`, and their prices are placeholders. The installed AI SDK (7.0.16) has `generateImage`, `generateSpeech` and `experimental_generateVideo`, and `@ai-sdk/gateway` is installed; AI Gateway covers image and video generation. Start with one provider per group: add step kinds for the media types, show the result in the step card (image, audio player, video), and replace placeholder prices with real ones. These are paid services, so confirm each provider with the user before wiring it. Avatar presenters (HeyGen) and the self-hosted options (FLUX.1 [dev] and [schnell], SDXL, Qwen-Image, XTTS v2, Kokoro, Chatterbox, Piper, Wan 2.1, LTX-Video) likely need their own integrations rather than the gateway. Chaining needs a decision too: a media step's output isn't text, so decide what the next step receives (the original prompt, a caption, or a file URL).
- [ ] **Decide how the Builder's orchestration patterns relate to Flow Patterns, and where slot binding goes.** The Builder shows 6 orchestration patterns (`MOCK_ORCHESTRATION_PATTERNS` in `src/lib/mock-orchestration-data.ts`: who leads, who talks to whom, where the loops are). `/patterns` shows 9 linear Flow Patterns (`MOCK_FLOW_PATTERNS`: ordered task slots). Two different ideas both called "pattern" will confuse people. Options: keep both under clearer names (say "flow templates" and "orchestration patterns"), show both on `/patterns`, or model a Flow Pattern as a topology plus its slots. Decide it together with where slot binding lives: `pattern_libraries.md` planned a "Flow" tab between Ecosystem and Pipeline, but the Builder has had no tabs since 2026-11-01. One candidate is a section of the one-page Builder, next to Orchestration pattern. This blocks the Flow work, along with the two corrections above.

## P3 — Nice to have

- [ ] **Real search API for the original `call-tool` mock pipeline step** — needs its own provisioned integration; distinct from the catalog's real Exa "Web Search" tool, which works in `/api/pipeline/run` though no screen attaches it since the Ecosystem tab was removed (2026-11-01).
- [ ] **Auth/rate-limiting on `/api/pipeline/run`** — fine to skip while this stays local/single-user (multi-tenancy is V2, see PRD).
- [ ] **Grow the curated catalog further** — 25 hand-written entries today (2 services + 3 local models + 6 agents + 13 hooks/tools + 4 RAG patterns + 3 MCP servers); still a starting set, not exhaustive.
- [ ] **Widen runnable gateway providers** — `scripts/sync-catalog-models.ts` only marks `openai`/`anthropic` language models and `openai` embedding models as runnable (`blockType` set), matching today's registry; revisit if `src/lib/providers.ts` adds more direct provider SDKs.
- [ ] **Surface a tool-calling-reliability warning** — the free local default agent model (`llama3.2:latest`) doesn't reliably invoke attached tools (confirmed: claims it "can't search" rather than calling Exa). Proposed as a UI badge in `agentic_component_enhancement.md`'s Reasoning section; still needs an actual allowlist of "known good" tool-calling `modelRef`s defined somewhere.
- [ ] **Tool "runs for real" vs. "decorative" badge** — 11 of 13+ catalog tools/MCP servers/RAG patterns are catalog-only with no UI indication; `metadata.executor` already flags which ones execute. Proposed in `agentic_component_enhancement.md`'s Tools section.
- [ ] **Per-slot done-condition field** — Flow Pattern slots currently only carry `defaultInstructions`; `agentic_component_enhancement.md`'s Goals section proposes a separate one-line done-condition, distinct from the instructions themselves.
- [ ] **Standing reference doc per Business Unit/Role** — a lightweight V1.5 memory candidate reusing the existing RAG mechanics, proposed in `agentic_component_enhancement.md`'s Memory section; depends on Business Units being real (persisted) tables first.
- [ ] **Human-set `criteriaMet` on a completed run** — lets a person tag a run against its `successCriteria` after the fact (yes/partial/no); proposed in `agentic_component_enhancement.md`'s Evaluation section. Depends on real run persistence landing first (still mock today).
- [ ] **Retry on malformed analyze responses** — recommendation groups occasionally still return a glitched response (e.g. a stray token fragment or empty string as an item's rationale, or — seen on the bundled goal+blocks+agent call specifically — no valid ids at all, falling back to the generic "A solid default option for your goal." rationale) even fully isolated into its own call; a one-time retry could smooth this over. Accepted as known flakiness for now — every section stays manually selectable either way. On hold while no screen calls the analyze route.
- [ ] **Read the Marketplace's MCP & Tools view from the catalog database.** It shows mock data mirroring the curated seed (`src/lib/mock-marketplace-data.ts`), not the `hook`/`rag-pattern`/`mcp-server` rows themselves. Undecided whether this is worth doing before the rest of the Marketplace moves off mock data.
- [ ] **Revisit flagged Pre/Work/Post phase classifications** — a handful of business-process items were genuinely ambiguous when drafted (e.g. "Summarize discovery calls into CRM notes" called Work, "Recommend proactive outreach for customers nearing renewal" called Pre) — flagged in chat, not yet re-reviewed with the user.
- [ ] **Real auth for the Dashboard/Marketplace** — currently a hardcoded `getCurrentUser()` (`src/lib/auth.ts`); revisit once/if these screens need to be more than single-user (see PRD Non-goals on multi-tenancy).
- [ ] **Builder: make the orchestration pattern change how the pipeline runs.** "Use this pattern" only sets `inUseId` in `pattern-picker.tsx`; `runPipeline` in `pipeline-tab.tsx` still runs the steps in order. Running a pattern for real needs a role per step (which step is the manager, critic, planner or judge), an orchestrator, limits (rounds, hops), and a cost projection that multiplies by rounds or workers. The client-side loop could handle a critic loop or a manager-worker fan-out; blackboard and swarm need shared state, likely server-side. Start with one pattern, probably the critic / red-team loop, since it fits the current loop. Most of these shapes are V2 in `pattern_libraries.md` (V1 is linear only), so this needs a scope decision first. It also depends on the Context transcript revision (P2). Mockup first: design how steps get their roles before changing the runner.
- [ ] **Builder: "Add a step" opens a picker.** The dashed card after the last step scrolls down to Add a model step, past Orchestration pattern and Run pipeline. Replace the scroll with a picker in place (a popover or modal over the model types, reusing `DisplayGrid`), so adding a step doesn't leave the pipeline. Keep Add a model step on the page for browsing.

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
- [x] **Patterns + Prompts screens (UI only, mock data)** — shipped 2026-07-30, plan in `docs/project/pattern_libraries.md`, design refinement in `docs/prds/agentic_component_enhancement.md`:
  - `/patterns` — 9 curated, linear Flow Patterns (`src/lib/mock-data.ts`'s `MOCK_FLOW_PATTERNS`), click-to-expand cards showing ordered slots (`pattern-card.tsx`/`pattern-gallery.tsx`)
  - `src/components/ui/create-new-card.tsx` — generalized the Ecosystem tab's one-off "Search something else" card into a reusable `{label, onClick, width?}` component; now used by the Ecosystem tab (5x), Patterns, and Prompts
  - Local-state-only "Create new pattern" form (`create-pattern-modal.tsx`) — name/description/add-reorder-steps, appends to component state, not persisted; explicit scope note that real/persisted V1 patterns stay curated-only per the original decision
  - `/prompts` — 8 seeded prompts (`MOCK_PROMPTS`), filterable by Business Unit/Role/Task-process (`prompts-library.tsx`), create/edit form (`prompt-form-modal.tsx`), soft-archive toggle (`prompt-row.tsx`), and a **Test panel that calls the real `/api/pipeline/run` endpoint** (`prompt-test-modal.tsx`) — not mocked, reuses the exact execution path the Builder uses
  - `MOCK_BUSINESS_UNITS`/`MOCK_TASK_PROCESSES`/`MOCK_AGENT_ROLES` derived from the already-shipped `MOCK_ROLE_POOLS`/`MOCK_AGENTS` (not hand-duplicated) so Prompts has stable ids to scope against
  - Nav grew to 5 flat items: Dashboard/Marketplace/Patterns/Prompts/Builder
  - Follow-up gap analysis against a fuller agent mental model (Reasoning/Goals/Tools/Context/Memory/Policies/Evaluation) produced `agentic_component_enhancement.md`, proposing two corrections (chain transcript instead of prior-step-only context; policy/instruction resolution split) that should land before the next piece (a new Builder "Flow" tab) is built — tracked above under P2
- [x] **Dashboard redesign (UI only, mock data)** — shipped 2026-10-23, see design doc's "Dashboard redesign" for full detail:
  - Top row: Metrics stat tiles (left third, `metric-tiles.tsx`) beside a Newsfeed of notification headers (right two-thirds, `news-feed.tsx`) that scrolls to the tiles' height on wide screens
  - Full-width row of 5 ranked Top priorities (`priority-cards.tsx`): about five lines of context, two text actions, a "+" button (no behavior yet)
  - Bottom: Agentic capability coverage by business unit × Pre/Work/Post (`coverage-section.tsx`), stacked live/piloting/not-covered bars with an "All units" total row
  - Old `results-section.tsx` removed; `MOCK_RUNS` now feeds the newsfeed as run headers (dates moved to Oct 2026 so they sit among the other notifications)
  - New mock data: `MOCK_METRICS`, `MOCK_NOTIFICATIONS`, `MOCK_PRIORITIES`, `MOCK_UNIT_COVERAGE` (totals derived from `MOCK_TASK_PROCESSES`)
- [x] **Dashboard Product screen (UI only, mock data)** — shipped 2026-10-23, see design doc's "Dashboard — Product screen":
  - `/product`, reached via Overview/Product tabs (`dashboard-tabs.tsx`); app nav keeps Dashboard highlighted
  - Function switcher stored in the URL (`link-toggle.tsx`), which reloads metrics, the newsfeed (chips name the source function), and the top 5 priorities ("+" = Add to roadmap / Delegate to an agent)
  - Systems heartbeat top right (`system-heartbeat.tsx`): red/yellow/green per service, problems first, summary counts
  - Coverage toggle: Our customers (share of workspaces) / Our team (process counts); the viewer's own function row is marked
  - Mock data in `src/lib/mock-product-data.ts`; shared section components gained small props (descriptions, "+" label, coverage row header/total label/format/highlight)
- [x] **Services catalog (UI only, mock data)**: shipped 2026-11-01, see design doc's "Services catalog":
  - Public `/services`: how the hub works, services by team (filter in `?team=`), what every service includes
  - `/services/[slug]`: facts row, How it works steps with human checkpoints, Built from, Connects to, controls, prerequisites, related services
  - Cost estimator (`cost-estimator.tsx`): our cloud / your cloud account / your hardware, times a monthly volume
  - Mock data in `src/lib/mock-services-data.ts`: 8 services, 2 per team
- [x] **Conversation panel follow-ups** (shipped 2026-11-03):
  - Agent replies render as GitHub-flavored Markdown (`message-markdown.tsx`, new deps `react-markdown` + `remark-gfm`). Wide tables scroll sideways, raw HTML shows as text, and images aren't fetched (shown as `[alt]`), so a reply can't load a third-party URL
  - Flow phases suggest an agent: the Flow prompt writes an `AGENT:` role after each `NEXT:`, matched against the agents' roles, and each phase card offers a one-click Switch (or shows "Current"). llama3.2 named a valid role in most test runs; when it doesn't, the card shows no switch
  - Two flow phases per row: the intent gets its own row and the two next phases sit side by side as cards
  - Recommended actions hide after a failed or stopped reply, until the next successful one
  - The Key points/Flow model is resolved server-side from `CONVERSATION_ANALYSIS_MODEL` (default `local > llama3.2:latest`) by a new `/api/conversation/analyze` route. If that model fails, the route retries on the chat agent's own model, and the section header shows "via {agent} · {cost}"
- [x] **Marketplace views (UI only, mock data)**: shipped 2026-11-03, see design doc's "Marketplace views":
  - The page title switches between Agent, Model, and MCP & Tools Marketplace (`marketplace-header.tsx`), with the view in `?view=`
  - Model Marketplace (`model-marketplace.tsx`): `MOCK_MODEL_TYPE_GROUPS`, one section per output type
  - MCP & Tools Marketplace (`mcp-tools-marketplace.tsx`): curated MCP servers and tools from `src/lib/mock-marketplace-data.ts`, with links to Create MCP server (admin) and Create tool
  - The agent pools toggle now reads Roles | Capabilities and opens on Roles
- [x] **Builder as one page**: shipped 2026-11-01, see design doc's "Builder as one page":
  - Removed the Ecosystem / Pipeline / History switcher, `ecosystem-tab.tsx`, `catalog-search-modal.tsx` and `selectable-card.tsx`. `history-tab.tsx` became `run-history.tsx`, a section below the pipeline. `/api/ecosystem/*` and the catalog database stay
  - `display-grid.tsx`: a display card beside a grid of compact cards, for Pipeline steps and each model type
  - `MOCK_MODEL_TYPE_GROUPS` grew to 10 options per model type (placeholder prices); Claude Haiku's model id fixed to `claude-haiku-4-5`
  - Page widened to 1280px (`max-w-7xl`) with less padding
- [x] **Builder: Add a step card and orchestration patterns (UI only, mock data)**: shipped 2026-11-03:
  - A dashed "Add a step" card after the last step scrolls to Add a model step (`DisplayGrid` gained `trailing` and `gridClassName`)
  - Orchestration pattern section (`pattern-picker.tsx`, `pattern-diagram.tsx`, `src/lib/mock-orchestration-data.ts`): 6 patterns with topology diagrams; "Use this pattern" is mock only
- [x] **Services in the landing theme, linked from the landing page (UI only, mock data)**: shipped 2026-11-11, see design doc's "Services in the landing theme":
  - `/services` and `/services/[slug]` restyled with the landing theme: coral hero, splits with ruled lists, light blue band, navy close
  - Services render as rows in ruled lists (`service-row.tsx`, replacing `service-card.tsx`)
  - Landing page: Services section under the hero with four featured services (`FEATURED_SERVICE_SLUGS`) and an All services link
- [x] **Sitemap routes**: shipped 2026-11-11, see design doc's "Sitemap routes":
  - Client workspace: `/dashboard` → `/app`, `/marketplace` → `/app/marketplace`, `/onboarding` → `/app/onboarding`
  - Admin: `/product` → `/admin`, `/builder` → `/admin/agents/new`, and `/patterns`, `/prompts`, `/tools/new`, `/mcp-servers/new` under `/admin`
  - Old URLs redirect (temporary 307, query kept) from `next.config.ts`; every internal link, the nav, Dashboard tabs, quick actions and mock-data actions point at the new routes
  - `routeAudience()` reads the sitemap area from the path prefix instead of a route table
