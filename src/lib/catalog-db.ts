import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { catalogEntries } from "@/db/schema";
import type { BlockType } from "./block-catalog";
import type { CostModel, PipelineStep } from "./types";

// Capped per block: with 300+ synced models, dumping every candidate into the
// analyze prompt would bloat it and overwhelm smaller local models. No
// popularity/quality ranking yet (see backlog) — alphabetical is a placeholder.
const MAX_OPTIONS_PER_BLOCK = 15;

export async function getCatalogOptionsForBlock(blockType: BlockType): Promise<PipelineStep[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(catalogEntries)
    .where(
      and(
        eq(catalogEntries.blockType, blockType),
        // kind IN ('model', 'service') — the only kinds directly runnable as a PipelineStep
      ),
    )
    .orderBy(asc(catalogEntries.name))
    .limit(MAX_OPTIONS_PER_BLOCK * 3); // over-fetch, then filter kind below (avoids a raw SQL IN clause)

  return rows
    .filter((row) => row.kind === "model" || row.kind === "service")
    .slice(0, MAX_OPTIONS_PER_BLOCK)
    .map(
      (row): PipelineStep => ({
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
      }),
    );
}
