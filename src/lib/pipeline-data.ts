import type { ActualUsage, CostModel, PipelineStep } from "./types";

export const SOURCE_TYPE_LABELS: Record<PipelineStep["sourceType"], string> = {
  local: "Local hardware",
  remote: "Distant hardware",
  api: "API service",
};

export const MOCK_PIPELINE: PipelineStep[] = [
  {
    id: "retrieve-context",
    name: "Retrieve context",
    description: "Embedding search over local documents",
    sourceType: "local",
    sourceLabel: "Ollama · nomic-embed-text",
    stepKind: "embedding",
    modelRef: "local > nomic-embed-text",
    unit: "1K tokens",
    estimatedUnits: 2.4,
    cost: { kind: "free" },
  },
  {
    id: "rerank-candidates",
    name: "Rerank candidates",
    description: "Cross-encoder rerank on a rented GPU box",
    sourceType: "remote",
    sourceLabel: "Rented GPU · llama3.2:latest",
    stepKind: "chat",
    modelRef: "remote > llama3.2:latest",
    unit: "hour",
    estimatedUnits: 0.015,
    cost: { kind: "duration", dollarsPerHour: 1.2 },
  },
  {
    id: "generate-response",
    name: "Generate response",
    description: "Primary reasoning step over the retrieved context",
    sourceType: "api",
    sourceLabel: "OpenAI · gpt-5.4",
    stepKind: "chat",
    modelRef: "openai > gpt-5.4",
    unit: "1K tokens",
    estimatedUnits: 3.1,
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
  },
  {
    id: "call-tool",
    name: "Call external tool",
    description: "Web search lookup via a third-party API",
    sourceType: "api",
    sourceLabel: "Search API",
    stepKind: "external",
    unit: "request",
    estimatedUnits: 1,
    cost: { kind: "perRequest", dollarsPerRequest: 0.008 },
  },
  {
    id: "postprocess",
    name: "Post-process & format",
    description: "Local formatting pass on the final output",
    sourceType: "local",
    sourceLabel: "Ollama · llama3.2:latest",
    stepKind: "chat",
    modelRef: "local > llama3.2:latest",
    unit: "1K tokens",
    estimatedUnits: 0.6,
    cost: { kind: "free" },
  },
];

/** Pre-run projection from a step's estimated units. Tokens steps assume an even input/output split. */
export function stepCost(step: PipelineStep): number {
  switch (step.cost.kind) {
    case "free":
      return 0;
    case "duration":
      return step.estimatedUnits * step.cost.dollarsPerHour;
    case "tokens": {
      const avgPerMillion = (step.cost.inputPerMillion + step.cost.outputPerMillion) / 2;
      return ((step.estimatedUnits * 1000) / 1_000_000) * avgPerMillion;
    }
    case "perRequest":
      return step.estimatedUnits * step.cost.dollarsPerRequest;
  }
}

/** Actual cost from real usage reported after a step runs. */
export function actualCost(step: PipelineStep, usage: ActualUsage): number {
  switch (step.cost.kind) {
    case "free":
      return 0;
    case "duration":
      return usage.durationMs == null
        ? 0
        : (usage.durationMs / 3_600_000) * step.cost.dollarsPerHour;
    case "tokens": {
      const input = usage.inputTokens ?? 0;
      const output = usage.outputTokens ?? 0;
      return (
        (input / 1_000_000) * step.cost.inputPerMillion +
        (output / 1_000_000) * step.cost.outputPerMillion
      );
    }
    case "perRequest":
      return step.cost.dollarsPerRequest;
  }
}

export function totalCost(steps: PipelineStep[]): number {
  return steps.reduce((sum, step) => sum + stepCost(step), 0);
}

export function formatCost(amount: number): string {
  if (amount === 0) return "Free";
  return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}

export function formatCostModel(cost: CostModel): string {
  switch (cost.kind) {
    case "free":
      return "Free";
    case "duration":
      return `${formatCost(cost.dollarsPerHour)}/hr`;
    case "tokens":
      return `${formatCost(cost.inputPerMillion)}/M in · ${formatCost(cost.outputPerMillion)}/M out`;
    case "perRequest":
      return `${formatCost(cost.dollarsPerRequest)}/req`;
  }
}
