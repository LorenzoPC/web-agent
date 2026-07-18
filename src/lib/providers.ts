import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createProviderRegistry } from "ai";

// Local/remote hardware are OpenAI-compatible endpoints (e.g. Ollama), unified
// with the direct provider SDKs behind one registry. `>` is used as the
// separator since local/remote model ids (e.g. Ollama's "llama3.2:3b") contain
// colons.
export const registry = createProviderRegistry(
  {
    local: createOpenAICompatible({
      name: "local",
      baseURL: process.env.LOCAL_MODEL_BASE_URL ?? "http://localhost:11434/v1",
      // Ollama (0.5+) supports the OpenAI-compatible json_schema response format;
      // without this the AI SDK won't send a schema at all, and small local
      // models rarely produce valid structured output unprompted.
      supportsStructuredOutputs: true,
    }),
    remote: createOpenAICompatible({
      name: "remote",
      baseURL: process.env.REMOTE_MODEL_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.REMOTE_MODEL_API_KEY,
      supportsStructuredOutputs: true,
    }),
    openai,
    anthropic,
  },
  { separator: " > " },
);
