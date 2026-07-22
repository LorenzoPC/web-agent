# Web Agent App — PRD

**Status:** In development
**Created:** 2026-07-17
**Owner:** Lo
**Design doc:** [`../design/web-agent.md`](../design/web-agent.md)

---

## Problem

Running an AI pipeline across different execution sources — hardware you own, hardware you rent, and paid APIs — has no single place to see what each step actually costs. Model providers publish per-token pricing, GPU rental is billed by the hour, and local inference is free, but nothing ties those together per pipeline step so you can compare "what would this cost to run" before you run it, then verify against what it actually cost. web-agent exists to make that comparison concrete: define a pipeline once, run each step against whichever source makes sense, and see projected vs. actual cost side by side.

## Goals

- Let a user describe a challenge in plain language (the **Ecosystem builder**) and get back a proposed flow: a small set of fixed blocks (data source, processing, delivery), each with a few real catalog options ranked by relevance, selectable as cards with projected cost — building the flow replaces what's shown in the Pipeline tab
- Back that catalog with a real, task-categorized database (models, services, SDK/framework hooks, RAG patterns, MCP servers) instead of a hand-typed list — models synced live from a real registry so pricing/availability stay accurate
- **(Shipped 2026-07-21)** Broadened Ecosystem builder: an editable LLM-refined restatement of the goal, an **Agent** picker (a new catalog kind — persona = model + system prompt + purpose, replacing the raw "processing" model choice), a multi-select **Tools** picker, "bonus" multi-select **MCP servers** and **RAG sources** pickers, and an editable LLM-drafted **Success criteria** section. Selection-only for most of these, except 3 integrations get real execution: Exa web search, a GitHub MCP connection, and a local-documents RAG source (in-memory embedding + retrieval) — all three verified working. See the design doc's "Ecosystem builder v2" section for the architecture.
- **(Shipped 2026-07-22)** Every Ecosystem section ends with a **"Search something else"** card opening a modal over that section's entire catalog (uncapped, lazy-loaded, text-searchable), so a user isn't limited to the ~15 LLM-recommended candidates; and each recommended option now carries its own **per-item rationale** (not just one blurb per section), shown on the card while selected.
- Run a multi-step AI pipeline (retrieval, reranking, generation, tool calls, post-processing) against three source types from one app: local hardware, rented remote hardware, and paid APIs
- Run the whole pipeline as a single chained action — each step's output feeds the next step's input, with per-step results visible as the chain progresses — as well as running any single step in isolation
- Show a pre-run cost projection per step, then reconcile it against real usage once the step finishes — using a cost formula that matches how that source is actually billed (free / time-based / token-based / per-request), not one flat number
- Persist run history (per full pipeline run, with each step's result) so past runs can be reviewed, not just seen live
- Keep local/remote/API sources behind one uniform execution path so adding a new step or swapping a model doesn't require special-casing the source type

## Non-goals (V1)

- Not a general-purpose agent framework or chatbot — the "pipeline" is a fixed, small set of steps, not an open-ended conversation
- Not a cost-optimization or provider-comparison tool that recommends *which* provider to use — it reports actual cost, it doesn't shop around
- ~~Not multi-tenant~~ — **V1 is scoped and built as a single-user personal tool**, but the long-term ambition is a broad-audience SaaS. 🚩 **V2** — multi-tenancy, auth, per-user pipelines/history. Keep V1 code from actively working against that (e.g. don't hardcode global singletons where a per-user scope would later go), but don't build it now.

## Success metrics

| Metric | Baseline | Target | How to measure |
|---|---|---|---|
| Steps runnable end-to-end | 5/5 mock steps (as of 2026-07-17) | Stays 5/5 as steps are added/changed | Manually run each step via the UI |
| Cost accuracy | Projected only, no reconciliation (pre-2026-07-17) | Actual cost shown per run, matching the provider's real billing formula | Compare `actualCost()` output against provider-published pricing |
| Run history | None — live display only | Past runs queryable (at least: list runs by step, see cost over time) | Query the run history store after several runs |

## User scenarios

**Scenario 1 — Run the whole pipeline chained**
> A user enters a prompt and clicks "Run pipeline." Each step runs in order, its output feeding the next step's input, with each step's card flipping from running to done (or error) as the chain progresses and the running cost total updating live. If a step errors, the chain stops there — later steps aren't invoked with no valid input.

**Scenario 2 — Run a single step in isolation**
> A user wants to test or debug just one step (e.g. after changing its model). They click that step's own "Run" button independently of the full-pipeline action.

**Scenario 3 — Review past runs**
> A user wants to know how much a full pipeline run cost last week, or wants to see the per-step outputs from a run they did earlier. They switch to the History tab and look it up instead of it only being visible in the moment it ran.

**Scenario 4 — Add a new pipeline step**
> A developer adds a new step (a different model, a different source type). Because local/remote/API sources share one execution path (a provider registry + a typed cost model), the new step only needs a config entry, not new plumbing.

**Scenario 5 — Build a flow from a challenge**
> A user types "I want a daily summary of game results for American basketball, in email format" and clicks Analyze. The app proposes real, costed options for a data source, an agent persona, and delivery — plus optional tools, MCP servers, and RAG sources the agent can use — the user picks per section, edits the refined goal or success criteria if needed, clicks "Build flow," and lands on the Pipeline tab with a ready-to-run flow.

## Solution overview

A Next.js app (App Router, deployed on Vercel) with an in-memory pipeline config (`MOCK_PIPELINE`) describing each step's source, cost model, and provider registry key. A server-side Route Handler (`/api/pipeline/run`) resolves each step's model through a shared AI SDK provider registry — local/remote hardware as OpenAI-compatible endpoints, APIs as direct provider SDKs — executes it, and returns real usage. The UI is three tabs on one page: **Ecosystem** (describe a challenge, get back an editable refined goal, real costed options for data source/agent-persona/delivery plus optional tools/MCP servers/RAG sources, an editable success-criteria draft, and a "Build flow" action), **Pipeline** (a primary "Run pipeline" action chains the active flow's steps in order, output feeding the next step's input; each step also keeps its own standalone "Run" button), and **History** (past full-pipeline runs, once persistence is wired). `MOCK_PIPELINE` remains the default flow shown in the Pipeline tab until a flow is built in Ecosystem. Ecosystem's catalog (`catalog_entries`, task-categorized, ~300 models synced live from the AI Gateway plus a curated set of services/agent-personas/hooks/RAG-patterns/MCP-servers) lives in Neon Postgres — the first real database work in this project. Three catalog entries (a search tool, a GitHub MCP connection, a local-documents RAG source) execute for real when attached to an agent; everything else is captured on the flow but decorative. Run history will use the same database (one row per pipeline run with child rows per step result), provisioned but not yet wired into the app as of this writing.

## Dependencies

| Dependency | Status | Owner |
|---|---|---|
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` env vars | Required for API steps | user |
| Local Ollama server | Required for local steps | user |
| Rented GPU endpoint | Required for the remote step | user |
| Vercel project (`lorenzopcs-projects/web-agent`) | Linked 2026-07-17; GitHub auto-connect failed, not yet retried | user |
| Neon Postgres (Vercel Marketplace) | Provisioned 2026-07-17 (`neon-alizarin-queen`), holding the catalog; run-history tables still pending | user |
| Ecosystem builder's analysis model | Defaults to local Ollama (`ECOSYSTEM_ANALYZE_MODEL`, no API key needed); works with `llama3.2:latest` as of 2026-07-17 | user |
| Exa Search API (Vercel Marketplace) | Provisioned 2026-07-17 (`exa-search-api-cordovan-compass`); confirmed working via a direct API test — real current results returned | user |
| `GITHUB_TOKEN` env var | Needed for the real GitHub MCP connection (user-supplied PAT, not a Marketplace resource); code path confirmed correct (clean error without it) but the real success path is untested — nobody has supplied a token yet | user |
| `nomic-embed-text` (Ollama) | Pulled locally 2026-07-21; required for local RAG retrieval and the `retrieve-context`/`postprocess` mock pipeline steps | user |

## Open questions

- [ ] What does "review past runs" need beyond a list — filtering by step/date, cost threshold, re-running a past prompt?
- [ ] Should the Vercel project's GitHub auto-deploy be fixed now, or is local dev sufficient for the current phase?
- [ ] Should candidate selection for the analyze prompt get smarter (rank by task-category match to the challenge) instead of the current 15-per-group alphabetical cap?
- [ ] Small local models (`llama3.2:latest`) don't reliably invoke attached tools even when available (confirmed: Exa search works standalone, but the model just claims it can't search rather than calling it) — should the UI warn when a selected Agent's model has weak tool-calling support, or is this just an inherent tradeoff of the free/local option?
- [ ] `GITHUB_TOKEN`'s real success path is untested — only the clean failure-without-a-token path has been verified
- [x] ~~When should the `call-tool` step get a real search API instead of a stub?~~ — partially resolved: the *Ecosystem* "Tools" section now has a real Exa-backed search option; the original `MOCK_PIPELINE`/static "call-tool" step remains a separate, still-stubbed concept
- [x] ~~Should Ecosystem's block catalog stay fixed/hand-maintained, or eventually pull live pricing?~~ — resolved 2026-07-17: models now sync live from the AI Gateway; services/hooks/RAG patterns/MCP servers remain hand-curated (no live registry covers them)
- [x] ~~Should `hook`/`rag-pattern`/`mcp-server` catalog entries ever become selectable in the Ecosystem flow?~~ — resolved 2026-07-21: Tools, MCP servers, and RAG sources are all now selectable/attachable to the Agent step
- [x] ~~Should auth be added before or after this becomes anything other than single-user?~~ — resolved: auth/multi-tenancy is V2, explicitly deferred (see Non-goals)
