# Changelog — web-agent

All notable changes to this project. Newest first, grouped by epoch or version.

Format per entry: **Added** (new features), **Changed** (modifications to existing behaviour), **Fixed** (bug fixes), **Removed** (removed features).

---

## Unreleased

### Added
- `src/lib/mcp-security/`: the MCP authorization layer, as a tested library with no endpoint yet (ADR-0003, and Aembit's "MCP Permission Models"). It covers the mandatory patterns:
  - `token.ts`: access tokens checked on every request, with an exact `aud` match per slug, RFC 9068 `typ: at+jwt`, asymmetric algorithms only;
  - `consent.ts`: per-client consent, keyed by person, client and server, so one approved client doesn't let another in;
  - `redirect.ts`: exact redirect URI matching, and registration checks that refuse wildcards and plain `http`;
  - `state.ts`: 256-bit, single-use OAuth state with a 10-minute lifetime, stored only as a hash;
  - `delegation.ts`: RFC 8693 token exchange for downstream calls, and a fetch wrapper that refuses to forward the caller's token.
- `policy.ts`: a policy engine (PBAC) that combines roles, attributes, company relationships, time windows, ticket binding, posture and token scopes in one decision. Deny by default, the highest grant wins, forbids always win, and conditions it can't evaluate fail closed. Record-level checks come back as obligations.
- `guard.ts`: one enforcement point for `tools/list` and `tools/call`, chaining registry, token, consent, directory and policy, with 401/403 answers carrying `WWW-Authenticate` (including scope step-up). `audit.ts` writes a hash-chained event per decision, with arguments stored as an HMAC.
- `npm test` runs the 57 tests with Node's test runner through `tsx`.

### Changed
- Create MCP server's Preview as now runs the policy engine. Every matching rule counts and each dataset gets the highest level granted, so a department rule adds to its business unit's rule instead of replacing it. A rule's Tools limit is a ceiling for everyone it covers. External audiences never get Manage, and always see only their own company's tickets and accounts. Preview as lists every matching rule and what capped a dataset.

### Removed
- `matchRule()` and `accessFor()` from `src/lib/mcp-server.ts`. `toClientView()` now takes the tools the engine allows.

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
