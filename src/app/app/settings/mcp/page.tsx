import Link from "next/link";
import { McpConnectionSettings } from "@/components/mcp-connection/connection-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import {
  HARNESSES,
  HARNESS_ACTIVITY,
  INITIAL_HARNESS_SETTINGS,
  ORG,
  ORG_GROUPS,
} from "@/lib/mock-mcp-connection-data";
import { MCP_URL } from "@/lib/mock-onboarding-data";

/**
 * Client workspace settings: a client organization's admin chooses which AI
 * clients their people may connect to the MCP server from, and how each one
 * signs them in. People then follow Get started on their own.
 */
export default function McpConnectionPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 py-16 px-6">
        <SettingsTabs current="/app/settings/mcp" />
        <div>
          <p className="text-sm text-zinc-500">Settings · {ORG.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">MCP connection</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
            Choose which AI clients your people can use with Web Agent, and how each one signs them in. Everyone signs
            in as themselves and only reaches what their own permissions allow. Once a client is set up, your people
            follow{" "}
            <Link href="/app/onboarding" className="font-medium text-black underline underline-offset-2 dark:text-zinc-50">
              Get started
            </Link>
            .
          </p>
        </div>
        <McpConnectionSettings
          org={ORG}
          mcpUrl={MCP_URL}
          harnesses={HARNESSES}
          initialSettings={INITIAL_HARNESS_SETTINGS}
          activity={HARNESS_ACTIVITY}
          groups={ORG_GROUPS}
        />
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Mockup: nothing here is saved, and the server, sign-in and client IDs aren&apos;t live yet.
        </p>
      </main>
    </div>
  );
}
