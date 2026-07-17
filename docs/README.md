# Docs — web-agent

Documentation index for web-agent. Doc templates come from [`bespoke-core`](https://github.com/LorenzoPC/bespoke-core)'s `templates/docs/`.

web-agent is a **standalone project** (deployed on Vercel, not joining the shared bf01 platform), so it uses bespoke-core's **minimal tier** only — see `templates/project/docs/README.md` in bespoke-core for the full tier breakdown. No `architecture/`, `operations/`, `product/`, `knowledge/`, `prompts/`, or `config/` folders here; add them only if a doc genuinely outgrows this structure.

---

## Project management

| Doc | Purpose |
|---|---|
| [`project/backlog.md`](project/backlog.md) | Prioritised backlog |
| [`project/implementation_foundation.md`](project/implementation_foundation.md) | Architecture decisions behind the pipeline-execution feature |

## Feature docs

| Folder | Purpose |
|---|---|
| [`prds/`](prds/) | Product Requirements Documents — one file per feature |
