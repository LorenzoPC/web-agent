import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { catalogEntries, catalogEntryCategories } from "../src/db/schema";
import type { CostModel } from "../src/lib/types";

type CuratedEntry = {
  id: string;
  kind: "model" | "service" | "hook" | "rag-pattern" | "mcp-server";
  blockType?: "data-source" | "processing" | "delivery";
  sourceType?: "local" | "remote" | "api";
  stepKind?: "chat" | "embedding" | "external";
  modelRef?: string;
  name: string;
  description: string;
  provider?: string;
  cost: CostModel;
  unit?: string;
  estimatedUnits?: string;
  categories: string[];
};

// Modest starting set — not exhaustive. Growing this is ongoing backlog work.
const ENTRIES: CuratedEntry[] = [
  // Services — directly usable as PipelineStep, migrated from the old static block-catalog.ts
  {
    id: "curated:search-api",
    kind: "service",
    blockType: "data-source",
    sourceType: "api",
    stepKind: "external",
    name: "Web/search API lookup",
    description: "Query a third-party search or data API for fresh external information",
    cost: { kind: "perRequest", dollarsPerRequest: 0.008 },
    unit: "request",
    estimatedUnits: "1",
    categories: ["search"],
  },
  {
    id: "curated:email-delivery",
    kind: "service",
    blockType: "delivery",
    sourceType: "api",
    stepKind: "external",
    name: "Email delivery",
    description: "Format and send the result as an email",
    cost: { kind: "perRequest", dollarsPerRequest: 0.001 },
    unit: "request",
    estimatedUnits: "1",
    categories: ["natural-language-processing"],
  },
  {
    id: "curated:dashboard-only",
    kind: "service",
    blockType: "delivery",
    sourceType: "local",
    stepKind: "external",
    name: "Dashboard display only",
    description: "Show the result in-app; no external delivery",
    cost: { kind: "free" },
    unit: "request",
    estimatedUnits: "1",
    categories: ["natural-language-processing"],
  },
  // Local Ollama options — the AI Gateway sync only covers cloud providers, so
  // these keep a free/local choice available in each runnable block (a core
  // part of the app's premise: local vs. remote vs. API cost comparison).
  {
    id: "curated:local-documents",
    kind: "model",
    blockType: "data-source",
    sourceType: "local",
    stepKind: "embedding",
    modelRef: "local > nomic-embed-text",
    name: "Local document retrieval",
    description: "Embedding search over documents you already have",
    provider: "Ollama",
    cost: { kind: "free" },
    unit: "1K tokens",
    estimatedUnits: "2",
    categories: ["embeddings-retrieval"],
  },
  {
    id: "curated:local-llama",
    kind: "model",
    blockType: "processing",
    sourceType: "local",
    stepKind: "chat",
    modelRef: "local > llama3.2:latest",
    name: "Ollama · llama3.2:latest",
    description: "Local model, no per-call cost, needs a running local Ollama server",
    provider: "Ollama",
    cost: { kind: "free" },
    unit: "1K tokens",
    estimatedUnits: "3",
    categories: ["natural-language-processing"],
  },

  // SDK/framework integration hooks — catalog-only (blockType left unset): a hook is a
  // code-level primitive, not a single runnable pipeline step.
  {
    id: "curated:use-chat",
    kind: "hook",
    name: "useChat (AI SDK)",
    description: "React hook for streaming multi-turn chat UIs against a chat route handler",
    provider: "Vercel AI SDK",
    cost: { kind: "free" },
    categories: ["natural-language-processing", "agentic-tool-use"],
  },
  {
    id: "curated:use-completion",
    kind: "hook",
    name: "useCompletion (AI SDK)",
    description: "React hook for streaming single-turn text completions",
    provider: "Vercel AI SDK",
    cost: { kind: "free" },
    categories: ["natural-language-processing"],
  },
  {
    id: "curated:tool-helper",
    kind: "hook",
    name: "tool() (AI SDK)",
    description: "Defines a callable tool with a schema for a model to invoke during generation",
    provider: "Vercel AI SDK",
    cost: { kind: "free" },
    categories: ["agentic-tool-use"],
  },

  // RAG patterns — catalog-only: a composition of other entries (embedding model +
  // vector store, etc.), not a single runnable step.
  {
    id: "curated:rag-embedding-search",
    kind: "rag-pattern",
    name: "Embedding + vector search retrieval",
    description: "Embed documents and the query, retrieve nearest neighbors by vector similarity",
    cost: { kind: "free" },
    categories: ["embeddings-retrieval"],
  },
  {
    id: "curated:rag-hybrid-search",
    kind: "rag-pattern",
    name: "Hybrid search (BM25 + embeddings)",
    description: "Combine keyword search with vector similarity for more robust retrieval",
    cost: { kind: "free" },
    categories: ["embeddings-retrieval", "search"],
  },
  {
    id: "curated:rag-reranking",
    kind: "rag-pattern",
    name: "Reranking pipeline",
    description: "Re-score an initial retrieval candidate set with a cross-encoder for precision",
    cost: { kind: "free" },
    categories: ["embeddings-retrieval"],
  },

  // MCP servers — catalog-only: an external integration point reached via the Model
  // Context Protocol, not a single runnable pipeline step.
  {
    id: "curated:mcp-github",
    kind: "mcp-server",
    name: "GitHub MCP server",
    description: "Read/write GitHub repos, issues, and PRs via MCP",
    cost: { kind: "free" },
    categories: ["agentic-tool-use"],
  },
  {
    id: "curated:mcp-filesystem",
    kind: "mcp-server",
    name: "Filesystem MCP server",
    description: "Read/write local files via MCP",
    cost: { kind: "free" },
    categories: ["agentic-tool-use"],
  },
  {
    id: "curated:mcp-slack",
    kind: "mcp-server",
    name: "Slack MCP server",
    description: "Read/post Slack messages via MCP",
    cost: { kind: "free" },
    categories: ["agentic-tool-use"],
  },
];

async function main() {
  const db = getDb();
  for (const entry of ENTRIES) {
    const { categories, ...values } = entry;
    await db
      .insert(catalogEntries)
      .values({
        ...values,
        source: "curated",
        syncedAt: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: catalogEntries.id,
        set: { ...values, source: "curated", updatedAt: new Date() },
      });

    await db.delete(catalogEntryCategories).where(eq(catalogEntryCategories.entryId, entry.id));
    if (categories.length > 0) {
      await db
        .insert(catalogEntryCategories)
        .values(categories.map((categoryId) => ({ entryId: entry.id, categoryId })));
    }
  }
  console.log(`Seeded ${ENTRIES.length} curated catalog entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
