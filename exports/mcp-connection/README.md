# MCP connection mockup: export from web-agent

Everything needed to keep working on the MCP connection mockup in another repo. Copied from [LorenzoPC/web-agent](https://github.com/LorenzoPC/web-agent) at commit `6e98576` (2026-11-25). The folders keep their original paths, so you can copy `src/` and `docs/` into the root of the other repo.

This folder is a snapshot for moving the mockup to another repo. Don't edit it here: the files web-agent actually uses are at the same paths in this repo's own `src/` and `docs/`.

The page is where a client organization's admin chooses which AI clients their people may connect to the MCP server from, how each one signs people in, and how the organization moves off its shared credential. It's a frontend on mock data: nothing is saved and nothing calls a server.

**Before redesigning it, read `docs/adr/0004-mcp-per-person-sign-in.md`.** Its sections "What changes on the MCP connection page" and "Open questions" say what to change and what's still undecided.

## What's here

**The page**

| File | What it holds |
|---|---|
| `src/app/app/settings/mcp/page.tsx` | The page (a server component): heading, description and the mock data passed to the settings component. |
| `src/components/mcp-connection/connection-settings.tsx` | Summary strip, shared-credential banner, list of AI clients, and the selected client's panel. |
| `src/components/mcp-connection/client-panel.tsx` | One AI client's panel: sign-in options, setup steps, "Set these exactly" table, shared-credential card, "Who can connect" and the connection check. |
| `src/lib/mcp-connection.ts` | Logic: statuses, current sign-in option, the connection check's steps, install links. |
| `src/lib/mock-mcp-connection-data.ts` | Types and mock data. Its header ranks what to validate, and `VERIFY`, `MOCK` and `DECIDE` tags mark what isn't settled. |

**Shared helpers it uses**

| File | What it provides |
|---|---|
| `src/lib/mock-onboarding-data.ts` | `MCP_URL`. The page only needs that constant, so you can replace the file with it. |
| `src/components/onboarding/copy-button.tsx` | The copy buttons. |
| `src/components/tools/form-controls.tsx` | `Field`, `Section`, `Segmented`, `INPUT_CLASS` and `MONO_INPUT_CLASS`. |
| `src/lib/unbuilt.ts` | `unbuilt("action" \| "panel", …)`, which marks UI that needs a backend that isn't built yet. |
| `src/app/unbuilt.css` | The CSS that paints those markers orange. Taken out of web-agent's `globals.css` for this export. |

**Docs**

| File | Why |
|---|---|
| `docs/adr/0004-mcp-per-person-sign-in.md` | The sign-in decision, what changes on this page, every file it uses, and the open questions. |
| `docs/adr/0003-mcp-server-security-and-governance.md` | The security decisions ADR-0004 amends. ADR-0004 refers to them by number. |

## What the other repo needs

- Next.js with the App Router, written against Next.js 16.2.10. The only Next.js import is `next/link`.
- React 19 and Tailwind CSS v4. No other packages.
- The `@/` import alias pointing to `src/` (in `tsconfig.json`: `"paths": { "@/*": ["./src/*"] }`).

## After copying

1. **Add the CSS.** In your main stylesheet, after `@import "tailwindcss";`, add `@import "./unbuilt.css";` (adjust the path to where you put it).
2. **Move the route if needed.** The page is at `/app/settings/mcp` because of web-agent's sitemap. Move `src/app/app/settings/mcp/` to wherever it belongs in your app.
3. **Fix the Get started link.** The description in `page.tsx` links to `/app/onboarding`, which won't exist in the other repo. Point it elsewhere or remove it.
4. **Expect web-agent's look to differ.** The page uses standard Tailwind colours (zinc, amber, green, red), so it picks up your app's fonts and base styles, not web-agent's.

## Not included

- web-agent's nav, layout and the other pages.
- The Create MCP server page (`/admin/mcp-servers/new`). It needs 15 more files, including a 1,700-line shared mock data file, plus the `ai` and `zod` packages.
