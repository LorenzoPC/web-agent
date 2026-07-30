export type ModelSourceType = "local" | "remote" | "api";

export type StepKind = "chat" | "embedding" | "external";

export type CostModel =
  | { kind: "free" }
  | { kind: "duration"; dollarsPerHour: number }
  | { kind: "tokens"; inputPerMillion: number; outputPerMillion: number }
  | { kind: "perRequest"; dollarsPerRequest: number };

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  sourceType: ModelSourceType;
  sourceLabel: string;
  stepKind: StepKind;
  /** Provider registry key (see src/lib/providers.ts), e.g. "local > llama3.2:3b". Unused for "external" steps. */
  modelRef?: string;
  unit: string;
  estimatedUnits: number;
  cost: CostModel;
  /** Agent persona system prompt (kind: 'agent' catalog entries). Only meaningful for stepKind "chat". */
  systemPrompt?: string;
  /** Display role for the agent marketplace, e.g. "Research Analyst". Only set for kind: 'agent' entries. */
  role?: string;
  /** Attached "hook"-kind catalog ids. Only ids with a recognized metadata.executor do anything at run time. */
  toolRefs?: string[];
  /** Attached "mcp-server"-kind catalog ids. Only ids with a recognized metadata.executor do anything at run time. */
  mcpServerRefs?: string[];
  /** Attached "rag-pattern"-kind catalog id + user-supplied reference text, for the real local-RAG executor. */
  ragSource?: { id: string; documents: string };
}

/** Real usage reported after a step runs, used to reconcile against the pre-run estimate. */
export interface ActualUsage {
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
}
