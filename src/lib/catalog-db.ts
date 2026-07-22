import { and, asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogEntries } from "@/db/schema";
import type { BlockType } from "./block-catalog";
import type { CostModel, PipelineStep } from "./types";

// Capped per section: with 300+ synced models, dumping every candidate into the
// analyze prompt would bloat it and overwhelm smaller local models. No
// popularity/quality ranking yet (see backlog) — alphabetical is a placeholder.
const MAX_OPTIONS = 15;

export interface CatalogCard {
  id: string;
  name: string;
  description: string;
  provider?: string;
  cost: CostModel;
  executor?: string;
}

function toPipelineStep(row: typeof catalogEntries.$inferSelect): PipelineStep {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    sourceType: (row.sourceType ?? "api") as PipelineStep["sourceType"],
    sourceLabel: row.provider ? `${row.provider} · ${row.name}` : row.name,
    stepKind: (row.stepKind ?? "external") as PipelineStep["stepKind"],
    modelRef: row.modelRef ?? undefined,
    unit: row.unit ?? "request",
    estimatedUnits: row.estimatedUnits ? Number(row.estimatedUnits) : 1,
    cost: row.cost as CostModel,
    systemPrompt: row.systemPrompt ?? undefined,
  };
}

function toCatalogCard(row: typeof catalogEntries.$inferSelect): CatalogCard {
  const metadata = (row.metadata ?? {}) as { executor?: string };
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    provider: row.provider ?? undefined,
    cost: row.cost as CostModel,
    executor: metadata.executor,
  };
}

export type CatalogCategory = "data-source" | "delivery" | "agent" | "tools" | "mcp-servers" | "rag-sources";

export const CATALOG_CATEGORY_COPY: Record<CatalogCategory, { title: string; subtitle: string }> = {
  "data-source": {
    title: "All data sources",
    subtitle: "Every data source in the catalog, not just the ones recommended for your goal.",
  },
  delivery: {
    title: "All delivery options",
    subtitle: "Every delivery destination in the catalog, not just the ones recommended for your goal.",
  },
  agent: {
    title: "All agents",
    subtitle: "Every agent persona in the catalog, not just the ones recommended for your goal.",
  },
  tools: {
    title: "All tools",
    subtitle: "Every tool in the catalog, not just the ones recommended for your goal.",
  },
  "mcp-servers": {
    title: "All MCP servers",
    subtitle: "Every MCP server in the catalog, not just the ones recommended for your goal.",
  },
  "rag-sources": {
    title: "All RAG sources",
    subtitle: "Every RAG source in the catalog, not just the ones recommended for your goal.",
  },
};

/** Uncapped, paginated fetch for a category's full catalog — backs the "Search something else" modal. */
export async function searchCatalogCategory(
  category: CatalogCategory,
  offset: number,
  limit: number,
): Promise<{ items: (PipelineStep | CatalogCard)[]; hasMore: boolean }> {
  const db = getDb();

  const isBlockCategory = category === "data-source" || category === "delivery";
  const where = isBlockCategory
    ? and(
        eq(catalogEntries.blockType, category as BlockType),
        or(eq(catalogEntries.kind, "model"), eq(catalogEntries.kind, "service")),
      )
    : category === "agent"
      ? and(eq(catalogEntries.kind, "agent"), eq(catalogEntries.blockType, "processing"))
      : eq(catalogEntries.kind, CATALOG_KIND_BY_CARD_CATEGORY[category]);

  const rows = await db
    .select()
    .from(catalogEntries)
    .where(where)
    .orderBy(asc(catalogEntries.name))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const items = isBlockCategory || category === "agent" ? page.map(toPipelineStep) : page.map(toCatalogCard);
  return { items, hasMore };
}

const CATALOG_KIND_BY_CARD_CATEGORY: Record<"tools" | "mcp-servers" | "rag-sources", "hook" | "mcp-server" | "rag-pattern"> = {
  tools: "hook",
  "mcp-servers": "mcp-server",
  "rag-sources": "rag-pattern",
};

export async function getCatalogOptionsForBlock(blockType: BlockType): Promise<PipelineStep[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogEntries)
    .where(eq(catalogEntries.blockType, blockType))
    .orderBy(asc(catalogEntries.name))
    .limit(MAX_OPTIONS * 3); // over-fetch, then filter kind below (avoids a raw SQL IN clause)

  return rows
    .filter((row) => row.kind === "model" || row.kind === "service")
    .slice(0, MAX_OPTIONS)
    .map(toPipelineStep);
}

/** Agent personas (kind='agent') — runnable as the "processing" step, carrying a systemPrompt. */
export async function getAgentOptions(): Promise<PipelineStep[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogEntries)
    .where(and(eq(catalogEntries.kind, "agent"), eq(catalogEntries.blockType, "processing")))
    .orderBy(asc(catalogEntries.name))
    .limit(MAX_OPTIONS);
  return rows.map(toPipelineStep);
}

/** Catalog-only cards (hook/mcp-server/rag-pattern) — attached to an agent step, not runnable steps themselves. */
export async function getCatalogCardsByKind(
  kind: "hook" | "mcp-server" | "rag-pattern",
): Promise<CatalogCard[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogEntries)
    .where(eq(catalogEntries.kind, kind))
    .orderBy(asc(catalogEntries.name))
    .limit(MAX_OPTIONS);
  return rows.map(toCatalogCard);
}
