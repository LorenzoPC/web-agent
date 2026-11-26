"use client";

import { useRef, useState } from "react";
import { ConfirmPill } from "@/components/ui/confirm-pill";
import { PickedMark } from "@/components/ui/pick-checkbox";
import type { MockModelOption, MockModelTypeGroup } from "@/lib/mock-data";
import { SOURCE_TYPE_LABELS, formatCostModel } from "@/lib/pipeline-data";
import { unbuilt } from "@/lib/unbuilt";
import { AGENTS_DEPARTMENTS_PICK } from "./agents-departments";

const HEAD = "px-4 py-2.5 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400";
const CELL = "px-4 py-3 align-top";
const LIST = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";
const MOCK_CATALOG = unbuilt("panel", "marketplace catalog API");
/** Translucent, so the row tints still show over the orange "not built yet" panel tint. */
const ROW_IDLE = "cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]";
const ROW_OPEN = "cursor-pointer bg-black/[0.05] dark:bg-white/[0.07]";

/** What a row's selection does: open the confirmation, confirm it, or close it. */
interface Selection {
  openId: string | null;
  pickedIds: Set<string>;
  open: (id: string) => void;
  confirm: (model: MockModelOption) => void;
  close: () => void;
  /** Registers a row's name button, so focus can go back to it when the confirmation closes. */
  registerButton: (id: string, view: "table" | "list") => (el: HTMLButtonElement | null) => void;
}

/** The confirmation while a row is open, the check once a model is picked, or nothing. */
function SelectionControl({ model, selection }: { model: MockModelOption; selection: Selection }) {
  const picked = selection.pickedIds.has(model.id);
  if (selection.openId === model.id) {
    return (
      <ConfirmPill
        prompt={picked ? "Remove?" : "Add?"}
        confirmLabel={
          picked ? `Remove ${model.name} from my Agents Departments` : `Add ${model.name} to my Agents Departments`
        }
        onConfirm={() => selection.confirm(model)}
        onClose={selection.close}
        confirmProps={AGENTS_DEPARTMENTS_PICK.props}
      />
    );
  }
  return picked ? <PickedMark label={AGENTS_DEPARTMENTS_PICK.picked} /> : null;
}

/** The model's name and description, as the button that opens its confirmation (rows are clickable too). */
function NameButton({
  model,
  view,
  selection,
}: {
  model: MockModelOption;
  view: "table" | "list";
  selection: Selection;
}) {
  return (
    <button
      ref={selection.registerButton(model.id, view)}
      type="button"
      aria-expanded={selection.openId === model.id}
      onClick={() => selection.open(model.id)}
      className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
    >
      <span className="block font-medium text-black dark:text-zinc-50">{model.name}</span>
      <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">{model.description}</span>
    </button>
  );
}

/**
 * One type of output's models, as a list: there will be many. A table from lg
 * up (the same format as the Admin Tools list); below that each model stacks its
 * facts under its name, so nothing sits off-screen in a sideways scroll. The
 * table only fits from lg because sources and prices stay on one line.
 *
 * Clicking a row opens a small confirmation at its end: the check adds the model
 * to the organization's Agents Departments (or removes it), the X closes it.
 */
function ModelList({ models, selection }: { models: MockModelOption[]; selection: Selection }) {
  return (
    <>
      <ul {...MOCK_CATALOG} className={`${LIST} divide-y divide-zinc-200 text-sm lg:hidden dark:divide-zinc-800`}>
        {models.map((model) => (
          <li
            key={model.id}
            onClick={() => selection.open(model.id)}
            className={`px-4 py-3 transition-colors ${selection.openId === model.id ? ROW_OPEN : ROW_IDLE}`}
          >
            <div className="flex items-start justify-between gap-3">
              <NameButton model={model} view="list" selection={selection} />
              <span className="shrink-0">
                <SelectionControl model={model} selection={selection} />
              </span>
            </div>
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
              <th scope="col" className={HEAD}>Source and where it runs</th>
              <th scope="col" className={`${HEAD} text-right`}>Price</th>
              {/* Room for the widest confirmation ("Remove?"). It's absolutely placed, so it never resizes the columns. */}
              <th scope="col" className={`${HEAD} w-36`}>
                <span className="sr-only">In my Agents Departments</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {models.map((model) => (
              <tr
                key={model.id}
                onClick={() => selection.open(model.id)}
                className={`transition-colors ${selection.openId === model.id ? ROW_OPEN : ROW_IDLE}`}
              >
                <th scope="row" className={`${CELL} text-left font-normal`}>
                  <NameButton model={model} view="table" selection={selection} />
                </th>
                <td className={`${CELL} text-zinc-600 dark:text-zinc-400`}>{model.bestFor}</td>
                <td className={`${CELL} whitespace-nowrap`}>
                  <span className="block text-zinc-600 dark:text-zinc-400">{model.sourceLabel}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">
                    {SOURCE_TYPE_LABELS[model.sourceType]}
                  </span>
                </td>
                <td className={`${CELL} whitespace-nowrap text-right font-medium tabular-nums text-zinc-800 dark:text-zinc-200`}>
                  {formatCostModel(model.cost)}
                </td>
                <td className="relative w-36 px-3 py-3">
                  <span className="absolute right-3 top-2 flex h-[30px] items-center">
                    <SelectionControl model={model} selection={selection} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Every model option, one list per type of output. One row's confirmation is open at a time, across every list. */
export function ModelMarketplace({ groups }: { groups: MockModelTypeGroup[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  // Models picked for the organization's Agents Departments. Only in the page's state for now.
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  // Closes the confirmation and hands focus back to the row's name button once it's
  // gone. The table and the stacked list both exist (one hidden), and focusing the
  // hidden one does nothing.
  function close() {
    const id = openId;
    setOpenId(null);
    if (!id) return;
    requestAnimationFrame(() => {
      buttons.current.get(`list:${id}`)?.focus();
      buttons.current.get(`table:${id}`)?.focus();
    });
  }

  const selection: Selection = {
    openId,
    pickedIds,
    open: setOpenId,
    confirm: (model) => {
      setPickedIds((prev) => {
        const next = new Set(prev);
        if (next.has(model.id)) next.delete(model.id);
        else next.add(model.id);
        return next;
      });
      close();
    },
    close,
    registerButton: (id, view) => (el) => {
      if (el) buttons.current.set(`${view}:${id}`, el);
      else buttons.current.delete(`${view}:${id}`);
    },
  };

  return (
    <>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Click a model to add it to your Agents Departments.
      </p>
      {groups.map((group) => (
        <section key={group.id} className="flex flex-col gap-3">
          <div>
            <h2 className="font-medium text-black dark:text-zinc-50">{group.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">{group.description}</p>
          </div>
          <ModelList models={group.options} selection={selection} />
        </section>
      ))}
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Prices are illustrative placeholders, not current provider rates.
      </p>
    </>
  );
}
