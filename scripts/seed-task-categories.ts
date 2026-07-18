import { getDb } from "../src/db";
import { catalogTaskCategories } from "../src/db/schema";

const CATEGORIES = [
  {
    id: "natural-language-processing",
    name: "Natural language processing",
    description: "Text understanding, generation, and reasoning",
  },
  {
    id: "computer-vision",
    name: "Computer vision",
    description: "Image understanding and analysis",
  },
  {
    id: "multimodal",
    name: "Multimodal",
    description: "Models that combine text with images, audio, or other input types",
  },
  {
    id: "image-generation",
    name: "Image generation",
    description: "Generating images from prompts",
  },
  {
    id: "video-generation",
    name: "Video generation",
    description: "Generating video from prompts",
  },
  {
    id: "speech-audio",
    name: "Speech & audio",
    description: "Speech synthesis, transcription, and realtime audio",
  },
  {
    id: "embeddings-retrieval",
    name: "Embeddings & retrieval",
    description: "Vector embeddings, reranking, and retrieval for RAG",
  },
  {
    id: "agentic-tool-use",
    name: "Agentic tool use",
    description: "Tool calling, function calling, and agent orchestration",
  },
  {
    id: "search",
    name: "Search",
    description: "Web search and live information lookup",
  },
];

async function main() {
  const db = getDb();
  for (const category of CATEGORIES) {
    await db
      .insert(catalogTaskCategories)
      .values(category)
      .onConflictDoUpdate({ target: catalogTaskCategories.id, set: category });
  }
  console.log(`Seeded ${CATEGORIES.length} task categories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
