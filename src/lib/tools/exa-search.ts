import Exa from "exa-js";
import { tool } from "ai";
import { z } from "zod";

/** Real web search — the only "hook" catalog entry with metadata.executor === "exa-search". */
export function createExaSearchTool() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing EXA_API_KEY");
  }
  const exa = new Exa(apiKey);

  return tool({
    description: "Search the live web for current information and return relevant results",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async ({ query }) => {
      const { results } = await exa.search(query, {
        type: "instant",
        numResults: 5,
        contents: { highlights: true },
      });
      return results.map((result) => ({
        title: result.title,
        url: result.url,
        highlights: result.highlights,
      }));
    },
  });
}
