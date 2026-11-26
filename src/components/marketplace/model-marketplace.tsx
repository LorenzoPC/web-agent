import type { MockModelOption, MockModelTypeGroup } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCostModel } from "@/lib/pipeline-data";
import { unbuilt } from "@/lib/unbuilt";

const HEAD = "px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400";
const CELL = "px-4 py-3 align-top";
const LIST = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
const MOCK_CATALOG = unbuilt("panel", "marketplace catalog API");

function NameAndDescription({ model }: { model: MockModelOption }) {
  return (
    <>
      <span className="block font-medium text-black dark:text-zinc-50">{model.name}</span>
      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">{model.description}</span>
    </>
  );
}

/**
 * One type of output's models, as a list: there will be many. A table from lg
 * up (the same format as the Admin Tools list); below that each model stacks its
 * facts under its name, so nothing sits off-screen in a sideways scroll. The
 * table only fits from lg because sources and prices stay on one line.
 */
function ModelList({ models }: { models: MockModelOption[] }) {
  return (
    <>
      <ul {...MOCK_CATALOG} className={`${LIST} divide-y divide-zinc-200 text-sm lg:hidden dark:divide-zinc-800`}>
        {models.map((model) => (
          <li key={model.id} className="px-4 py-3">
            <NameAndDescription model={model} />
            <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Best for</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{model.bestFor}</dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Source</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{model.sourceLabel}</dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Runs on</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{SOURCE_TYPE_LABELS[model.sourceType]}</dd>
              <dt className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">Price</dt>
              <dd className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">{formatCostModel(model.cost)}</dd>
            </dl>
          </li>
        ))}
      </ul>

      <div {...MOCK_CATALOG} className={`${LIST} overflow-x-auto max-lg:hidden`}>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th scope="col" className={HEAD}>Model</th>
              <th scope="col" className={HEAD}>Best for</th>
              <th scope="col" className={HEAD}>Source</th>
              <th scope="col" className={HEAD}>Runs on</th>
              <th scope="col" className={`${HEAD} text-right`}>Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {models.map((model) => (
              <tr key={model.id}>
                <th scope="row" className={`${CELL} text-left font-normal`}>
                  <NameAndDescription model={model} />
                </th>
                <td className={`${CELL} text-zinc-600 dark:text-zinc-400`}>{model.bestFor}</td>
                <td className={`${CELL} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>{model.sourceLabel}</td>
                <td className={`${CELL} whitespace-nowrap text-zinc-600 dark:text-zinc-400`}>
                  {SOURCE_TYPE_LABELS[model.sourceType]}
                </td>
                <td className={`${CELL} whitespace-nowrap text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-200`}>
                  {formatCostModel(model.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Every model option, one list per type of output. */
export function ModelMarketplace({ groups }: { groups: MockModelTypeGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium text-black dark:text-zinc-50">{group.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{group.description}</p>
          </div>
          <ModelList models={group.options} />
        </section>
      ))}
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Prices are illustrative placeholders, not current provider rates.
      </p>
    </>
  );
}
