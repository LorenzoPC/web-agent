import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { catalogEntries, catalogEntryCategories } from "../src/db/schema";
import type { CostModel } from "../src/lib/types";

// Only providers our registry (src/lib/providers.ts) actually resolves
// directly — everything else is synced as browsable catalog data
// (blockType/stepKind/modelRef left null) since /api/pipeline/run couldn't
// execute it yet. Keeps "Build flow" honest: every selectable option runs.
const RUNNABLE_LANGUAGE_PROVIDERS = new Set(["openai", "anthropic"]);
const RUNNABLE_EMBEDDING_PROVIDERS = new Set(["openai"]);

type GatewayModel = {
  id: string;
  type: string;
  name?: string;
  description?: string;
  owned_by?: string;
  tags?: string[] | null;
  pricing?: Record<string, string> | null;
};

function categoriesFor(model: GatewayModel): string[] {
  const categories = new Set<string>();
  const tags = model.tags ?? [];

  if (tags.includes("vision")) {
    categories.add("computer-vision");
    categories.add("multimodal");
  }
  if (tags.includes("file-input")) categories.add("multimodal");
  if (tags.includes("tool-use")) categories.add("agentic-tool-use");
  if (tags.includes("web-search")) categories.add("search");
  if (tags.includes("image-generation")) categories.add("image-generation");
  if (tags.includes("video-generation")) categories.add("video-generation");

  switch (model.type) {
    case "language":
      categories.add("natural-language-processing");
      break;
    case "embedding":
    case "reranking":
      categories.add("embeddings-retrieval");
      break;
    case "image":
      categories.add("image-generation");
      break;
    case "video":
      categories.add("video-generation");
      break;
    case "speech":
    case "transcription":
    case "realtime":
      categories.add("speech-audio");
      break;
  }
  return [...categories];
}

function costFor(model: GatewayModel): CostModel {
  const input = model.pricing?.input ? Number(model.pricing.input) : undefined;
  const output = model.pricing?.output ? Number(model.pricing.output) : undefined;
  if (input != null) {
    return {
      kind: "tokens",
      inputPerMillion: input * 1_000_000,
      outputPerMillion: (output ?? input) * 1_000_000,
    };
  }
  // No usable per-token pricing published (common for some image/video models) —
  // flagged in metadata.pricingIncomplete rather than silently claiming "free".
  return { kind: "perRequest", dollarsPerRequest: 0 };
}

function runnableFields(model: GatewayModel) {
  const [providerPrefix, ...rest] = model.id.split("/");
  const modelIdPart = rest.join("/");

  if (model.type === "language" && RUNNABLE_LANGUAGE_PROVIDERS.has(providerPrefix)) {
    return {
      blockType: "processing",
      stepKind: "chat",
      sourceType: "api",
      modelRef: `${providerPrefix} > ${modelIdPart}`,
    };
  }
  if (model.type === "embedding" && RUNNABLE_EMBEDDING_PROVIDERS.has(providerPrefix)) {
    return {
      blockType: "data-source",
      stepKind: "embedding",
      sourceType: "api",
      modelRef: `${providerPrefix} > ${modelIdPart}`,
    };
  }
  return { blockType: null, stepKind: null, sourceType: null, modelRef: null };
}

async function main() {
  const res = await fetch("https://ai-gateway.vercel.sh/v1/models");
  if (!res.ok) throw new Error(`AI Gateway request failed: ${res.status}`);
  const { data: models } = (await res.json()) as { data: GatewayModel[] };

  const db = getDb();
  let inserted = 0;

  for (const model of models) {
    const { blockType, stepKind, sourceType, modelRef } = runnableFields(model);
    const cost = costFor(model);
    const pricingIncomplete = cost.kind === "perRequest";

    await db
      .insert(catalogEntries)
      .values({
        id: model.id,
        kind: "model",
        blockType,
        sourceType,
        stepKind,
        name: model.name ?? model.id,
        description: model.description ?? null,
        provider: model.owned_by ?? model.id.split("/")[0],
        modelRef,
        cost,
        unit: "1K tokens",
        estimatedUnits: "3",
        source: "ai-gateway",
        metadata: { gatewayType: model.type, tags: model.tags ?? [], pricingIncomplete },
        syncedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: catalogEntries.id,
        set: {
          blockType,
          sourceType,
          stepKind,
          name: model.name ?? model.id,
          description: model.description ?? null,
          modelRef,
          cost,
          source: "ai-gateway",
          metadata: { gatewayType: model.type, tags: model.tags ?? [], pricingIncomplete },
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // Re-derive category links from scratch each sync (avoids duplicate/stale rows).
    await db.delete(catalogEntryCategories).where(eq(catalogEntryCategories.entryId, model.id));
    const categoryIds = categoriesFor(model);
    if (categoryIds.length > 0) {
      await db
        .insert(catalogEntryCategories)
        .values(categoryIds.map((categoryId) => ({ entryId: model.id, categoryId })));
    }

    inserted += 1;
  }

  console.log(`Synced ${inserted} models from AI Gateway.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
