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

- [ ] **Tabs UI (Pipeline / History)** — restructure `src/app/page.tsx` into two tabs on one page. See design doc's Architecture section.
- [ ] **Chained "Run pipeline" action** — client-side loop over `MOCK_PIPELINE` calling `/api/pipeline/run` per step in order, threading `output` into the next step's `input`, updating each step's card (running → done/error) as it goes, stopping on the first error. Keep the existing per-step "Run" buttons alongside it.
- [ ] **`runId` on `/api/pipeline/run`** — client generates one `crypto.randomUUID()` per chain (or per isolated single-step run) and sends it on every call; needed before run history can group step results under a run.
- [ ] **Provision Neon Postgres** via the Vercel Marketplace (decision made 2026-07-17, see [`../design/web-agent.md`](../design/web-agent.md) key decisions) — not yet provisioned.
- [ ] **Run history persistence** — `pipeline_runs` + `pipeline_run_steps` tables (parent/child, see design doc's Data model section); write on each `/api/pipeline/run` call; `GET /api/pipeline/runs` for the History tab to read back.
- [ ] **Fix Vercel project's GitHub auto-connect** — `vercel link` created the project but failed to connect `LorenzoPC/web-agent`; deploys currently need to go through the CLI/dashboard manually, or retry the connection.

## P3 — Nice to have

- [ ] **Real search API for `call-tool`** — needs a provisioned integration (Vercel Marketplace), separate from the execution architecture itself.
- [ ] **Auth/rate-limiting on `/api/pipeline/run`** — fine to skip while this stays local/single-user (multi-tenancy is V2, see PRD).

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
