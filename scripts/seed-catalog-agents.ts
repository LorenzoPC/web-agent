import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { catalogEntries, catalogEntryCategories } from "../src/db/schema";
import type { CostModel } from "../src/lib/types";

type AgentEntry = {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  modelRef: string;
  sourceType: "local" | "api";
  provider: string;
  cost: CostModel;
  categories: string[];
};

// A modest starting set of personas — model + system prompt + purpose. Not
// exhaustive; growing this is ongoing backlog work. Costs mirror the
// underlying model's real cost model so projections stay accurate.
const AGENTS: AgentEntry[] = [
  {
    id: "curated:agent-research",
    name: "Research Agent",
    role: "Research Analyst",
    description: "Gathers and synthesizes information on a topic into a clear, sourced summary",
    systemPrompt:
      "You are a research agent. Given a topic or question, gather and synthesize relevant " +
      "information into a clear, well-organized summary. Cite sources when possible and flag uncertainty.",
    modelRef: "openai > gpt-5.4",
    sourceType: "api",
    provider: "OpenAI",
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
    categories: ["natural-language-processing", "search"],
  },
  {
    id: "curated:agent-summarizer",
    name: "Summarizer Agent",
    role: "Content Summarizer",
    description: "Condenses content into a concise, accurate summary",
    systemPrompt:
      "You are a summarizer agent. Condense the given content into a concise, accurate summary, " +
      "preserving key facts and figures. Prefer bullet points for structure.",
    modelRef: "anthropic > claude-haiku-4.5",
    sourceType: "api",
    provider: "Anthropic",
    cost: { kind: "tokens", inputPerMillion: 1, outputPerMillion: 5 },
    categories: ["natural-language-processing"],
  },
  {
    id: "curated:agent-support",
    name: "Support Agent",
    role: "Customer Support Specialist",
    description: "Answers user questions helpfully, staying within the provided context",
    systemPrompt:
      "You are a customer support agent. Respond helpfully and empathetically to user questions, " +
      "staying strictly within the provided context. Say you don't know rather than guessing.",
    modelRef: "openai > gpt-5.4",
    sourceType: "api",
    provider: "OpenAI",
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
    categories: ["natural-language-processing"],
  },
  {
    id: "curated:agent-code-reviewer",
    name: "Code Reviewer Agent",
    role: "Code Reviewer",
    description: "Reviews code or diffs for correctness, security, and style issues",
    systemPrompt:
      "You are a code reviewer agent. Analyze the given code or diff for correctness, security " +
      "issues, and style problems. Be specific and reference line numbers where possible.",
    modelRef: "anthropic > claude-haiku-4.5",
    sourceType: "api",
    provider: "Anthropic",
    cost: { kind: "tokens", inputPerMillion: 1, outputPerMillion: 5 },
    categories: ["natural-language-processing", "agentic-tool-use"],
  },
  {
    id: "curated:agent-data-analyst",
    name: "Data Analyst Agent",
    role: "Data Analyst",
    description: "Identifies trends, anomalies, and insights from data",
    systemPrompt:
      "You are a data analyst agent. Given data or a description of data, identify trends, " +
      "anomalies, and actionable insights. Present findings clearly, quantify where possible.",
    modelRef: "openai > gpt-5.4",
    sourceType: "api",
    provider: "OpenAI",
    cost: { kind: "tokens", inputPerMillion: 2.5, outputPerMillion: 15 },
    categories: ["natural-language-processing"],
  },
  {
    id: "curated:agent-general",
    name: "General Assistant Agent",
    role: "General Assistant",
    description: "A general-purpose local assistant, no per-call cost",
    systemPrompt:
      "You are a general-purpose assistant agent. Help with the given task directly and " +
      "concisely, asking clarifying questions only when necessary.",
    modelRef: "local > llama3.2:latest",
    sourceType: "local",
    provider: "Ollama",
    cost: { kind: "free" },
    categories: ["natural-language-processing", "agentic-tool-use"],
  },
];

async function main() {
  const db = getDb();
  for (const agent of AGENTS) {
    const { categories, ...values } = agent;
    await db
      .insert(catalogEntries)
      .values({
        ...values,
        kind: "agent",
        blockType: "processing",
        stepKind: "chat",
        unit: "1K tokens",
        estimatedUnits: "3",
        source: "curated",
        syncedAt: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: catalogEntries.id,
        set: { ...values, source: "curated", updatedAt: new Date() },
      });

    await db.delete(catalogEntryCategories).where(eq(catalogEntryCategories.entryId, agent.id));
    await db
      .insert(catalogEntryCategories)
      .values(categories.map((categoryId) => ({ entryId: agent.id, categoryId })));
  }
  console.log(`Seeded ${AGENTS.length} agent entries.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
