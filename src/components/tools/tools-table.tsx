import type { MockAdminTool, ToolCredential } from "@/lib/mock-admin-tools-data";
import { formatCostModel } from "@/lib/pipeline-data";

const HEAD = "px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400";
const CELL = "px-4 py-3 align-top";

function Runs({ live }: { live: boolean }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`size-2 rounded-full ${live ? "bg-emerald-600 dark:bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"}`}
      />
      <span className={live ? "text-black dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}>
        {live ? "Live" : "Catalog only"}
      </span>
    </span>
  );
}

function Access({ tool }: { tool: MockAdminTool }) {
  if (tool.sideEffects === "read") return <span className="text-zinc-600 dark:text-zinc-400">Read only</span>;
  return (
    <span className="flex flex-col">
      <span className="text-black dark:text-zinc-50">Writes</span>
      {tool.requiresApproval && <span className="text-xs text-zinc-500 dark:text-zinc-400">Each call needs approval</span>}
    </span>
  );
}

function Needs({ credential }: { credential: ToolCredential }) {
  switch (credential.kind) {
    case "none":
      return <span className="text-zinc-400 dark:text-zinc-500">Nothing</span>;
    case "envVar":
      return <code className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{credential.name}</code>;
    case "signIn":
      return <span className="text-zinc-600 dark:text-zinc-400">{credential.label}</span>;
  }
}

function NameAndDescription({ tool }: { tool: MockAdminTool }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-black dark:text-zinc-50">{tool.name}</span>
        {tool.status === "Beta" && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Beta
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
        {tool.description}
        {tool.provider && ` Provided by ${tool.provider}.`}
      </span>
    </>
  );
}

const CARD = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";

/**
 * Every tool on the platform, with what an admin checks before an agent relies on it.
 * A table from md up; on phones each tool stacks its facts under its name instead,
 * so nothing important sits off-screen in a sideways scroll.
 */
export function ToolsTable({ tools }: { tools: MockAdminTool[] }) {
  return (
    <>
      <ul className={`${CARD} divide-y divide-zinc-200 text-sm md:hidden dark:divide-zinc-800`}>
        {tools.map((tool) => (
          <li key={tool.id} className="px-4 py-3">
            <NameAndDescription tool={tool} />
            <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Runs</dt>
              <dd><Runs live={tool.live} /></dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Access</dt>
              <dd><Access tool={tool} /></dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Needs</dt>
              <dd><Needs credential={tool.credential} /></dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Cost</dt>
              <dd className="tabular-nums text-zinc-600 dark:text-zinc-400">{formatCostModel(tool.cost)}</dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Category</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{tool.category}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div className={`${CARD} overflow-x-auto max-md:hidden`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="col" className={HEAD}>Tool</th>
              <th scope="col" className={HEAD}>Category</th>
              <th scope="col" className={HEAD}>Runs</th>
              <th scope="col" className={HEAD}>Access</th>
              <th scope="col" className={HEAD}>Needs</th>
              <th scope="col" className={`${HEAD} text-right`}>Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tools.map((tool) => (
              <tr key={tool.id}>
                <th scope="row" className={`${CELL} max-w-xs text-left font-normal`}>
                  <NameAndDescription tool={tool} />
                </th>
                <td className={`${CELL} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>{tool.category}</td>
                <td className={CELL}>
                  <Runs live={tool.live} />
                </td>
                <td className={CELL}>
                  <Access tool={tool} />
                </td>
                <td className={CELL}>
                  <Needs credential={tool.credential} />
                </td>
                <td className={`${CELL} whitespace-nowrap text-right tabular-nums text-zinc-600 dark:text-zinc-400`}>
                  {formatCostModel(tool.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
