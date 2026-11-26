"use client";

import { Fragment, useState, type ReactNode } from "react";

/** Where the detail card is shown: in the third column, or under its own card (below `lg`). */
export type DetailPlacement = "column" | "below";

/** What a card shows, always in four rows: the title, two of description, then the labels. */
export interface CardFace {
  title: string;
  /** Cut to two lines on the card. Show it in full in the details. */
  description: string;
  /** Short facts in pills on the last row, e.g. "34 entries". Whatever doesn't fit is cut. */
  labels?: string[];
}

export interface CardDetailGroup<T> {
  id: string;
  /** Optional heading above the group's cards. */
  title?: string;
  description?: string;
  items: T[];
  /** Shown in place of the cards when the group has none. */
  empty?: string;
}

/** A row of label pills, as on the cards. Use it in the details to repeat a card's labels. */
export function CardLabels({ labels }: { labels: string[] }) {
  return (
    <span className="flex h-5 flex-nowrap gap-1.5 overflow-hidden">
      {labels.map((label) => (
        <span
          key={label}
          className="shrink-0 rounded-full bg-zinc-100 px-2 text-xs leading-5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

function GroupHeading({ group }: { group: CardDetailGroup<unknown> }) {
  if (!group.title) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-black dark:text-zinc-50">{group.title}</h3>
      {group.description && <p className="text-xs text-zinc-500 dark:text-zinc-500">{group.description}</p>}
    </div>
  );
}

/**
 * Cards on the left, the selected card's details on the right.
 *
 * On large screens the cards fill two columns and the third column holds one
 * detail card. It starts level with the first card and stays in view while the
 * page scrolls, and opening a card doesn't push the other cards around. Below
 * `lg` there's no third column, so the details open under the selected card
 * instead. Clicking the selected card again closes it.
 *
 * Every card has the same four rows (title, two of description, labels), so
 * cards line up whatever their text. Groups share one selection and one detail
 * column, so several labelled sets of cards can sit beside a single panel.
 *
 * Use it wherever a card has more to show than fits on it.
 */
export function CardDetailGrid<T>({
  groups,
  getId,
  card,
  renderDetail,
  emptyDetail,
  detailLabel,
  cardProps,
  detailProps,
}: {
  groups: CardDetailGroup<T>[];
  getId: (item: T) => string;
  /** What each card shows. The component lays it out in four rows. */
  card: (item: T) => CardFace;
  /**
   * What the detail card shows for the selected item. Under its own card the
   * detail can skip repeating what the card already says.
   */
  renderDetail: (item: T, placement: DetailPlacement) => ReactNode;
  /** Shown in the detail column until a card is selected. */
  emptyDetail: string;
  /** Accessible name of the detail column, e.g. "Selected pool". */
  detailLabel: string;
  /** Extra attributes for every card, e.g. `unbuilt("panel", …)`. */
  cardProps?: Record<string, string>;
  /** Extra attributes for the detail card. */
  detailProps?: Record<string, string>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = groups.flatMap((group) => group.items).find((item) => getId(item) === selectedId);
  const [first, ...rest] = groups;

  function detailCard(item: T, placement: DetailPlacement) {
    return (
      <div
        {...detailProps}
        className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        {renderDetail(item, placement)}
      </div>
    );
  }

  function cards(group: CardDetailGroup<T>) {
    if (group.items.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          {group.empty ?? "Nothing here yet."}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {group.items.map((item) => {
          const id = getId(item);
          const face = card(item);
          const isSelected = id === selectedId;
          return (
            <Fragment key={id}>
              <button
                type="button"
                {...cardProps}
                aria-pressed={isSelected}
                onClick={() => setSelectedId(isSelected ? null : id)}
                className={`flex w-full flex-col rounded-lg border bg-white p-4 text-left transition-colors dark:bg-zinc-950 ${
                  isSelected
                    ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <span className="block truncate text-sm font-medium leading-5 text-black dark:text-zinc-50">
                  {face.title}
                </span>
                <span className="mt-1 line-clamp-2 h-8 text-xs leading-4 text-zinc-500 dark:text-zinc-500">
                  {face.description}
                </span>
                <span className="mt-2 block">
                  <CardLabels labels={face.labels ?? []} />
                </span>
              </button>
              {isSelected && <div className="lg:hidden">{detailCard(item, "below")}</div>}
            </Fragment>
          );
        })}
      </div>
    );
  }

  // The first group's heading sits in its own row, so the detail column starts level with the first card.
  const hasFirstHeading = Boolean(first?.title);

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-x-4">
      {first && hasFirstHeading && (
        <div className="lg:col-span-2">
          <GroupHeading group={first} />
        </div>
      )}

      <div className="flex flex-col gap-6 lg:col-span-2 lg:col-start-1">
        {first && cards(first)}
        {rest.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <GroupHeading group={group} />
            {cards(group)}
          </div>
        ))}
      </div>

      <aside
        aria-label={detailLabel}
        className={`hidden lg:sticky lg:top-4 lg:col-start-3 lg:block lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto ${
          hasFirstHeading ? "lg:row-start-2" : "lg:row-start-1"
        }`}
      >
        {selected ? (
          detailCard(selected, "column")
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
            {emptyDetail}
          </div>
        )}
      </aside>
    </div>
  );
}
