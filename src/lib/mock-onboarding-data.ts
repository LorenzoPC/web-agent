// Mock data for the onboarding page (/onboarding): one MCP URL that existing
// clients, partners and resellers add to their AI client. Signing in (OAuth)
// matches them to their company's account, so the page asks nothing.
// Nothing here is live yet.

export const MCP_URL = "https://mcp.webagent.dev";

export const SETUP_STEPS: { title: string; note: string }[] = [
  { title: "Add a custom connector", note: "In Claude or ChatGPT settings." },
  { title: "Paste the URL above", note: "No API keys — it uses OAuth." },
  { title: "Sign in and approve", note: "Then enable it in your chat." },
];

export interface ClientGuide {
  id: string;
  name: string;
  steps: string[];
}

export const CLIENT_GUIDES: ClientGuide[] = [
  {
    id: "claude",
    name: "Claude",
    steps: [
      "Open Settings → Connectors.",
      "Click Add custom connector.",
      "Name it Web Agent and paste the URL.",
      "Click Connect, sign in with your work email and approve.",
      "In a chat, turn on Web Agent from the tools menu.",
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    steps: [
      "Open Settings → Connectors → Advanced and turn on Developer Mode.",
      "Click Create, name it Web Agent and paste the URL.",
      "Choose OAuth for authentication.",
      "Save, then sign in with your work email and approve.",
      "In a chat, pick Web Agent from the + menu.",
    ],
  },
];
