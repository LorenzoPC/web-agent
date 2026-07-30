import { integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Catalog entry kinds: 'model' | 'service' | 'agent' | 'hook' | 'rag-pattern' | 'mcp-server'.
// Model/service/agent are directly usable as a PipelineStep (blockType/sourceType/
// stepKind/modelRef set); hook/rag-pattern/mcp-server are catalog-only by default —
// browsable reference data. A few specific rows carry metadata.executor, which
// /api/pipeline/run recognizes to wire real behavior (Exa search, GitHub MCP,
// local RAG retrieval) — see docs/design/web-agent.md.
export const catalogEntries = pgTable("catalog_entries", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  blockType: text("block_type"), // 'data-source' | 'processing' | 'delivery' | null
  sourceType: text("source_type"), // 'local' | 'remote' | 'api' | null
  stepKind: text("step_kind"), // 'chat' | 'embedding' | 'external' | null
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider"),
  modelRef: text("model_ref"), // registry key, e.g. "openai > gpt-5.4"; null for non-runnable kinds
  systemPrompt: text("system_prompt"), // 'agent' kind: the persona's system prompt
  role: text("role"), // 'agent' kind: display role for the marketplace, e.g. "Research Analyst"
  cost: jsonb("cost").notNull(), // CostModel payload
  unit: text("unit"),
  estimatedUnits: numeric("estimated_units"),
  source: text("source").notNull(), // 'ai-gateway' | 'curated'
  metadata: jsonb("metadata"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const catalogTaskCategories = pgTable("catalog_task_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
});

export const catalogEntryCategories = pgTable(
  "catalog_entry_categories",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => catalogEntries.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => catalogTaskCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.categoryId] })],
);

// One row per completed "Run pipeline" chain (not per step — see docs/design/web-agent.md
// for the normalized per-step design this deliberately simplifies away from for now).
// `userId` has no `users` table behind it yet; it's the mock-auth constant from src/lib/auth.ts.
export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  rootInput: text("root_input").notNull(),
  successCriteria: text("success_criteria"),
  status: text("status").notNull(), // 'success' | 'partial' | 'error'
  totalCostUsd: numeric("total_cost_usd").notNull(),
  stepCount: integer("step_count").notNull(),
  steps: jsonb("steps").notNull(), // RunStepSummary[] snapshot — see src/lib/types.ts
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
