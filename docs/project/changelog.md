# Changelog — web-agent

All notable changes to this project. Newest first, grouped by epoch or version.

Format per entry: **Added** (new features), **Changed** (modifications to existing behaviour), **Fixed** (bug fixes), **Removed** (removed features).

---

## Unreleased

### Added
-

---

## Pipeline execution & cost accounting — 2026-07-17

### Added
- `src/app/api/pipeline/run/route.ts` — server-side Route Handler that resolves a pipeline step's model via a shared AI SDK provider registry and executes it (`generateText` for chat steps, `embed` for embedding steps, a stub for the external search step)
- `src/lib/providers.ts` — provider registry unifying local/remote hardware (OpenAI-compatible endpoints, e.g. Ollama or a rented GPU box) and API steps (`@ai-sdk/openai`, `@ai-sdk/anthropic`) behind one `LanguageModel` interface
- `CostModel` discriminated union (`free` / `duration` / `tokens` / `perRequest`) and `ActualUsage` type in `src/lib/types.ts`, plus `actualCost()` in `src/lib/pipeline-data.ts` — replaces the old flat `unitCost * estimatedUnits` projection with per-source-type real cost reconciliation
- `rerank-candidates` mock step (source: `remote`) — added so the `duration` cost model (rented-GPU wall-clock billing) has something to exercise
- Pipeline UI in `src/app/page.tsx` — renders each step with projected cost, a "Run" button that calls the route handler, and the actual cost once a run completes
- `.env.example` documenting `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LOCAL_MODEL_BASE_URL`, `REMOTE_MODEL_BASE_URL`, `REMOTE_MODEL_API_KEY`
- `docs/` — PRD, design doc, and backlog for this feature

### Changed
- `src/lib/types.ts` — `PipelineStep.unitCost: number` replaced with `cost: CostModel`; added `stepKind` and `modelRef`
- `src/lib/pipeline-data.ts` — `stepCost()` rewritten to project per `CostModel.kind` instead of a flat multiply

---

## Foundation — pre-2026-07-17

### Added
- Next.js 16 (App Router) scaffold via `create-next-app`, Tailwind CSS, Geist fonts
- Initial `PipelineStep`/`MOCK_PIPELINE` data model (`src/lib/types.ts`, `src/lib/pipeline-data.ts`) — not yet wired to any UI or execution
