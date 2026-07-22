import { createMCPClient } from "@ai-sdk/mcp";

type MCPToolSet = Awaited<ReturnType<Awaited<ReturnType<typeof createMCPClient>>["tools"]>>;

/**
 * Real GitHub MCP connection — the only "mcp-server" catalog entry with
 * metadata.executor === "github-mcp". Connects to GitHub's public remote MCP
 * server per-call (no persistent connection) and always closes the client,
 * even on error.
 */
export async function withGitHubMCPTools<T>(
  fn: (tools: MCPToolSet) => Promise<T>,
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN");
  }

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  try {
    const tools = await client.tools();
    return await fn(tools);
  } finally {
    await client.close();
  }
}
