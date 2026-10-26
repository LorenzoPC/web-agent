import type { ReactNode } from "react";

/** One-line section title with its description inline; `children` sit at the right edge (counts, legends). */
export function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <h2 className="text-sm font-medium text-black dark:text-zinc-50">{title}</h2>
        {description && <p className="text-xs text-zinc-500 dark:text-zinc-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}
