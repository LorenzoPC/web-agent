import { Output, generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BLOCK_CATALOG, BLOCK_TYPES } from "@/lib/block-catalog";
import { registry } from "@/lib/providers";

const analysisSchema = z.object({
  blocks: z
    .array(
      z.object({
        blockType: z.enum(["data-source", "processing", "delivery"]),
        rationale: z.string(),
        recommendedOptionIds: z.array(z.string()).min(1).max(3),
      }),
    )
    .length(3),
});

function catalogSummary() {
  return BLOCK_TYPES.map(
    (block) =>
      `${block.name} (${block.id}): ${block.description}\n` +
      BLOCK_CATALOG[block.id]
        .map((option) => `  - ${option.id}: ${option.name} — ${option.description}`)
        .join("\n"),
  ).join("\n\n");
}

export async function POST(req: Request) {
  const { challenge } = (await req.json()) as { challenge?: string };
  if (!challenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  try {
    const modelRef = process.env.ECOSYSTEM_ANALYZE_MODEL ?? "local > llama3.2:latest";
    const { output } = await generateText({
      model: registry.languageModel(modelRef as Parameters<typeof registry.languageModel>[0]),
      prompt:
        `A user wants to build an AI pipeline for this challenge:\n"${challenge}"\n\n` +
        `Here is the catalog of available options, grouped by block:\n\n${catalogSummary()}\n\n` +
        `For each of the three blocks (data-source, processing, delivery), recommend 1-3 catalog ` +
        `option ids (by their exact id string) that best fit this challenge, ranked best first, ` +
        `with a one-sentence rationale. Only use option ids that appear in the catalog above.`,
      output: Output.object({ schema: analysisSchema }),
    });

    const blocks = output.blocks.map((block) => {
      const catalogOptions = BLOCK_CATALOG[block.blockType];
      const validIds = new Set(catalogOptions.map((o) => o.id));
      const optionIds = [...new Set(block.recommendedOptionIds)].filter((id) => validIds.has(id));
      const options = (optionIds.length > 0 ? optionIds : catalogOptions.map((o) => o.id))
        .map((id) => catalogOptions.find((o) => o.id === id))
        .filter((o) => o != null);
      return { blockType: block.blockType, rationale: block.rationale, options };
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 502 },
    );
  }
}
