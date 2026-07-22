// "processing" remains a valid blockType value (catalog_entries.block_type, and the
// middle slot in a built PipelineStep[]) — it's just no longer part of the generic
// block loop below, since the Agent section (kind='agent') owns that role now.
export type BlockType = "data-source" | "processing" | "delivery";

export const BLOCK_TYPES: { id: Exclude<BlockType, "processing">; name: string; description: string }[] = [
  {
    id: "data-source",
    name: "Data source",
    description: "Where the raw information for your challenge comes from",
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "How the result reaches you",
  },
];
