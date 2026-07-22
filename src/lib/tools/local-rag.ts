import { embed, embedMany } from "ai";
import { registry } from "@/lib/providers";

const LOCAL_EMBEDDING_MODEL_REF = "local > nomic-embed-text";
const CHUNK_SIZE = 500;
const TOP_K = 3;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Real local RAG — the only "rag-pattern" catalog entry with
 * metadata.executor === "local-rag". No vector DB: chunks + embeds the
 * user-pasted reference text and the query with the existing local Ollama
 * embedding path, ranks by in-memory cosine similarity, and returns the top-K
 * chunks to prepend to the agent's prompt.
 */
export async function retrieveRelevantChunks(documents: string, query: string): Promise<string[]> {
  const chunks = chunkText(documents);
  if (chunks.length === 0) return [];

  const model = registry.embeddingModel(
    LOCAL_EMBEDDING_MODEL_REF as Parameters<typeof registry.embeddingModel>[0],
  );
  const [{ embeddings }, { embedding: queryEmbedding }] = await Promise.all([
    embedMany({ model, values: chunks }),
    embed({ model, value: query }),
  ]);

  return chunks
    .map((chunk, i) => ({ chunk, score: cosineSimilarity(embeddings[i], queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((s) => s.chunk);
}
