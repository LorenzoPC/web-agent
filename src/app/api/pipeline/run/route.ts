import { embed, generateText } from "ai";
import { NextResponse } from "next/server";
import { MOCK_PIPELINE } from "@/lib/pipeline-data";
import { registry } from "@/lib/providers";
import type { ActualUsage } from "@/lib/types";

// registry.languageModel/embeddingModel expect a literal `"provider > model"` union;
// modelRef is a runtime-configured string, so it's narrowed here rather than in the shared type.
type RegistryModelRef = Parameters<typeof registry.languageModel>[0];

export async function POST(req: Request) {
  const { stepId, input } = (await req.json()) as {
    stepId?: string;
    input?: string;
  };

  const step = MOCK_PIPELINE.find((s) => s.id === stepId);
  if (!step) {
    return NextResponse.json({ error: `Unknown step: ${stepId}` }, { status: 404 });
  }

  const startedAt = Date.now();

  try {
    if (step.stepKind === "external") {
      return NextResponse.json({
        output: `[stub] would call ${step.sourceLabel} for: ${input}`,
        usage: { durationMs: Date.now() - startedAt } satisfies ActualUsage,
      });
    }

    if (!step.modelRef) {
      return NextResponse.json({ error: `Step ${step.id} has no modelRef` }, { status: 500 });
    }

    if (step.stepKind === "embedding") {
      const { embedding, usage } = await embed({
        model: registry.embeddingModel(step.modelRef as RegistryModelRef),
        value: input ?? "",
      });
      return NextResponse.json({
        output: `Embedded (${embedding.length} dims)`,
        usage: {
          durationMs: Date.now() - startedAt,
          inputTokens: usage?.tokens,
        } satisfies ActualUsage,
      });
    }

    const { text, usage } = await generateText({
      model: registry.languageModel(step.modelRef as RegistryModelRef),
      prompt: input ?? "",
    });

    return NextResponse.json({
      output: text,
      usage: {
        durationMs: Date.now() - startedAt,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      } satisfies ActualUsage,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Step failed" },
      { status: 502 },
    );
  }
}
