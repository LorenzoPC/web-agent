# ADR-0002: Dashboard Product screen, a second dashboard for the people who run the product

**Status:** Accepted for the UI, which is built against mock data (commit `1c16332`). No section has a real data source yet; see Follow-ups.
**Created:** 2026-10-26
**Related:** [`../design/web-agent.md`](../design/web-agent.md) ("Dashboard — Product screen", "Dashboard redesign"), [`../prds/web-agent.md`](../prds/web-agent.md) (Non-goals: multi-tenant SaaS is V2), `src/app/product/page.tsx`, `src/components/dashboard/`, `src/lib/mock-product-data.ts`

---

## Context

The Dashboard's Overview (`/dashboard`; it was `/` until 2026-10-30) answers one question: how is this organization adopting agents? It has four sections: metrics, a newsfeed of notification headers, five ranked priorities, and agent coverage of each business unit's Pre / Work / Post processes.

We then asked how the Dashboard would change for an agentic SaaS product. The first framing was the customer's workspace admin: hours saved, plan usage, an approvals queue. That was the wrong reader. The intended viewer works on the product side:

- **the product manager of the agentic product**, or
- **the manager of a function that supports it**: Customer Support, Sales, Engineering, Customer Experience.

These viewers ask different questions:

- Is the product healthy? (activation, eval quality, autonomy, cost per task)
- What changed? (an eval regression, a provider retiring a model, an escalation, deals blocked by a missing feature)
- What needs a decision?
- Where are agents actually used, by customers and by our own teams?
- Are the systems the agents depend on up?

Constraints that shape the decision:

- **Every screen so far is built UI-first against mock data**, with persistence as later work (design doc).
- **V1 is a single-user tool.** Multi-tenant SaaS is a V2 non-goal in the PRD, so there is no real notion of customer workspaces yet.
- **No source exists** for eval results, per-workspace usage, service health checks or product signals.
- **The four business units in the mock already match the supporting functions** of a SaaS product. Marketplace and Prompts already use them.
- **Next.js 16 App Router:** pages are Server Components by default, and `searchParams` arrives as a Promise.

## Decision

1. **A second Dashboard screen, not a replacement.** Product lives at `/product`. Overview / Product tabs under the page heading switch between the two screens. The app nav keeps "Dashboard" highlighted on both, through a small map of sub-screens to their parent nav item. The Overview is unchanged.
2. **The reader is the product side.** That means the PM or a supporting-function manager, not a customer admin and not a company-wide revenue console.
3. **A function switcher scopes the whole screen.** The options are *All functions* (the PM's default) plus the existing business units. There is no new taxonomy. The choice re-scopes every section:
   - **Metrics:** four per view. Product health for All functions (activation, eval pass rate, autonomy rate, cost per task), or that function's own numbers (e.g. tickets and CSAT for Support, blocked deals for Sales).
   - **Newsfeed:** a function view shows its own items plus product-wide ones. Each item's chip names the function it came from.
   - **Top priorities:** one ranked pool. Each priority records the function that raised it and the functions it `affects`. A view shows the first five its function raised or is affected by. A cross-functional priority therefore shows up in every view it touches, in the same relative order.
   - **The "+" button:** "Add to roadmap" for All functions, "Delegate to an agent" for a function view.
4. **View state lives in the URL** (`?lens=…&coverage=…`). The page stays a Server Component, and the switchers are links rather than client state (`scroll={false}`, so switching doesn't jump to the top). Any view can be linked to, reloading keeps it, and the back button works.
5. **Coverage has two sources behind a toggle.**
   - **Our customers:** the share of customer workspaces with an agent live or piloting on each use case's processes. It's shown as percentages, because totals differ by hundreds between use cases and fractions like 212/480 don't compare well.
   - **Our team:** how much of our own functions' work runs on agents, as process counts. This reuses the Overview's data.

   The default is customers for All functions and team for a function view. In a function view, that function's own row gets a tint and an accent bar, with the label repeated for screen readers.
6. **A systems heartbeat sits at the top right.** The top row becomes metrics, newsfeed and heartbeat in a 4 / 5 / 3 column split. Each service shows its name and a red / yellow / green dot.
   - **Color is never the only signal.** Problem rows spell out their status and reading ("Down · Token missing"), and every dot has a label.
   - **Problems sort to the top.** The heading shows a count per color, and a service that is down pulses.
   - **Height:** on wide screens the newsfeed and heartbeat lists sit outside the layout flow, so the metric cards set the row's height and the lists scroll to match.
7. **Both screens share the section components.** Differences are handled with small props (descriptions, the "+" label, the org-wide label, a source label on feed chips, and the coverage row header, total label, number format and highlighted row) rather than forked copies.
8. **The product mock data has its own file**, `src/lib/mock-product-data.ts`. It reuses the types in `mock-data.ts`. That file is shared by several screens, and the product data changes for different reasons.

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| **A customer-admin dashboard** (hours saved, plan usage, approvals queue) | The first proposal, but it's what a customer sees in their own workspace, not what the product team needs. It could become a third screen once multi-tenant SaaS (PRD V2) exists. |
| **A company-wide revenue console** (customers, revenue, activation, churn across the whole base) | A different job: running the business rather than the product. Mixing revenue reporting with product decisions would crowd both. |
| **Replacing the Overview** | The Overview still answers the organization-adoption question. The request was explicitly for a second screen. |
| **View choice in React state** | Less code, but views couldn't be linked to, reloading would lose the choice, and the page would have to become a Client Component. |
| **One route per function** (`/product/[lens]`) | Just as linkable. Rejected because the function choice filters one screen rather than leading to a different page, and the coverage view would still be a query parameter. |
| **A separate priority list per function** | Cross-functional items would be copied into several lists, with no single ranking. One pool plus `affects` keeps one order. |

## Consequences

**Positive**

- One layout serves the PM and four function managers, and any view can be shared as a link.
- No new taxonomy. The functions are the business units that Marketplace and Prompts already use.
- A change to one section lands on both screens.
- It stays a Server Component with no client state, consistent with the other Dashboard screen.

**Negative / risks**

- **No section has a real data source.** Wiring this up needs:
  - eval results per agent and release;
  - per-workspace usage and activation;
  - customer feedback, ticketing and CRM signals;
  - health checks per service;
  - a notifications store with read state tracked per user.

  None of these is in the drafted schema.
- **"Our customers" presumes customer workspaces**, which only exist once multi-tenant SaaS (V2) does. Until then, that view can only be mocked.
- **The metric definitions are placeholders.** Activation window, what counts as autonomous, and cost-per-task numerator and denominator all need agreeing before real numbers can be trusted.
- **The priorities are hand-ranked in the mock.** Real data needs a ranking rule (impact, urgency, how many functions it affects) or a model. The "+" and several text actions have no behavior yet.
- **The 4 / 5 / 3 top row truncates newsfeed headers** at common laptop widths. The full text is in the hover tooltip.
- **The shared components have grown props.** If the two screens drift much further apart, forking will be cheaper than adding more.
- **At phone width the page still scrolls sideways**, because of the shared nav bar's overflow (not specific to this screen).

## Follow-ups

- [ ] Agree precise definitions for the four product-health metrics before wiring any of them.
- [ ] Choose sources: eval-runner results, usage and activation events, service health checks for the heartbeat, and the ticketing / CRM signals behind the feed. Decide where notifications and their read state are stored.
- [ ] Decide what the "+" and the inert priority actions do (already on the backlog).
- [ ] Define a ranking rule for the priorities pool.
- [ ] Revisit the "Our customers" coverage view once the multi-tenant decision is made. This ADR may then be superseded.
- [ ] Fix the shared nav's overflow at phone width.
