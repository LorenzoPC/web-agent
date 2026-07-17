# PRD — Pipeline Execution & Cost Accounting

**Status:** Draft
**Created:** 2026-07-17
**Owner:** Lo
**Design doc:** [`../project/implementation_foundation.md`](../project/implementation_foundation.md)

---

## Problem

web-agent's premise is running an AI pipeline across local hardware, rented remote hardware, and paid APIs, with a projected cost per step (per the original repo description). The data model for this already existed (`src/lib/types.ts`, `src/lib/pipeline-data.ts`) but nothing executed a step or called a real model — the app was still the default `create-next-app` scaffold. Without real execution, the cost projections are unverifiable guesses; the point of the product is knowing what a pipeline actually costs, not just estimating it.

## Goals

- Run each pipeline step (`retrieve-context`, `rerank-candidates`, `generate-response`, `call-tool`, `postprocess`) against a real backend — local hardware, rented remote hardware, or a paid API — from one UI
- Show a pre-run projected cost per step, then reconcile it against the real cost once the step finishes
- Support the three cost shapes that actually exist across these sources: free (local), duration-billed (rented GPU), and token-billed or per-request (APIs) — a single flat `cost-per-unit` number can't represent all three honestly

## Non-goals

- No real external search API for the `call-tool` step yet — it's stubbed; wiring a real one is a Marketplace-integration task, separate from this feature
- No auth or rate-limiting on the execution route — fine for local/single-user use for now
- No persistence of run history — each run's output/cost is shown live, not stored

## Success metrics

| Metric | Baseline | Target | How to measure |
|---|---|---|---|
| Steps with real execution | 0/5 (scaffold only) | 5/5 mock steps runnable | Manually run each step via the UI, confirm output + cost appear |
| Cost model accuracy | N/A (no real costs shown) | Actual cost within the real provider's billing formula for each `CostModel.kind` | Compare `actualCost()` output against provider-published pricing for a test call |

## User scenarios

**Scenario 1 — Run a single step and see real cost**
> A user viewing the pipeline list clicks "Run" on `generate-response`. The app calls OpenAI's `gpt-5.4` via the server, streams/returns the output, and replaces the projected cost with the actual token-based cost once the call finishes.

**Scenario 2 — Local step costs nothing**
> A user runs `postprocess`, which calls a local Ollama model. The step succeeds (or fails clearly if Ollama isn't running locally) and always shows $0 — local hardware has no marginal per-call cost.

## Solution overview

Local, remote, and API sources are unified behind one server-side Route Handler using the AI SDK's provider registry — local/remote hardware are OpenAI-compatible endpoints (e.g. Ollama), APIs are direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic`), and all three resolve through the same `registry.languageModel(step.modelRef)` call. Cost is computed from whichever metric the SDK actually reports for that call shape: free for local, wall-clock duration for rented remote hardware, and token counts for API/embedding calls. See the design doc for the concrete types and route contract.

## Dependencies

| Dependency | Status | Owner |
|---|---|---|
| `OPENAI_API_KEY` env var | Required for `generate-response` step | user |
| Local Ollama server reachable at `LOCAL_MODEL_BASE_URL` | Required for `retrieve-context`/`postprocess` steps | user |
| Rented GPU endpoint reachable at `REMOTE_MODEL_BASE_URL` | Required for `rerank-candidates` step | user |

## Open questions

- [ ] Should run history persist anywhere, or is live-only display sufficient for the current scope?
- [ ] When should the `call-tool` step get a real search API instead of a stub? (Marketplace integration, separate task)
