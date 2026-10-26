# ADR-0001 — Discovery session: realtime voice interview that drafts a tool recipe

**Status:** Proposed. A frontend mockup of the UI is built: it plays a scripted interview with no audio and no API route, and fills the form through the same patch contract (`applyRecipePatch`). The realtime wiring described below isn't implemented yet.
**Created:** 2026-10-23
**Related:** [`../design/web-agent.md`](../design/web-agent.md) (Key decisions → "Provider strategy"), Create Tool screen (`src/app/tools/new/`, `src/components/tools/`, `src/lib/tool-recipe.ts`)

---

## Context

The Create Tool screen (`/tools/new`) builds a tool recipe in seven sections: Identity, Inputs, Execution, Authentication, Output, Guardrails, Cost. Users can start blank or from a template. Filling it in well takes knowing what a good recipe looks like, especially the model-facing description and the input descriptions.

The new **"Discovery session"** option under *Start from* replaces that blank page with a spoken, guided interview. An AI interviewer asks about the job the tool should do, and the form fills itself in as the user answers.

Constraints that shape the decision:

- **Provider strategy is direct provider SDKs** (`@ai-sdk/openai`, `@ai-sdk/anthropic`), not the Vercel AI Gateway. That's an explicit, standing choice recorded in the design doc.
- **`OPENAI_API_KEY` is not set in `.env.local` today.** `.env.example` expects it, but only local, Exa and Neon credentials are configured.
- **The form's state lives in the browser.** Recipes aren't persisted yet, which matches the Prompts and Patterns screens.
- **AI SDK v7 ships realtime voice as experimental.** It provides `experimental_useRealtime` in `@ai-sdk/react`, `openai.experimental_realtime(...)` with `.getToken()`, and `experimental_getRealtimeToolDefinitions`. Tool calls in a realtime session are executed by the client, through `onToolCall`.
- **Auth is a mock.** `getCurrentUser()` returns a fixed demo user, so any endpoint that spends money on the server key is effectively open.

## Decision

Build the Discovery session on **AI SDK realtime against OpenAI directly**, with the model filling in the form through **tool calls handled in the browser**.

1. **One speech-to-speech session.** `experimental_useRealtime` with `openai.experimental_realtime(DISCOVERY_REALTIME_MODEL)` handles listening, speaking, transcription and turn-taking (`semantic-vad`) in a single WebSocket session. The model id is one shared constant, so the token route and the client can't drift apart.
2. **The server mints the token.** A new route, `POST /api/tools/discovery/session`, calls `openai.experimental_realtime.getToken()` with the server-side key and returns a short-lived token plus the tool definitions. The API key never reaches the browser. If the key is missing, the route returns a clear error, and the UI shows a "needs `OPENAI_API_KEY`" state instead of failing silently. The rest of Create Tool is unaffected.
3. **The form fills through one patch tool.** The interviewer calls `update_tool_recipe` with any subset of the recipe's fields whenever it has learned something. The browser validates the arguments, merges them into the editor's state (the same state the manual form edits), and returns the updated **recipe check** results. The model then knows which sections are still missing or weak, and asks about those next. A second tool, `finish_discovery`, ends the interview once the recipe check has no ✕ items or the user is done. One patch tool is preferred over one tool per section, because a single answer often covers several sections (for example, "it searches the web, read-only, about a cent a call").
4. **The contract is defined once.** A single zod schema describes the patch. The server turns it into the realtime tool definition (via `tool()` and `experimental_getRealtimeToolDefinitions`). The browser uses the same schema to `safeParse` the arguments before merging. Model output is treated as untrusted input: invalid arguments are rejected and the error is returned to the model, never partially applied.
5. **The user stays in control.**
   - Everything the interviewer writes lands in the normal, editable form, and fields filled by the interview are marked.
   - Nothing is created automatically. **Create tool** is still a user click, gated by the recipe check.
   - The microphone is only requested after an explicit **Start** click, and capture stops on end, disconnect or unmount.
   - A one-line notice before starting says audio is sent to OpenAI.
6. **A transcript and a typed fallback are always available.** Input and output transcription are on, so the user sees what was heard and said. A text box sends typed answers (`sendTextMessage`) when the mic is unavailable or the room is noisy.
7. **The interviewer speaks first.** After connecting, the client calls `requestResponse()`, so the session opens with a greeting and the first question rather than silence.

## Alternatives considered

| Option | Why not (for now) |
|---|---|
| **Realtime through the Vercel AI Gateway** (`gateway.experimental_realtime`) | It would work today, using the `VERCEL_OIDC_TOKEN` already in `.env.local`, and it isn't tied to one provider. Rejected only because of the standing direct-SDK decision. It's the cheapest switch if that decision is revisited: the client code is the same apart from the model factory and the token call. |
| **Browser Web Speech API** (`SpeechRecognition` + `speechSynthesis`) plus a text model through the existing registry | Free, and needs no key. But Firefox has no speech recognition, and Chrome's recognition sends audio to Google anyway, so it isn't more private. The voice sounds robotic, the user can't interrupt it, and turn-taking would have to be built by hand. Small local models are also already known to call tools unreliably (see the design doc), so prefilling would be weak. |
| **A server pipeline in stages:** record a clip, transcribe, `generateText` with tools, `generateSpeech` | Each stage could be swapped, including for local Whisper, and it fits the existing route-handler pattern. But it means three round-trips per turn, which adds seconds of latency and forces push-to-talk, and it needs more code (audio encoding, a playback queue). Worth revisiting if the experimental realtime API proves unstable. |
| **A typed chat interview** with no audio | Doesn't meet the requirement for a voice interview. It's kept as the in-session typed fallback (point 6). |

## Consequences

**Positive**

- The interview is natural and responsive. The form fills in visibly as the user talks, and the recipe check steers the interviewer toward what's missing.
- The API key stays on the server, and the tool contract is defined in one place and checked on both sides.
- It reuses the editor's existing state, recipe check and Create flow. Discovery is just another way into the same form.

**Negative / risks**

- **It needs `OPENAI_API_KEY`,** which isn't configured yet. Until it is, Discovery shows the missing-key state.
- **It's paid per audio minute, and the app doesn't show that cost yet.** The app's premise is projected cost per step, and this session currently has no cost or duration readout (see follow-ups).
- **It depends on an experimental API from a single provider.** The realtime API may change between AI SDK releases. It's isolated to one component, one route and one shared schema module to keep any rework contained.
- **Anyone who can reach the token route can start paid OpenAI sessions** on the server key. With mock auth, that means anyone at all. It must be behind real authentication and rate-limited before production.
- **The interviewer can write weak or wrong fields.** This is mitigated by schema validation, recipe-check feedback to the model, marked AI-filled fields, and the user's final review before Create.
- **Audio leaves the device for OpenAI.** The notice before the mic starts covers this, but it's a change from the rest of the app, where local-hardware options exist.

## Follow-ups

- [ ] Replace the mockup's scripted playback (`src/components/tools/discovery-session.tsx`, `MOCK_DISCOVERY_SCRIPT`) with the realtime session described above. The patch contract and editor wiring stay as they are.
- [ ] Add `OPENAI_API_KEY` to `.env.local`, and to Vercel env for preview and production.
- [ ] Put real auth and rate limiting on `POST /api/tools/discovery/session` before production.
- [ ] Show session duration and estimated cost in the Discovery panel, using the app's `CostModel`.
- [ ] Revisit Gateway versus direct if the provider-strategy decision changes. This ADR would then be superseded.
- [ ] Once recipes are persisted, decide whether to keep interview transcripts alongside them.
