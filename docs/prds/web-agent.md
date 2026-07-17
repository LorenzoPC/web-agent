# PRD — web-agent

**Status:** In development
**Created:** 2026-07-17
**Owner:** Lo
**Design doc:** [`../design/web-agent.md`](../design/web-agent.md)

---

## Problem

Running an AI pipeline across different execution sources — hardware you own, hardware you rent, and paid APIs — has no single place to see what each step actually costs. Model providers publish per-token pricing, GPU rental is billed by the hour, and local inference is free, but nothing ties those together per pipeline step so you can compare "what would this cost to run" before you run it, then verify against what it actually cost. web-agent exists to make that comparison concrete: define a pipeline once, run each step against whichever source makes sense, and see projected vs. actual cost side by side.

## Goals

- Run a multi-step AI pipeline (retrieval, reranking, generation, tool calls, post-processing) against three source types from one app: local hardware, rented remote hardware, and paid APIs
- Show a pre-run cost projection per step, then reconcile it against real usage once the step finishes — using a cost formula that matches how that source is actually billed (free / time-based / token-based / per-request), not one flat number
- Persist run history so past runs (output, usage, cost) can be reviewed, not just seen live
- Keep local/remote/API sources behind one uniform execution path so adding a new step or swapping a model doesn't require special-casing the source type

## Non-goals

- Not a general-purpose agent framework or chatbot — the "pipeline" is a fixed, small set of steps, not an open-ended conversation
- Not multi-tenant — single user, no auth in this phase
- Not a cost-optimization or provider-comparison tool that recommends *which* provider to use — it reports actual cost, it doesn't shop around

## Success metrics

| Metric | Baseline | Target | How to measure |
|---|---|---|---|
| Steps runnable end-to-end | 5/5 mock steps (as of 2026-07-17) | Stays 5/5 as steps are added/changed | Manually run each step via the UI |
| Cost accuracy | Projected only, no reconciliation (pre-2026-07-17) | Actual cost shown per run, matching the provider's real billing formula | Compare `actualCost()` output against provider-published pricing |
| Run history | None — live display only | Past runs queryable (at least: list runs by step, see cost over time) | Query the run history store after several runs |

## User scenarios

**Scenario 1 — Run a step and see real cost**
> A user clicks "Run" on a pipeline step. The app calls the right backend (local Ollama, a rented GPU box, or an API) via the server, and replaces the projected cost with the real cost once the call finishes.

**Scenario 2 — Review past runs**
> A user wants to know how much a given step has cost over the last week, or wants to see the output from a run they did earlier. They can look this up instead of it only being visible in the moment it ran.

**Scenario 3 — Add a new pipeline step**
> A developer adds a new step (a different model, a different source type). Because local/remote/API sources share one execution path (a provider registry + a typed cost model), the new step only needs a config entry, not new plumbing.

## Solution overview

A Next.js app (App Router, deployed on Vercel) with an in-memory pipeline config (`MOCK_PIPELINE`) describing each step's source, cost model, and provider registry key. A server-side Route Handler (`/api/pipeline/run`) resolves each step's model through a shared AI SDK provider registry — local/remote hardware as OpenAI-compatible endpoints, APIs as direct provider SDKs — executes it, and returns real usage. The client shows projected cost up front and swaps in actual cost once a run completes. Run history will persist to a Neon Postgres database (Vercel Marketplace), provisioned but not yet wired into the app as of this writing.

## Dependencies

| Dependency | Status | Owner |
|---|---|---|
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` env vars | Required for API steps | user |
| Local Ollama server | Required for local steps | user |
| Rented GPU endpoint | Required for the remote step | user |
| Vercel project (`lorenzopcs-projects/web-agent`) | Linked 2026-07-17; GitHub auto-connect failed, not yet retried | user |
| Neon Postgres (Vercel Marketplace) | Decision made 2026-07-17, not yet provisioned | user |

## Open questions

- [ ] What does "review past runs" need beyond a list — filtering by step, date range, cost threshold?
- [ ] Should the Vercel project's GitHub auto-deploy be fixed now, or is local dev sufficient for the current phase?
- [ ] When should the `call-tool` step get a real search API instead of a stub? (Marketplace integration, separate task)
- [ ] Should auth be added before or after this becomes anything other than single-user?
