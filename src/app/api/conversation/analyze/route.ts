import { generateText } from "ai";
import { NextResponse } from "next/server";
import { registry } from "@/lib/providers";
import type { ActualUsage, PipelineStep } from "@/lib/types";

type RegistryModelRef = Parameters<typeof registry.languageModel>[0];

// Key points and Flow re-run after every reply, so by default they cost nothing.
const DEFAULT_ANALYSIS_MODEL = "local > llama3.2:latest";

const message = (error: unknown) => (error instanceof Error ? error.message : "Analysis failed");

/**
 * Runs one of the Conversation panel's analysis prompts (Key points, Flow) over
 * the transcript. The model is resolved here from CONVERSATION_ANALYSIS_MODEL
 * rather than sent by the client. If that model fails (usually because Ollama
 * isn't running), the call is retried on the chat agent's own model, and
 * `usedFallback` tells the panel to show what that cost.
 */
export async function POST(req: Request) {
  const { systemPrompt, input, fallbackAgent } = (await req.json()) as {
    systemPrompt?: string;
    input?: string;
    /** The agent the user is chatting with. Its model is only used if the analysis model fails. */
    fallbackAgent?: PipelineStep;
  };
  if (!systemPrompt || !input) {
    return NextResponse.json({ error: "Missing systemPrompt or input" }, { status: 400 });
  }

  const run = async (modelRef: string) => {
    const startedAt = Date.now();
    const { text, usage } = await generateText({
      model: registry.languageModel(modelRef as RegistryModelRef),
      system: systemPrompt,
      prompt: input,
    });
    return {
      output: text,
      usage: {
        durationMs: Date.now() - startedAt,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      } satisfies ActualUsage,
    };
  };

  const modelRef = process.env.CONVERSATION_ANALYSIS_MODEL ?? DEFAULT_ANALYSIS_MODEL;
  try {
    return NextResponse.json({ ...(await run(modelRef)), usedFallback: false });
  } catch (error) {
    const fallbackRef = fallbackAgent?.stepKind === "chat" ? fallbackAgent.modelRef : undefined;
    if (!fallbackAgent || !fallbackRef || fallbackRef === modelRef) {
      return NextResponse.json({ error: message(error) }, { status: 502 });
    }
    try {
      return NextResponse.json({ ...(await run(fallbackRef)), usedFallback: true });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: `${message(error)} (${fallbackAgent.name} also failed: ${message(fallbackError)})` },
        { status: 502 },
      );
    }
  }
}
