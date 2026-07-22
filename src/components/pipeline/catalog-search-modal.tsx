"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogCategory } from "@/lib/catalog-db";
import { formatCostModel } from "@/lib/pipeline-data";
import type { CostModel } from "@/lib/types";

const PAGE_SIZE = 20;

export interface ModalItem {
  id: string;
  name: string;
  description: string;
  cost: CostModel;
  provider?: string;
  sourceLabel?: string;
}

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; title: string; subtitle: string; items: ModalItem[]; hasMore: boolean };

export function CatalogSearchModal({
  category,
  isSelected,
  onSelect,
  onClose,
}: {
  category: CatalogCategory;
  isSelected: (id: string) => boolean;
  onSelect: (item: ModalItem) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  async function fetchPage(offset: number) {
    const res = await fetch(
      `/api/ecosystem/catalog?category=${category}&offset=${offset}&limit=${PAGE_SIZE}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data as { title: string; subtitle: string; items: ModalItem[]; hasMore: boolean };
  }

  useEffect(() => {
    let cancelled = false;
    fetchPage(0)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", ...data });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Failed to load catalog",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    if (state.status !== "ready" || !state.hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadingMore((already) => {
            if (already) return already;
            fetchPage(state.items.length)
              .then((data) => {
                setState((prev) =>
                  prev.status === "ready"
                    ? { ...prev, items: [...prev.items, ...data.items], hasMore: data.hasMore }
                    : prev,
                );
              })
              .finally(() => setLoadingMore(false));
            return true;
          });
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              {state.status === "ready" ? state.title : "Loading…"}
            </h2>
            {state.status === "ready" && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{state.subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {state.status === "loading" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading catalog…</p>
          )}
          {state.status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          )}
          {state.status === "ready" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {state.items.map((item) => {
                  const selected = isSelected(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item)}
                      className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-800"
                          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                      }`}
                    >
                      <h3 className="truncate text-sm font-medium text-black dark:text-zinc-50">
                        {item.name}
                      </h3>
                      <span className="text-xs font-medium text-black dark:text-zinc-50">
                        {formatCostModel(item.cost)}
                      </span>
                      <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-500">
                        {item.description}
                      </p>
                      {(item.provider || item.sourceLabel) && (
                        <p className="truncate text-xs text-zinc-400 dark:text-zinc-600">
                          {item.provider ?? item.sourceLabel}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              {state.hasMore && (
                <div ref={sentinelRef} className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600">
                  {loadingMore ? "Loading more…" : ""}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

