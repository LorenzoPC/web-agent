import Link from "next/link";

/**
 * Segmented control whose options are links, so the choice lives in the URL
 * (shareable, back-button friendly) and the page stays a Server Component.
 * Same look as the Marketplace's Capabilities/Roles toggle.
 */
export function LinkToggle({
  label,
  options,
  active,
}: {
  label: string;
  options: { id: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <nav
      aria-label={label}
      className="flex max-w-full flex-wrap gap-1 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800"
    >
      {options.map((option) => (
        <Link
          key={option.id}
          href={option.href}
          scroll={false}
          aria-current={option.id === active ? "page" : undefined}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            option.id === active
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
