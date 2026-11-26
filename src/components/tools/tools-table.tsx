import type { MockAdminTool } from "@/lib/mock-admin-tools-data";
import { formatCostModel } from "@/lib/pipeline-data";
import { unbuilt } from "@/lib/unbuilt";
import { BetaBadge, LIST_CARD as CARD, LIST_CELL as CELL, LIST_HEAD as HEAD, LIST_LABEL, Needs, Runs } from "./tool-facts";

function Access({ tool }: { tool: MockAdminTool }) {
  if (tool.sideEffects === "read") return <span className="text-zinc-600 dark:text-zinc-400">Read only</span>;
  return (
    <span className="flex flex-col">
      <span className="text-black dark:text-zinc-50">Writes</span>
      {tool.requiresApproval && <span className="text-xs text-zinc-500 dark:text-zinc-400">Each call needs approval</span>}
    </span>
  );
}

function NameAndDescription({ tool }: { tool: MockAdminTool }) {
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-black dark:text-zinc-50">{tool.name}</span>
        {tool.status === "Beta" && <BetaBadge />}
      </span>
      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
        {tool.description}
        {tool.provider && ` Provided by ${tool.provider}.`}
      </span>
    </>
  );
}

/**
 * Every tool on the platform, with what an admin checks before an agent relies on it.
 * A table from md up; on phones each tool stacks its facts under its name instead,
 * so nothing important sits off-screen in a sideways scroll.
 */
export function ToolsTable({ tools }: { tools: MockAdminTool[] }) {
  return (
    <>
      <ul {...unbuilt("panel", "tools store")} className={`${CARD} divide-y divide-zinc-200 text-sm md:hidden dark:divide-zinc-800`}>
        {tools.map((tool) => (
          <li key={tool.id} className="px-4 py-3">
            <NameAndDescription tool={tool} />
            <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5">
              <dt className={LIST_LABEL}>Runs</dt>
              <dd><Runs live={tool.live} /></dd>
              <dt className={LIST_LABEL}>Access</dt>
              <dd><Access tool={tool} /></dd>
              <dt className={LIST_LABEL}>Needs</dt>
              <dd><Needs credential={tool.credential} /></dd>
              <dt className={LIST_LABEL}>Cost</dt>
              <dd className="tabular-nums text-zinc-600 dark:text-zinc-400">{formatCostModel(tool.cost)}</dd>
              <dt className={LIST_LABEL}>Category</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{tool.category}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div {...unbuilt("panel", "tools store")} className={`${CARD} overflow-x-auto max-md:hidden`}>
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
