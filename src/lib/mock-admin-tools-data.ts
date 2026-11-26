// What admins need to know about each tool on /admin/tools, beyond what the
// Marketplace shows. Keyed by the ids in mock-marketplace-data.ts, so the two
// lists can't drift. `live` mirrors the catalog seed (scripts/seed-catalog-curated.ts):
// only an entry with an `executor` runs when an agent calls it. Nothing else here is live yet.

import { MOCK_MARKETPLACE_TOOLS, type MockMarketplaceTool } from "./mock-marketplace-data";

/** What a tool needs before it can run. Env vars are named, never shown. */
export type ToolCredential = { kind: "none" } | { kind: "envVar"; name: string } | { kind: "signIn"; label: string };

export interface MockAdminToolFacts {
  /** Runs when an agent calls it. Otherwise it's a catalog entry only. */
  live: boolean;
  /** Whether a call changes anything outside the platform. */
  sideEffects: "read" | "write";
  /** A person approves each call before it runs. */
  requiresApproval: boolean;
  credential: ToolCredential;
}

const NONE: ToolCredential = { kind: "none" };
const READ_ONLY = { sideEffects: "read", requiresApproval: false } as const;

const FACTS: Record<string, MockAdminToolFacts> = {
  "curated:tool-web-search": { live: true, ...READ_ONLY, credential: { kind: "envVar", name: "EXA_API_KEY" } },
  "curated:tool-fetch-url": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-json-extract": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-translate": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-sentiment": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-decision-advisor": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-send-email": {
    live: false,
    sideEffects: "write",
    requiresApproval: true,
    credential: { kind: "signIn", label: "A mailbox, over OAuth" },
  },
  "curated:tool-read-calendar": { live: false, ...READ_ONLY, credential: { kind: "signIn", label: "A calendar, over OAuth" } },
  "curated:tool-calculator": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-code-execution": { live: false, ...READ_ONLY, credential: NONE },
  "curated:tool-image-generation": { live: false, ...READ_ONLY, credential: NONE },
};

export type MockAdminTool = MockMarketplaceTool & MockAdminToolFacts;

/** Every tool on the platform, with its admin facts. A tool without facts yet counts as catalog only. */
export const MOCK_ADMIN_TOOLS: MockAdminTool[] = MOCK_MARKETPLACE_TOOLS.map((tool) => ({
  ...tool,
  ...(FACTS[tool.id] ?? { live: false, ...READ_ONLY, credential: NONE }),
}));
