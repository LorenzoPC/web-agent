# Backlog — web-agent

**Last reviewed:** 2026-07-17

Priority definitions:
- **P1** — Blocking. Must be resolved before the next major milestone.
- **P2** — Important. Should ship in the current cycle.
- **P3** — Nice to have. Revisit when P1 and P2 are clear.

---

## P1 — Blocking

- [ ] **Create `src/app/api/pipeline/run/route.ts`** — POST handler: resolve step by id, dispatch to `generateText` (chat), `embed` (embedding), or a stub (external), return `{ output, usage }`. See design doc's API surface + architecture sections.
- [ ] **Rewrite `src/app/page.tsx`** — replace the create-next-app scaffold with the pipeline step list: render `MOCK_PIPELINE` (name, source, projected cost via `stepCost`), a "Run" action per step that POSTs to `/api/pipeline/run` and shows `actualCost` once it resolves, and a running total that shifts from projected to actual as steps complete.
- [ ] **Document required env vars** — `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_MODEL_BASE_URL` (defaults to Ollama's `:11434`), `REMOTE_MODEL_BASE_URL`, `REMOTE_MODEL_API_KEY`. Add a `.env.local.example` (not committed with real values).

## P2 — Important

- [ ] **Verify end-to-end**: `npm run dev`, confirm the pipeline list renders with projected costs matching current `MOCK_PIPELINE` math; with `OPENAI_API_KEY` set, run `generate-response` and confirm streamed/returned output + real token-based cost; with no local Ollama running, confirm the `local` step's "Run" fails with a clear error, not a crash.
- [ ] **Typecheck + lint**: `npm run lint` and `next build` (or `tsc --noEmit`) clean with the new `CostModel`/`ActualUsage` types.

## P3 — Nice to have

- [ ] **Real search API for `call-tool`** — needs a provisioned integration (Vercel Marketplace), separate from the execution architecture itself.
- [ ] **Run history persistence** — currently each run's output/cost is shown live only; no storage. Open question in the PRD.
- [ ] **Auth/rate-limiting on `/api/pipeline/run`** — fine to skip while this stays local/single-user.

---

## Done

- [x] **`CostModel`/`ActualUsage`/`modelRef` added to `src/lib/types.ts`** — shipped 2026-07-17
- [x] **`stepCost`/`actualCost` implemented in `src/lib/pipeline-data.ts`**, `MOCK_PIPELINE` updated with real model refs and a new `rerank-candidates` (remote/duration) step — shipped 2026-07-17
- [x] **`src/lib/providers.ts` provider registry** (local/remote via `@ai-sdk/openai-compatible`, api via `@ai-sdk/openai`/`@ai-sdk/anthropic`) — shipped 2026-07-17
- [x] **Architecture design doc** — [`implementation_foundation.md`](implementation_foundation.md), PRD — [`../prds/pipeline-execution.md`](../prds/pipeline-execution.md) — 2026-07-17
