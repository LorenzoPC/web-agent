import type { PipelineStep } from "./types";

export type BlockType = "data-source" | "processing" | "delivery";

export const BLOCK_TYPES: { id: BlockType; name: string; description: string }[] = [
  {
    id: "data-source",
    name: "Data source",
    description: "Where the raw information for your challenge comes from",
  },
  {
    id: "processing",
    name: "Processing",
    description: "The model step that analyzes, summarizes, or transforms the data",
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "How the result reaches you",
  },
];

// Catalog options are shaped like PipelineStep so a selected option can be used
// directly as a pipeline step once a flow is built.
export const BLOCK_CATALOG: Record<BlockType, PipelineStep[]> = {
  "data-source": [
    {
      id: "search-api",
      name: "Web/search API lookup",
      description: "Query a third-party search or data API for fresh external information",
      sourceType: "api",
      sourceLabel: "Search API",
      stepKind: "external",
      unit: "request",
      estimatedUnits: 1,
      cost: { kind: "perRequest", dollarsPerRequest: 0.008 },
    },
    {
      id: "local-documents",
      name: "Local document retrieval",
      description: "Embedding search over documents you already have",
      sourceType: "local",
      sourceLabel: "Ollama · nomic-embed-text",
      stepKind: "embedding",
      modelRef: "local > nomic-embed-text",
      unit: "1K tokens",
      estimatedUnits: 2,
      cost: { kind: "free" },
    },
  ],
  processing: [
    {
      id: "openai-summarize",
      name: "OpenAI · gpt-5.4",
      description: "Cloud API reasoning/summarization, strong general quality",
      sourceType: "api",
      sourceLabel: "OpenAI · gpt-5.4",
      stepKind: "chat",
      modelRef: "openai > gpt-5.4",
      unit: "1K tokens",
      estimatedUnits: 3,
      cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
    },
    {
      id: "anthropic-summarize",
      name: "Anthropic · claude-haiku-4.5",
      description: "Cloud API reasoning/summarization, lower cost",
      sourceType: "api",
      sourceLabel: "Anthropic · claude-haiku-4.5",
      stepKind: "chat",
      modelRef: "anthropic > claude-haiku-4.5",
      unit: "1K tokens",
      estimatedUnits: 3,
      cost: { kind: "tokens", inputPerMillion: 1, outputPerMillion: 5 },
    },
    {
      id: "local-llama",
      name: "Ollama · llama3.2:latest",
      description: "Local model, no per-call cost, needs a running local Ollama server",
      sourceType: "local",
      sourceLabel: "Ollama · llama3.2:latest",
      stepKind: "chat",
      modelRef: "local > llama3.2:latest",
      unit: "1K tokens",
      estimatedUnits: 3,
      cost: { kind: "free" },
    },
  ],
  delivery: [
    {
      id: "email-delivery",
      name: "Email delivery",
      description: "Format and send the result as an email",
      sourceType: "api",
      sourceLabel: "Email API",
      stepKind: "external",
      unit: "request",
      estimatedUnits: 1,
      cost: { kind: "perRequest", dollarsPerRequest: 0.001 },
    },
    {
      id: "dashboard-only",
      name: "Dashboard display only",
      description: "Show the result in-app; no external delivery",
      sourceType: "local",
      sourceLabel: "In-app",
      stepKind: "external",
      unit: "request",
      estimatedUnits: 1,
      cost: { kind: "free" },
    },
  ],
};
