# Agentic Component Enhancement — Design Refinement

**Status:** Draft — design decisions proposed for review, nothing implemented yet
**Created:** 2026-07-30
**Related:** [`../design/web-agent.md`](../design/web-agent.md) (main design doc), [`web-agent.md`](web-agent.md) (PRD), [`../project/pattern_libraries.md`](../project/pattern_libraries.md) (Flow Patterns + Prompts plan)

---

## Why this doc exists

The PRD's Non-goals section is explicit: this is **"not a general-purpose agent framework"** — a fixed, small set of steps, not an open-ended agent. That was the right call for V1's single-agent pipeline. But Flow Patterns + Prompts (see `pattern_libraries.md`) are pushing the app from *one task, one agent* toward *chains of agent tasks following reusable patterns* — which is, functionally, building toward real agentic flows whether the PRD names it that way or not.

Before building the Flow tab on top of the Patterns/Prompts foundation already laid, this doc checks that foundation against a fuller mental model of what an agent actually needs, to catch design gaps now rather than after more code is built on top of them:

```
AGENT = Reasoning + Goals + Tools + Context + Memory + Policies + Evaluation
```

Each section below: what exists/is planned, the gap, and a concrete proposed design decision — not just a menu of options. These are proposals for review, not committed decisions; nothing here is implemented.

---

## Reasoning

**Today:** each step calls `generateText`/`embed` directly through the model. Tool-attached chat steps get a real agentic loop (`stopWhen: isStepCount(4)`). No reasoning strategy is chosen or enforced — it's whatever the underlying model does. Confirmed weak spot: the free local default model doesn't reliably invoke attached tools at all.

**Proposed decision:** don't build an orchestration-level reasoning strategy (no CoT scaffolding, no ReAct scratchpad) — stays delegated to the model, consistent with the PRD's fixed-pipeline stance. **Do** close the known, cheap part of the gap: surface a tool-calling-capability signal when a slot's bound agent has tools/MCP servers attached — a small badge on the agent card in the Flow tab (and the Marketplace) if the agent's `modelRef` isn't on a known-good tool-calling allowlist. UI-only, no schema change, directly answers the design doc's own open question ("should the UI surface a warning when a weak-tool-calling model is paired with Tools/MCP attachments?").

**Scope:** V1, UI-only.

---

## Goals

**Today:** only the whole-*flow* goal exists (`refinedGoal` + `successCriteria`), and nothing verifies a run against it — it's descriptive text a human reads. No individual agent-task step has its own explicit goal; task instructions conflate "what to do" with "how you'd know it's done."

**Proposed decision:** give each Flow Pattern slot an optional second field, distinct from `defaultInstructions` — a one-line **done-condition** (e.g. "Done when the summary is under 150 words and cites at least one source"). This doesn't add automated checking (that's Evaluation, below) — it just makes each step's goal explicit and inspectable instead of buried inside instruction prose. The flow-level `successCriteria` stays as the overall definition of done; slot-level done-conditions are each step's contribution to it, not a replacement.

**Concrete change:** `flowPatternSlots` (drafted, unapplied) gains `doneCondition: text("done_condition")`, nullable; `MockPatternSlot` gains `doneCondition?: string`.

**Scope:** V1 — small, additive schema field.

---

## Tools

**Today:** the most concretely built component. `toolRefs`/`mcpServerRefs` on `PipelineStep`, but only 2 of 13+ catalog entries actually execute (Exa search, GitHub MCP) — everything else is catalog-only/decorative, and nothing in the UI tells a user which is which. RAG (`ragSource`) is modeled as a separate mechanism from tools entirely, despite being conceptually "a retrieval tool."

**Proposed decision, two parts:**
1. **Keep RAG's data shape separate** (it needs a `documents` text blob, not a callable interface) but **document it as a specialized built-in tool** in the mental model going forward, so the next new attachment type (e.g. a database-lookup tool) has an obvious home instead of prompting a 4th top-level category.
2. **Make "real execution vs. decorative" visible in the UI** — a small badge ("Runs for real" / "Reference only") on catalog cards wherever tools/MCP/RAG are selectable (Ecosystem tab, Marketplace, the new Flow tab). Currently a user can attach 11 of 13 tools with zero effect and no indication of that. Cheap, honest, no architecture change — just surfaces `metadata.executor` (already the exact flag the backend uses) in the UI that currently hides it.

**Scope:** V1, UI-only (the badge); RAG's separate data shape stays as-is (just re-framed in docs, no code change).

---

## Context

**Today:** the most structurally limited component. Each step only ever sees the *immediately prior* step's raw output as its `input` — there's no shared context object across a chain. Step 3 in a 3-slot pattern cannot see step 1's output unless step 2 happened to repeat it. RAG retrieval is per-step, not cached or shared across a chain.

**Proposed decision:** for V1's **linear** patterns, extend what flows through the chain from a single string to a **running transcript** — each step receives the full ordered history of `{taskLabel, output}` pairs from every prior step in the chain, not just the last one, with the most recent step still called out as the primary input. This is a real change to `runPipeline`'s loop (`pattern_libraries.md` currently assumes "the existing chain-runner needs no changes" — this revises that assumption) but stays entirely within V1's linear-chain scope; it does **not** attempt the general shared-context/graph-state model that non-linear V2 patterns will eventually need (a branching node needing two upstream inputs is a different, harder problem, deliberately left for the V2 graph engine design rather than half-solved here).

**Concrete change:** `/api/pipeline/run`'s request stays `{step, input}` (no server change) — the *client-side* `runPipeline` loop in `pipeline-tab.tsx` builds `input` as a formatted transcript instead of the bare previous `output`. Genuinely additive to what's drafted, not a rewrite.

**Scope:** V1, but flagged as a real revision to the existing plan's assumption — worth confirming before building the Flow tab, since it changes how multi-slot flows actually execute.

---

## Memory

**Today:** none. Every run is stateless; "memory" within a run is just the one prior transcript entry (see Context, above, once that's adopted).

**Proposed decision:** true cross-run agent memory (persistent learnings, a vector store, write-back mechanics) is **out of scope**, consistent with the PRD's fixed-pipeline stance — flagged explicitly as V2+, not quietly absent. But there's a narrow, cheap V1 addition worth taking: since RAG already exists as pasted-reference-text retrieval, let a **Business Unit or Role carry a standing reference document** (a company style guide, an FAQ, a policy doc) that's automatically available to any agent bound within that scope — reusing the exact RAG retrieval mechanics already built, just scoped by the same Business-Unit/Role taxonomy the Prompts library already uses. This isn't "memory" in the full sense (nothing is written back, nothing evolves), but it closes the most common practical want ("the Support agent should always know our refund policy") without new infrastructure.

**Concrete change:** none to schema required immediately — this is really "a `ragSource` attached at the Business Unit/Role level instead of per-run," which can reuse the existing `ragSource` shape once Business Units are real tables. Flagged as a candidate V1.5 addition, not required for the Flow tab to ship.

**Scope:** V2 for real memory; a lightweight standing-reference-doc variant is a plausible V1.5, not required now.

---

## Policies

**Today:** no first-class concept. Business-unit-wide Prompts are informally doing this job already — e.g. the seeded "Support tone guidelines" prompt says "never promise a refund or credit without escalating," which is a policy, just stored as an ordinary Prompt. Nothing distinguishes "what to do" from "constraints on how you must behave," and nothing composes multiple applicable policies together.

**Proposed decision:** don't build a separate Policy entity/screen — **add a `kind` discriminator to Prompt** (`'instruction' | 'policy'`), since policies want the exact same scoping mechanism (Business Unit/Role/Task-process) already built for Prompts. The important refinement is in **resolution logic**, not storage: instructions resolve via specificity fallback (most specific match wins, per the existing decision) — but **policies should be additive**, not fallback. If a slot resolves to a Business-Unit-level policy *and* a Task-process-level policy, both apply; a task-specific instruction shouldn't silently override a business-unit-wide policy the way it overrides a broader instruction. This is a real correction to the resolution model in `pattern_libraries.md`, which only described single-match fallback.

**Concrete change:** `prompts` (drafted schema) and `MockPrompt` both gain `kind: "instruction" | "policy"` (default `"instruction"` for everything seeded so far — none of the 8 mock prompts need reclassifying except "Support tone guidelines," which is actually a policy). Slot resolution becomes: one instruction (most specific match) + all applicable policies (every matching scope level), not one prompt.

**Scope:** V1 — schema field is trivial; the resolution-logic change is the real design decision and should land before the Flow tab's prompt-picker is built, not retrofitted after.

---

## Evaluation

**Today:** no automated checking anywhere. `successCriteria` is descriptive text a human reads. Run `status` (drafted schema) is purely mechanical — did a step throw an error — not a quality judgment. "Evaluator-optimizer" is named as a possible V2 *pattern shape*, but that's evaluation as one optional pattern a user might choose, not evaluation as a capability every run has.

**Proposed decision:** true automated/scored evaluation is **V2**, and deliberately coupled to the same graph-execution work evaluator-optimizer patterns need anyway — building a one-off scorer now would likely be thrown away once that lands properly. The cheap V1 addition: let a human **tag a completed run** against its own `successCriteria` — a simple "met criteria: yes / partially / no" set on the run after the fact, from the Dashboard's Results section. Not automated, not a gate, just turns `successCriteria` from write-only descriptive text into something with a recorded outcome — and produces real labeled data that would make a future automated evaluator meaningfully easier to build.

**Concrete change:** the drafted `pipelineRuns` table gains `criteriaMet: text("criteria_met")` (`'yes' | 'partial' | 'no' | null`), settable from the Dashboard, not at run time.

**Scope:** V1.5 — small schema addition, but UI for setting it depends on real run persistence landing first (still mock today), so it trails the Patterns/Prompts/Flow-tab work rather than blocking it.

---

## Summary — what this changes in already-drafted plans

| Component | Changes `pattern_libraries.md`? | Changes drafted schema (`schema.ts`)? | Changes shipped mock code? |
|---|---|---|---|
| Reasoning | No | No | New UI badge only (not built yet) |
| Goals | Adds a field to the slot concept | `flowPatternSlots.doneCondition` | `MockPatternSlot.doneCondition` |
| Tools | Reframes RAG in prose only | No | New UI badge only (not built yet) |
| Context | **Revises** the "chain-runner needs no changes" assumption | No (client-side only) | `pipeline-tab.tsx`'s `runPipeline` loop, not yet changed |
| Memory | Adds a V1.5 candidate | Deferred | None yet |
| Policies | **Corrects** the resolution-logic description (fallback → instruction-fallback + policy-additive) | `prompts.kind` | `MockPrompt.kind` (all 8 seeded prompts default to `"instruction"`; "Support tone guidelines" should become `"policy"`) |
| Evaluation | Adds a V1.5 candidate | `pipelineRuns.criteriaMet` | None yet (depends on real run persistence) |

Two of these (**Context**, **Policies**) are real corrections to what's already documented, not just additions — worth confirming before the Flow tab is built, since both change how slot execution and prompt resolution actually behave.

---

## Open questions

- [ ] Confirm the Context transcript change before building the Flow tab — does the full running transcript get shown to the *user* too (in the tailoring UI), or only sent to the model?
- [ ] Confirm the Policy/Instruction resolution split — should a slot be allowed to have *zero* instructions but still inherit policies, or does the instruction fallback always need to resolve to something?
- [ ] Tool-calling capability allowlist (Reasoning) — needs an actual list of which `modelRef`s are "known good" at tool-calling; not yet defined anywhere.
- [ ] Memory's standing-reference-doc idea depends on Business Units being real (persisted) — sequencing relative to the rest of the drafted schema work isn't decided.

---

## Out of scope (unchanged from `pattern_libraries.md`)

- General-purpose long-term agent memory (vector store, write-back, cross-run recall)
- Automated/scored evaluation, evaluator-optimizer as a general capability (vs. an optional V2 pattern shape)
- Any reasoning-strategy scaffolding beyond what the model does natively
- The V2 graph-execution model this doc deliberately avoids partially reinventing via the Context proposal
