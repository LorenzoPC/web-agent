# Flow Patterns + Prompts Library

**Status:** Draft — goal, V1/V2 scope, and prompt/pattern mechanics agreed in conversation (only nav grouping still open); data model/screens below are a proposed implementation plan, not yet built
**Created:** 2026-07-30
**Related:** [`../design/web-agent.md`](../design/web-agent.md) (main design doc), [`../prds/web-agent.md`](../prds/web-agent.md) (PRD)

---

## Goal

The Builder today produces exactly one shape: data-source → **one** agent (with optional tool/MCP/RAG attachments) → delivery, run as a strict linear chain. This works for a single task done by a single agent, but doesn't support a *chain of actions across multiple agent tasks* — a flow where several distinct agent tasks hand off to each other following a repeatable pattern (e.g. research → synthesize, or draft → review).

Two new capabilities close that gap, and turn out to be closely related:

1. **Flow Patterns** — reusable templates describing how multiple agent-task slots connect, so a flow can chain N agent tasks instead of 1. A pattern is a template (no agents bound yet); a "built flow" is a pattern with real agents/tasks/prompts bound to its slots.
2. **Prompts Library** — reusable prompts scoped by business context (Business Unit → Role → Task/process), so that binding an agent to a pattern slot can pull from a curated, matched set of prompts instead of starting from a blank instruction box every time.

The two connect directly to work already shipped: the Marketplace's "Business Capabilities Agents" section already has a Roles view (Customer Support, Sales, Engineering, Customer Experience) with a Pre/Work/Post breakdown of business processes under each, and agents already carry a `role` field. That existing taxonomy becomes the backbone both features are scoped against, rather than something new.

---

## Scope

### V1

- **Flow Patterns are curated, not user-authored.** A handful of hand-seeded patterns (e.g. "Single agent" — today's default, "Research → Synthesize," "Draft → Review"), browsable in a new **Patterns** screen. No pattern-authoring UI.
- **Flow Patterns are linear only.** A pattern is an ordered list of N agent-task slots. No branching, parallel fan-out/fan-in, or loops — the existing chain-runner (`runPipeline`, `/api/pipeline/run`) needs no changes.
- **Ecosystem builder change:** data-source and delivery blocks are unchanged (single-select, LLM-recommended, as today). The single Agent slot is replaced by: pick a Flow Pattern, then for each of its slots, **manually** bind a real agent persona (+ optional Tools/MCP/RAG attachments, same manual multi-select as today) and edit that slot's task instructions (pre-seeded with a default from the pattern, user-editable). **No LLM recommendation for slot binding** — sidesteps the analyze endpoint's known cross-contamination fragility (see main design doc) and keeps this pass scoped.
- **Prompts Library** — a new **Prompts** screen: create/update prompts, soft-archive instead of hard delete (archived prompts drop out of new-binding pickers but stay resolvable for flows that already snapshot them), each scoped to any combination of Business Unit / Role / Task-process. A **Test** panel: pick a real catalog agent (not a raw model), type sample input, run through the existing single-step execution path with the agent's `systemPrompt` as persona and the prompt body as instructions, inspect the output — before the prompt is ever bound into a real flow.
- **Prompt scoping uses specificity with fallback**, not an exact-tuple-only match: a prompt can attach at the Business Unit level (broadest), the Role level, or an exact Task/process (most specific). Resolving prompts for a task slot walks Task/process → Role → Business Unit, most specific match wins.
- **A slot with no matching prompt at any level is still usable** — the user can leave it unbound or write instructions from scratch — but the flow editor visually flags any slot without a bound prompt, and always shows a persistent "Create a prompt" CTA (scoped to that slot's task/process) for the gap.
- **Prompt binding per slot is manual and filtered, not LLM-recommended** — matching prompts are surfaced as a list; the user picks. Consistent with the no-LLM agent-binding decision above.
- **Flows snapshot prompt text at build time.** Editing a prompt later doesn't retroactively change flows already built or run — same pattern as how a `PipelineStep` today is a copied snapshot, not a live catalog reference.
- **Taxonomy formalization + rename:** the Marketplace's "Roles" toggle/pools become **Business Units** (naming only — same data), to stop colliding with the agent persona's own `role` field. The Pre/Work/Post process items, currently free-text strings in `MOCK_ROLE_POOLS`, become real ID-backed records so prompts (and pattern slots, potentially) can reference them.

### V2 (explicitly deferred)

- A UML-like visual canvas for **authoring** patterns (nodes = task slots, edges = connections) — replaces the V1 curated-gallery-only posture.
- **Non-linear pattern shapes** — branching/routing, parallel fan-out/fan-in, evaluator-optimizer loops. Needs a graph-based execution model (multi-input steps, conditional routing, possibly retry/loop semantics) — a materially bigger lift than V1's ordered array, deliberately built alongside the visual editor rather than before it.
- User-authored (not just curated) patterns.
- Possibly LLM-assisted prompt recommendation, once there's enough real prompt-library content for a recommendation to be meaningful.
- Flow Pattern slots optionally pre-suggesting a Task/process (and therefore a Business Unit) to narrow which prompts/agents are natural fits for that slot — confirmed as a nice addition, not required for V1's fully-generic slots.

---

## Concept model

Five things, three of which are new:

| Concept | New? | What it is |
|---|---|---|
| Agent | existing | A persona/capability — `catalog_entries` where `kind='agent'` |
| Business Unit | rename of existing | Today's Marketplace "Roles" pools (Sales, Engineering, ...) |
| Task/process | formalize existing | Today's free-text Pre/Work/Post items, one per Business Unit |
| **Flow Pattern** | **new** | An ordered template of N agent-task slots |
| **Prompt** | **new** | Reusable prompt text, scoped to a Business Unit and/or Role and/or Task/process |

A **built flow** (what "Build flow" produces today) becomes: a chosen Flow Pattern, with a real agent + attachments + task instructions + optionally a bound Prompt, for each of its slots — same `PipelineStep[]` output shape as today, just with N agent steps instead of 1.

**Resolved 2026-07-30 — how a Prompt relates to an agent's `systemPrompt` at execution:** the agent's `systemPrompt` stays the persona ("who is doing this"); a bound Prompt's `body` becomes that step's task instructions ("what to do"), combined with whatever's flowing through the chain as input. No new execution logic — a step with a bound Prompt runs through the exact same `/api/pipeline/run` path as today, just with `system: agent.systemPrompt` and `prompt: promptBody + chainInput` instead of `prompt: chainInput` alone.

---

## Data model (proposed — not yet drafted in `schema.ts`, not applied)

```ts
// Renames/formalizes the Marketplace's MOCK_ROLE_POOLS pools as real records.
export const businessUnits = pgTable("business_units", {
  id: text("id").primaryKey(),          // e.g. "engineering"
  name: text("name").notNull(),         // e.g. "Engineering"
  description: text("description"),
});

// Formalizes MOCK_ROLE_POOLS[].processes.{pre,work,post} — one row per item,
// phase-classified, each belonging to exactly one Business Unit (unlike the
// Capabilities taxonomy's many-to-many catalog_entry_categories join — a
// process here isn't shared across units).
export const taskProcesses = pgTable("task_processes", {
  id: text("id").primaryKey(),
  businessUnitId: text("business_unit_id").notNull().references(() => businessUnits.id, { onDelete: "cascade" }),
  label: text("label").notNull(),        // e.g. "Draft first-response replies to common questions"
  phase: text("phase").notNull(),        // 'pre' | 'work' | 'post'
});

// A reusable, curated, linear chain template.
export const flowPatterns = pgTable("flow_patterns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),          // e.g. "Research → Synthesize"
  description: text("description"),
});

export const flowPatternSlots = pgTable("flow_pattern_slots", {
  id: text("id").primaryKey(),
  patternId: text("pattern_id").notNull().references(() => flowPatterns.id, { onDelete: "cascade" }),
  slotOrder: integer("slot_order").notNull(),
  taskLabel: text("task_label").notNull(),               // e.g. "Research the topic"
  defaultInstructions: text("default_instructions"),      // seeded default, edited per bound flow
});

// A reusable prompt. All three scope columns are nullable; resolving prompts
// for a slot walks taskProcessId → role → businessUnitId, most specific wins
// (see Key decisions). `archivedAt` is a soft-delete — archived prompts drop
// out of the picker for new bindings but stay resolvable for flows that
// already snapshot them.
export const prompts = pgTable("prompts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  body: text("body").notNull(),           // the task instructions — see Concept model
  businessUnitId: text("business_unit_id").references(() => businessUnits.id),
  role: text("role"),                     // free-text match against PipelineStep.role
  taskProcessId: text("task_process_id").references(() => taskProcesses.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Following this codebase's established sequencing (see the Dashboard/Marketplace pass): build the **Patterns** and **Prompts** screens first against static mock data (extending `src/lib/mock-data.ts`, reusing the same `MockAgentPool`-style shapes), validate the UI and content, *then* draft and push this schema — not before. **Resolved:** once `businessUnits`/`taskProcesses` are applied, migrating `MockAgentPool`'s hand-authored `agents`/`processes` content over is a one-time seed script matching what's already written in `mock-data.ts` — confirmed reasonable, no open design question, just an implementation task.

---

## New screens (proposed)

- **`/patterns`** — gallery of curated Flow Patterns (name, description, slot count/preview). Read-only browsing in V1, matching the Marketplace's card-grid posture.
- **`/prompts`** — list of prompts (filterable by Business Unit/Role/Task-process, archived ones hidden by default), a create/edit form, an archive action, and a Test panel (catalog-agent picker + sample input + run + output).
- **Ecosystem tab changes** — a new pattern-selection step ahead of the (now per-slot) agent binding; each slot's binding UI reuses the existing option-card/attachment UX, plus a new prompt-picker (filtered list per the specificity rule, with a "Create a prompt" CTA when nothing matches) and an editable task-instructions field. Slots without a bound prompt are visually flagged but still usable.
- **Nav** — `/patterns` and `/prompts` join Dashboard/Marketplace/Builder in the shared nav shell. Whether to group Marketplace/Patterns/Prompts under a single "Library" nav item or keep all 5 flat is explicitly **deferred** (non-urgent) — see Open questions.

---

## Key decisions

| Decision | Choice | Alternative rejected | Reason |
|---|---|---|---|
| V1 pattern shape | Linear only (ordered slot list) | Support branching/parallel/loops in V1 | The existing chain-runner works unmodified; non-linear shapes need a graph execution model, deliberately deferred to V2 alongside the visual editor. |
| V1 pattern authoring | Curated/seeded only | A simple non-visual (form/list) authoring UI in V1 | Fastest path to proving the multi-agent-flow concept end-to-end; matches this app's established curated-first posture (the agent catalog itself started curated). |
| Taxonomy for Business Unit/Role/Task-process | Reuse and formalize the Marketplace's existing Roles pools, agent `role` field, and Pre/Work/Post items | Design a new, separate taxonomy | The user's own example ("Business unit ex Sales, role Sales agent") maps directly onto what's already shipped; avoids duplicate/competing taxonomies. |
| Prompt scoping | Specificity with fallback (Business Unit → Role → Task-process, most specific wins) | Exact-tuple-only, no fallback | Lets a handful of broad prompts give full coverage before every task/process has its own dedicated one authored. |
| Prompt/agent slot binding | Manual, filtered list — no LLM | LLM-recommended/ranked | Consistent with the V1 no-LLM agent-binding decision; avoids extending the analyze endpoint's already-flagged fragility to a new surface. |
| Prompt versioning | Flows snapshot prompt text at build time | Flows reference prompts live, reflecting later edits | Matches the existing `PipelineStep` snapshot pattern — a later prompt edit shouldn't silently change a flow that's already built or has run history. |
| Prompt specificity tie-break | Task/process → Role → Business Unit → none, most specific wins; "none" always shows a persistent "Create a prompt" CTA for that gap | Leave the tie-break implicit / undefined | The Business Unit → Role → Task/process ordering was already established as a hierarchy; making the fallback walk that same order is the natural reading, and a gap should always be actionable, not a dead end. |
| Unbound slot usability | A slot with no matching prompt is still usable (user can write instructions from scratch), but visually flagged in the flow editor | Block "Build flow" until every slot has a bound prompt | Keeps prompts additive rather than a hard gate — the library will start sparse and shouldn't block building real flows while it fills in. |
| Prompt delete | Soft archive (`archivedAt`), not hard delete | Hard delete, or block deletion while referenced | Archived prompts stay resolvable for flows that already snapshotted them (consistent with the versioning decision above) while disappearing from new-binding pickers. |
| Test panel mechanic | Pick a real catalog agent; its `systemPrompt` is the persona, the prompt body is the task instructions, run through the existing single-step execution path | Test against a raw model with no persona; or support both | Mirrors real bound-flow execution exactly, reuses existing execution logic with no new code path, and resolves how a Prompt relates to an agent's `systemPrompt` generally (not just for testing) — see Concept model. |
| Nav grouping for 5 top-level screens | Deferred, not decided | Group into a "Library" submenu now | Flagged non-urgent; better decided once Patterns/Prompts actually exist and the real crowding (or lack of it) is visible. |

---

## Open questions

- [ ] Nav real estate — five top-level items (Dashboard/Marketplace/Patterns/Prompts/Builder) once both new screens exist; deferred, revisit once both screens exist and the real crowding is visible (see Key decisions).
- [x] ~~Exact specificity-resolution order when a prompt could match on more than one axis~~ — resolved 2026-07-30: Task/process → Role → Business Unit → none, see Key decisions
- [x] ~~Can a Task/process have zero matching prompts and still be usable?~~ — resolved 2026-07-30: yes, usable but visually flagged, plus an always-available "Create a prompt" CTA
- [x] ~~Prompt delete/archive behavior~~ — resolved 2026-07-30: soft archive
- [x] ~~Does "Test" need to pick a specific catalog agent, or just a raw model?~~ — resolved 2026-07-30: a real catalog agent; also resolved the general Prompt/`systemPrompt` execution relationship, see Concept model
- [x] ~~Should Flow Pattern slots optionally pre-suggest a Task/process?~~ — resolved 2026-07-30: nice V2 addition, not V1 — see Scope
- [x] ~~Migration path for the Marketplace's existing mock content~~ — resolved 2026-07-30: confirmed reasonable, plain implementation task — see Data model

---

## Out of scope (V1)

- The UML visual pattern editor (V2)
- Non-linear pattern shapes — branching, parallel, loops (V2)
- User-authored patterns (V2)
- LLM-assisted prompt recommendation (V2, maybe)
- Real persistence for any of the above — this file documents the plan; schema/API/screens are not yet built (see Build sequencing above)
