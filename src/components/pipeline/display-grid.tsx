"use client";

import { useState, type ReactNode } from "react";

/**
 * A display card beside a grid of compact cards. The display shows the hovered
 * (or keyboard-focused) card, falling back to the selected one, then the first.
 * Actions live in the display card: hover to preview, click to select, then act.
 * `trailing` renders after the last card, such as a CreateNewCard.
 */
export function DisplayGrid<T extends { id: string }>({
  items,
  selectedId,
  onSelect,
  renderCard,
  renderDisplay,
  trailing,
  gridClassName = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
}: {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  renderCard: (item: T, index: number) => ReactNode;
  renderDisplay: (item: T, index: number) => ReactNode;
  trailing?: ReactNode;
  gridClassName?: string;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const shown = items.find((item) => item.id === previewId) ?? selected;
  if (!shown) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="rounded-lg border border-black bg-white p-4 sm:min-h-52 sm:w-64 sm:shrink-0 dark:border-white dark:bg-zinc-950">
        {shown.id !== selected.id && (
          <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-500">
            Preview: click the card to select it
          </p>
        )}
        {renderDisplay(shown, items.indexOf(shown))}
      </div>

      <ul
        onMouseLeave={() => setPreviewId(null)}
        className={`grid flex-1 gap-3 ${gridClassName}`}
      >
        {items.map((item, index) => {
          const isSelected = item.id === selected.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(item.id)}
                onMouseEnter={() => setPreviewId(item.id)}
                onFocus={() => setPreviewId(item.id)}
                onBlur={() => setPreviewId(null)}
                className={`flex h-full w-full flex-col rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
                    : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
                }`}
              >
                {renderCard(item, index)}
              </button>
            </li>
          );
        })}
        {trailing && <li onMouseEnter={() => setPreviewId(null)}>{trailing}</li>}
      </ul>
    </div>
  );
}
