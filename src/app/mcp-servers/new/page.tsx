import { McpServerEditor } from "@/components/mcp-servers/mcp-server-editor";
import { MCP_CATALOG_TOOLS, MCP_SERVER_TEMPLATES } from "@/lib/mock-mcp-server-data";

export default function NewMcpServerPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Create an MCP server
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Publish some of your data and tools at one URL that Claude, ChatGPT and other AI clients can connect to.
            People sign in with their work email, and the access rules decide what each of them can reach.
          </p>
        </div>
        <McpServerEditor templates={MCP_SERVER_TEMPLATES} tools={MCP_CATALOG_TOOLS} />
      </main>
    </div>
  );
}
