import type { MockModelOption, MockModelTypeGroup } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCostModel } from "@/lib/pipeline-data";

function ModelCard({ model }: { model: MockModelOption }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-sm font-medium text-black dark:text-zinc-50">{model.name}</h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">Best for {model.bestFor.toLowerCase()}</p>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{model.description}</p>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-100 pt-2 text-xs dark:border-zinc-900">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{formatCostModel(model.cost)}</span>
        <span className="text-zinc-500 dark:text-zinc-500">
          {model.sourceLabel} · {SOURCE_TYPE_LABELS[model.sourceType]}
        </span>
      </div>
    </div>
  );
}

/** Every model option, one section per type of output. */
export function ModelMarketplace({ groups }: { groups: MockModelTypeGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium text-black dark:text-zinc-50">{group.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {group.options.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
      ))}
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Prices are illustrative placeholders, not current provider rates.
      </p>
    </>
  );
}
