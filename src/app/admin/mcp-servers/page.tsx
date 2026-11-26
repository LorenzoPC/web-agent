import Link from "next/link";
import type { ReactNode } from "react";
import { ConnectedServers, PublishedServers } from "@/components/mcp-servers/server-lists";
import { MOCK_CONNECTED_MCP_SERVERS, MOCK_PUBLISHED_MCP_SERVERS } from "@/lib/mock-admin-mcp-data";

function Section({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={id} className="font-medium text-black dark:text-zinc-50">
            {title}
          </h2>
          <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Every MCP server on the platform (docs/prds/sitemap.html, Admin): the ones we publish, then the ones agents use. */
export default function McpServersPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-10 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">MCP servers</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Two kinds of server share the name. We publish some, so people can reach our data and tools from Claude,
            ChatGPT and other AI clients. Others are third-party servers whose tools our agents call.
          </p>
        </div>

        <Section
          id="published"
          title="Published to AI clients"
          description="Hosted by us. People sign in as themselves and reach only what the server's access rules allow."
          action={
            <Link
              href="/admin/mcp-servers/new"
              className="flex shrink-0 items-center gap-2 rounded-lg bg-admin px-3 py-1.5 text-sm font-medium text-admin-foreground transition-colors hover:bg-admin-hover"
            >
              Create MCP server
              <span className="text-xs text-admin-foreground/80">Admin</span>
            </Link>
          }
        >
          <PublishedServers servers={MOCK_PUBLISHED_MCP_SERVERS} />
        </Section>

        <Section
          id="connected"
          title="Connected for agents"
          description="Third-party servers our agents call tools on. Live ones connect today; catalog-only ones are listed for agents but don't connect yet."
        >
          <ConnectedServers servers={MOCK_CONNECTED_MCP_SERVERS} />
        </Section>

        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Mockup: no published server is deployed yet, and the counts and spend are placeholders. Live follows the
          catalog.
        </p>
      </main>
    </div>
  );
}
