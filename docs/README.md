# Docs — web-agent

Documentation index for web-agent. Doc templates come from [`bespoke-core`](https://github.com/LorenzoPC/bespoke-core)'s `templates/docs/`.

web-agent is a **standalone project** (deployed on Vercel, not joining the shared bf01 platform), so it uses bespoke-core's **minimal tier** only — see `templates/project/docs/README.md` in bespoke-core for the full tier breakdown. No `architecture/`, `operations/`, `product/`, `knowledge/`, `prompts/`, or `config/` folders here; add them only if a doc genuinely outgrows this structure.

**Start here:** [`prds/web-agent.md`](prds/web-agent.md) (what/why) → [`design/web-agent.md`](design/web-agent.md) (how, including the architecture) → [`project/backlog.md`](project/backlog.md) (what's left).

---

## Project management

| Doc | Purpose |
|---|---|
| [`project/backlog.md`](project/backlog.md) | Prioritised backlog |
| [`project/changelog.md`](project/changelog.md) | Shipped features by epoch or version |
| [`project/completed/`](project/completed/) | Archived docs superseded by a later, broader version — kept for history |

## Feature docs

| Folder | Purpose |
|---|---|
| [`prds/`](prds/) | Product Requirements Documents. `web-agent.md` is the current whole-project PRD. |
| [`design/`](design/) | Architecture and data model design docs. `web-agent.md` is the current whole-project design doc, including the system architecture (no separate `architecture/` folder — see the tier note above). |
| [`adr/`](adr/) | Architecture Decision Records — one file per significant decision. Smaller decisions are still tracked in the design doc's "Key decisions" table. [`0001`](adr/0001-discovery-session-realtime-voice.md) — Discovery session: realtime voice interview that drafts a tool recipe (Proposed; UI mockup built). [`0003`](adr/0003-mcp-server-security-and-governance.md) — MCP servers: security and governance for publishing company data to AI clients (Proposed; UI mockup built before the research, backed by [`research/`](research/)). |

## Technical reference

| Doc | Purpose |
|---|---|
| [`reference/glossary.md`](reference/glossary.md) | Domain term definitions |
