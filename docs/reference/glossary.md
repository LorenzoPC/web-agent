# Glossary — web-agent

Domain terms used throughout the codebase and documentation.

---

## A

**ActualUsage** — Real usage reported by a provider after a pipeline step runs (`durationMs`, `inputTokens`, `outputTokens`), used to reconcile the pre-run cost projection against what the call actually cost. See `src/lib/types.ts`.

## C

**CostModel** — A discriminated union describing how a pipeline step is actually billed: `free` (local hardware), `duration` (rented remote GPU, billed by wall-clock time), `tokens` (API model calls, billed per input/output token), or `perRequest` (flat per-call API charge). Replaces a single flat cost formula because the three source types genuinely bill differently. See `src/lib/types.ts`.

## M

**modelRef** — A provider registry key on a `PipelineStep` (e.g. `"local > llama3.2:3b"`, `"openai > gpt-5.4"`) used to resolve the actual `LanguageModel` to call via `registry.languageModel()`/`registry.embeddingModel()`. See `src/lib/providers.ts`.

## O

**OpenAI-compatible endpoint** — An inference server (Ollama, or a rented GPU box) that speaks the OpenAI chat-completions API shape. Used for both `local` and `remote` source types via `@ai-sdk/openai-compatible`'s `createOpenAICompatible`, so they share the same `LanguageModel` interface as direct API providers.

## P

**PipelineStep** — One stage of the mock AI pipeline (e.g. "Retrieve context", "Generate response"), with a `sourceType` (`local`/`remote`/`api`), `stepKind` (`chat`/`embedding`/`external`), and a `CostModel`. See `src/lib/pipeline-data.ts` for the current mock pipeline.

**Provider registry** — The `createProviderRegistry` instance in `src/lib/providers.ts` mixing local/remote OpenAI-compatible endpoints with direct provider SDKs (`@ai-sdk/openai`, `@ai-sdk/anthropic`) behind one lookup, keyed by `modelRef`.

## S

**sourceType** — Where a pipeline step's model actually runs: `local` (hardware you own, free), `remote` (rented hardware, billed by time), or `api` (a paid API, billed per token or per request).

**stepKind** — What kind of AI SDK call a step makes: `chat` (`generateText`), `embedding` (`embed`), or `external` (a plain fetch — currently stubbed for the `call-tool` step, no real search API wired yet).
