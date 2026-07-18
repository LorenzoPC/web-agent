export type BlockType = "data-source" | "processing" | "delivery";

export const BLOCK_TYPES: { id: BlockType; name: string; description: string }[] = [
  {
    id: "data-source",
    name: "Data source",
    description: "Where the raw information for your challenge comes from",
  },
  {
    id: "processing",
    name: "Processing",
    description: "The model step that analyzes, summarizes, or transforms the data",
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "How the result reaches you",
  },
];
