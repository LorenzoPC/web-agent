import { BetaBadge, LIST_CARD, LIST_CELL, LIST_HEAD, LIST_LABEL, Needs, Runs } from "@/components/tools/tool-facts";
import type { MockConnectedMcpServer, MockPublishedMcpServer } from "@/lib/mock-admin-mcp-data";
import { MCP_AUDIENCES } from "@/lib/mock-mcp-server-data";
import { unbuilt } from "@/lib/unbuilt";

const money = (amount: number, cents: boolean) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: cents ? 2 : 0 }).format(amount);

const plural = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

function Who({ server }: { server: MockPublishedMcpServer }) {
  if (server.audiences.length === MCP_AUDIENCES.length) return <span className="text-zinc-600 dark:text-zinc-400">Everyone</span>;
  const labels = MCP_AUDIENCES.filter((a) => server.audiences.includes(a.id)).map((a) => a.label);
  return <span className="text-zinc-600 dark:text-zinc-400">{labels.join(", ")}</span>;
}

function Offers({ server }: { server: MockPublishedMcpServer }) {
  return (
    <span className="flex flex-col">
      <span className="text-zinc-600 dark:text-zinc-400">
        {plural(server.datasets, "dataset")} · {plural(server.tools, "tool")}
      </span>
      {server.confirmTools > 0 && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {server.confirmTools} {server.confirmTools === 1 ? "asks" : "ask"} before each call
        </span>
      )}
    </span>
  );
}

function Spend({ server }: { server: MockPublishedMcpServer }) {
  if (server.status === "Draft") return <span className="text-zinc-500 dark:text-zinc-400">Not published</span>;
  return (
    <span className="whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-400">
      {money(server.spend, server.spend < 100)} of {money(server.monthlyBudget, false)}
    </span>
  );
}

function PublishedName({ server }: { server: MockPublishedMcpServer }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-black dark:text-zinc-50">{server.name}</span>
        {server.status === "Draft" && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            Draft
          </span>
        )}
      </span>
      <span className="mt-0.5 block break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
        {server.url.replace(/^https:\/\//, "")}
      </span>
    </>
  );
}

/** Servers we host for AI clients to connect to: who can reach each one, what it offers, and its spend. */
export function PublishedServers({ servers }: { servers: MockPublishedMcpServer[] }) {
  return (
    <>
      <ul
        {...unbuilt("panel", "MCP server registry")}
        className={`${LIST_CARD} divide-y divide-zinc-200 text-sm md:hidden dark:divide-zinc-800`}
      >
        {servers.map((server) => (
          <li key={server.id} className="px-4 py-3">
            <PublishedName server={server} />
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5">
              <dt className={LIST_LABEL}>Who</dt>
              <dd><Who server={server} /></dd>
              <dt className={LIST_LABEL}>Offers</dt>
              <dd><Offers server={server} /></dd>
              <dt className={LIST_LABEL}>This month</dt>
              <dd><Spend server={server} /></dd>
            </dl>
          </li>
        ))}
      </ul>

      <div {...unbuilt("panel", "MCP server registry")} className={`${LIST_CARD} overflow-x-auto max-md:hidden`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="col" className={LIST_HEAD}>Server</th>
              <th scope="col" className={LIST_HEAD}>Who can connect</th>
              <th scope="col" className={LIST_HEAD}>Offers</th>
              <th scope="col" className={`${LIST_HEAD} text-right`}>Spend this month</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {servers.map((server) => (
              <tr key={server.id}>
                <th scope="row" className={`${LIST_CELL} text-left font-normal`}>
                  <PublishedName server={server} />
                </th>
                <td className={LIST_CELL}><Who server={server} /></td>
                <td className={LIST_CELL}><Offers server={server} /></td>
                <td className={`${LIST_CELL} text-right`}><Spend server={server} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ToolChips({ server }: { server: MockConnectedMcpServer }) {
  return (
    <span className="flex flex-wrap gap-1">
      {server.exposes.map((tool) => (
        <code
          key={tool}
          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {tool}
        </code>
      ))}
    </span>
  );
}

function ConnectedAccess({ server }: { server: MockConnectedMcpServer }) {
  if (server.writes.length === 0) return <span className="text-zinc-600 dark:text-zinc-400">Read only</span>;
  return (
    <span className="flex flex-col">
      <span className="text-black dark:text-zinc-50">Writes</span>
      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{server.writes.join(", ")}</span>
    </span>
  );
}

function ConnectedName({ server }: { server: MockConnectedMcpServer }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-black dark:text-zinc-50">{server.name}</span>
        {server.status === "Beta" && <BetaBadge />}
      </span>
      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">{server.description}</span>
    </>
  );
}

/** Third-party servers whose tools our agents call: whether they run, what they offer, and what they need. */
export function ConnectedServers({ servers }: { servers: MockConnectedMcpServer[] }) {
  return (
    <>
      <ul
        {...unbuilt("panel", "marketplace catalog API")}
        className={`${LIST_CARD} divide-y divide-zinc-200 text-sm md:hidden dark:divide-zinc-800`}
      >
        {servers.map((server) => (
          <li key={server.id} className="px-4 py-3">
            <ConnectedName server={server} />
            <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5">
              <dt className={LIST_LABEL}>Runs</dt>
              <dd><Runs live={server.live} /></dd>
              <dt className={LIST_LABEL}>Tools</dt>
              <dd><ToolChips server={server} /></dd>
              <dt className={LIST_LABEL}>Access</dt>
              <dd><ConnectedAccess server={server} /></dd>
              <dt className={LIST_LABEL}>Needs</dt>
              <dd><Needs credential={server.credential} /></dd>
            </dl>
          </li>
        ))}
      </ul>

      <div {...unbuilt("panel", "marketplace catalog API")} className={`${LIST_CARD} overflow-x-auto max-md:hidden`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="col" className={LIST_HEAD}>Server</th>
              <th scope="col" className={LIST_HEAD}>Runs</th>
              <th scope="col" className={LIST_HEAD}>Tools it offers</th>
              <th scope="col" className={LIST_HEAD}>Access</th>
              <th scope="col" className={LIST_HEAD}>Needs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {servers.map((server) => (
              <tr key={server.id}>
                <th scope="row" className={`${LIST_CELL} max-w-xs text-left font-normal`}>
                  <ConnectedName server={server} />
                </th>
                <td className={LIST_CELL}><Runs live={server.live} /></td>
                <td className={`${LIST_CELL} max-w-[16rem]`}><ToolChips server={server} /></td>
                <td className={LIST_CELL}><ConnectedAccess server={server} /></td>
                <td className={LIST_CELL}><Needs credential={server.credential} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
