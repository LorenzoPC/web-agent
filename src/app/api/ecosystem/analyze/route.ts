import { Output, generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BLOCK_TYPES } from "@/lib/block-catalog";
import { getAgentOptions, getCatalogCardsByKind, getCatalogOptionsForBlock } from "@/lib/catalog-db";
import { registry } from "@/lib/providers";

const pickSchema = z.object({
  rationale: z.string(),
  recommendedOptionIds: z.array(z.string()),
});

// One call per group rather than one big call: the local default analysis model
// (llama3.2:latest) produced hallucinated/cross-contaminated "rationale" text
// (e.g. an MCP server id showing up in the RAG rationale) whenever more than one
// group shared a call — even a 2-group "attachments" call still bled. Only
// per-group calls (goal+blocks+agent bundled since that one held up fine; tools,
// MCP, and RAG each fully separate) produced clean text in testing.
const goalAndBlocksSchema = z.object({
  refinedGoal: z.string(),
  successCriteria: z.string(),
  blocks: z
    .array(
      z.object({
        blockType: z.enum(["data-source", "delivery"]),
        rationale: z.string(),
        recommendedOptionIds: z.array(z.string()).min(1).max(3),
      }),
    )
    .length(2),
  agent: pickSchema,
});

function summarizeGroup(title: string, options: { id: string; name: string; description: string }[]) {
  return `${title}\n` + options.map((o) => `  - ${o.id}: ${o.name} — ${o.description}`).join("\n");
}

/** Dedupes and validates LLM-recommended ids against the real candidate list; falls back to the first N if none survive. */
function resolveIds(ids: string[], candidateIds: string[], fallbackCount: number): string[] {
  const validIds = new Set(candidateIds);
  const unique = [...new Set(ids)].filter((id) => validIds.has(id));
  return unique.length > 0 ? unique : candidateIds.slice(0, fallbackCount);
}

async function pickAttachment(
  model: Parameters<typeof generateText>[0]["model"],
  challenge: string,
  goal: string,
  groupLabel: string,
  candidates: { id: string; name: string; description: string }[],
) {
  const { output } = await generateText({
    model,
    prompt:
      `A user wants to build an AI agent flow for this challenge:\n"${challenge}"\n\nGoal: ${goal}\n\n` +
      `From the real catalog below (use exact id strings, never invent new ones), recommend which ` +
      `${groupLabel} (if any) would help this agent, ranked best first:\n\n` +
      summarizeGroup(groupLabel, candidates),
    output: Output.object({ schema: pickSchema }),
  });
  return {
    rationale: output.rationale,
    allOptions: candidates,
    recommendedIds: resolveIds(output.recommendedOptionIds, candidates.map((c) => c.id), 0),
  };
}

export async function POST(req: Request) {
  const { challenge } = (await req.json()) as { challenge?: string };
  if (!challenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }

  try {
    const [blockCandidates, agentCandidates, toolCandidates, mcpCandidates, ragCandidates] =
      await Promise.all([
        Promise.all(BLOCK_TYPES.map(async (b) => [b.id, await getCatalogOptionsForBlock(b.id)] as const)),
        getAgentOptions(),
        getCatalogCardsByKind("hook"),
        getCatalogCardsByKind("mcp-server"),
        getCatalogCardsByKind("rag-pattern"),
      ]);
    const blockCandidatesByType = Object.fromEntries(blockCandidates);

    const modelRef = process.env.ECOSYSTEM_ANALYZE_MODEL ?? "local > llama3.2:latest";
    const model = registry.languageModel(modelRef as Parameters<typeof registry.languageModel>[0]);

    const goalAndBlocksPrompt =
      `A user wants to build an AI agent flow for this challenge:\n"${challenge}"\n\n` +
      `First, restate the challenge as a clear, one-paragraph goal ("refinedGoal"), and draft 2-4 ` +
      `concrete bullet points describing what a successful result looks like ("successCriteria").\n\n` +
      `Then, from the real catalogs below (use exact id strings, never invent new ones), recommend:\n\n` +
      BLOCK_TYPES.map((b) =>
        summarizeGroup(`${b.name} (${b.id}) — ${b.description}:`, blockCandidatesByType[b.id]),
      ).join("\n\n") +
      "\n\n" +
      summarizeGroup("Agent (the persona/model that does the work) — pick exactly one, ranked:", agentCandidates);

    const { output: goalAndBlocks } = await generateText({
      model,
      prompt: goalAndBlocksPrompt,
      output: Output.object({ schema: goalAndBlocksSchema }),
    });

    const [tools, mcpServers, ragSources] = await Promise.all([
      pickAttachment(model, challenge, goalAndBlocks.refinedGoal, "tools the agent can call", toolCandidates),
      pickAttachment(model, challenge, goalAndBlocks.refinedGoal, "MCP server integrations", mcpCandidates),
      pickAttachment(model, challenge, goalAndBlocks.refinedGoal, "RAG retrieval sources", ragCandidates),
    ]);

    const blocks = goalAndBlocks.blocks.map((block) => {
      const candidates = blockCandidatesByType[block.blockType];
      return {
        blockType: block.blockType,
        rationale: block.rationale,
        allOptions: candidates,
        recommendedIds: resolveIds(block.recommendedOptionIds, candidates.map((c) => c.id), 3),
      };
    });

    return NextResponse.json({
      refinedGoal: goalAndBlocks.refinedGoal,
      successCriteria: goalAndBlocks.successCriteria,
      blocks,
      agent: {
        rationale: goalAndBlocks.agent.rationale,
        allOptions: agentCandidates,
        recommendedIds: resolveIds(goalAndBlocks.agent.recommendedOptionIds, agentCandidates.map((c) => c.id), 1),
      },
      tools,
      mcpServers,
      ragSources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 502 },
    );
  }
}
