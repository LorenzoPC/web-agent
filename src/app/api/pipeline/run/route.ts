import { embed, generateText, isStepCount } from "ai";
import { NextResponse } from "next/server";
import { registry } from "@/lib/providers";
import { createExaSearchTool } from "@/lib/tools/exa-search";
import { withGitHubMCPTools } from "@/lib/tools/github-mcp";
import { retrieveRelevantChunks } from "@/lib/tools/local-rag";
import type { ActualUsage, PipelineStep } from "@/lib/types";

// registry.languageModel/embeddingModel expect a literal `"provider > model"` union;
// modelRef is a runtime-configured string, so it's narrowed here rather than in the shared type.
type RegistryModelRef = Parameters<typeof registry.languageModel>[0];

// Only these specific catalog ids actually do anything when attached — everything
// else selectable in the Ecosystem builder's Tools/MCP sections is catalog-only for
// now. See docs/design/web-agent.md "Ecosystem builder v2".
const EXA_SEARCH_TOOL_ID = "curated:tool-web-search";
const GITHUB_MCP_ID = "curated:mcp-github";

export async function POST(req: Request) {
  // The client sends the full step config (not just an id) — a built flow's steps
  // (from the Ecosystem catalog) aren't in any server-side list, so there's nothing
  // to look up by id alone.
  const { step, input } = (await req.json()) as { step?: PipelineStep; input?: string };
  if (!step) {
    return NextResponse.json({ error: "Missing step" }, { status: 400 });
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

    // Chat step — resolve tools/MCP/RAG attachments. Only the executor-flagged ids
    // above do real work; anything else in toolRefs/mcpServerRefs is ignored here
    // (captured on the flow, but decorative — see design doc).
    let prompt = input ?? "";

    if (step.ragSource) {
      const chunks = await retrieveRelevantChunks(step.ragSource.documents, prompt);
      if (chunks.length > 0) {
        prompt = `Relevant context:\n${chunks.map((c) => `- ${c}`).join("\n")}\n\nTask:\n${prompt}`;
      }
    }

    const localTools: Record<string, unknown> = {};
    if (step.toolRefs?.includes(EXA_SEARCH_TOOL_ID)) {
      localTools.webSearch = createExaSearchTool();
    }

    const runGenerate = (allTools: Record<string, unknown>) => {
      const hasTools = Object.keys(allTools).length > 0;
      return generateText({
        model: registry.languageModel(step.modelRef as RegistryModelRef),
        system: step.systemPrompt,
        prompt,
        // Dynamically composed tool sets (local + MCP-provided) don't unify under
        // generateText's generic ToolSet typing; the runtime shape is correct.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: hasTools ? (allTools as any) : undefined,
        stopWhen: hasTools ? isStepCount(4) : undefined,
      });
    };

    const { text, usage } = step.mcpServerRefs?.includes(GITHUB_MCP_ID)
      ? await withGitHubMCPTools((mcpTools) => runGenerate({ ...localTools, ...mcpTools }))
      : await runGenerate(localTools);

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
