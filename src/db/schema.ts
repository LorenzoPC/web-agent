import { jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Catalog entry kinds: a model or service is directly usable as a PipelineStep
// (has blockType/sourceType/stepKind/modelRef set); hook/rag-pattern/mcp-server
// are catalog-only for now — browsable reference data, not yet selectable in the
// Ecosystem builder (see docs/design/web-agent.md).
export const catalogEntries = pgTable("catalog_entries", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(), // 'model' | 'service' | 'hook' | 'rag-pattern' | 'mcp-server'
  blockType: text("block_type"), // 'data-source' | 'processing' | 'delivery' | null
  sourceType: text("source_type"), // 'local' | 'remote' | 'api' | null
  stepKind: text("step_kind"), // 'chat' | 'embedding' | 'external' | null
  name: text("name").notNull(),
  description: text("description"),
  provider: text("provider"),
  modelRef: text("model_ref"), // registry key, e.g. "openai > gpt-5.4"; null for non-runnable kinds
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
