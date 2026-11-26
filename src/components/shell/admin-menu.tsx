"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AudienceTabLabel } from "@/components/ui/audience-label";
import { routeAudience } from "@/lib/audience";

// The built Admin screens (docs/prds/sitemap.html), in two groups: the screens, then the create flows.
const ADMIN_SCREENS = [
  { href: "/admin", label: "Product overview", purpose: "Product health, evals, cost per task" },
  { href: "/admin/agents/new", label: "Builder", purpose: "Describe the job, get a proposed flow" },
  { href: "/admin/patterns", label: "Patterns", purpose: "Reusable multi-agent templates" },
  { href: "/admin/prompts", label: "Prompts", purpose: "The prompts library" },
  { href: "/admin/tools", label: "Tools", purpose: "Every tool on the platform" },
  { href: "/admin/mcp-servers", label: "MCP servers", purpose: "Ones we publish, and ones agents use" },
] as const;

const ADMIN_CREATE = [
  { href: "/admin/tools/new", label: "Create tool", purpose: "Recipe editor and Discovery session" },
  { href: "/admin/mcp-servers/new", label: "Create MCP server", purpose: "Publish company data to AI clients" },
] as const;

export const ADMIN_LINKS = [...ADMIN_SCREENS, ...ADMIN_CREATE];

const MENU_ID = "admin-menu";
const MENU_WIDTH = 288; // w-72
const GUTTER = 16;

/** Pins the menu under the tab, kept inside the viewport. */
function place(button: HTMLElement | null, menu: HTMLElement | null) {
  if (!button || !menu) return;
  const rect = button.getBoundingClientRect();
  const maxLeft = window.innerWidth - MENU_WIDTH - GUTTER;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.max(GUTTER, Math.min(rect.left, maxLeft))}px`;
}

function hide(menu: HTMLElement | null) {
  if (menu?.matches(":popover-open")) menu.hidePopover();
}

/**
 * The nav's Admin entry: a red tab that opens a menu of the Admin screens.
 * The menu is a popover, so it renders in the top layer and isn't clipped by
 * the nav's sideways scroll on phones. The browser handles closing it on an
 * outside click or Escape, and gives focus back to the tab.
 */
export function AdminMenu() {
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const inAdmin = routeAudience(pathname) === "admin";

  const close = () => hide(menuRef.current);

  // Close after a navigation, including back and forward.
  useEffect(() => hide(menuRef.current), [pathname]);

  // The tab moves when the page or the nav scrolls, so the menu follows it.
  useEffect(() => {
    if (!open) return;
    const follow = () => place(buttonRef.current, menuRef.current);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  const item = (link: (typeof ADMIN_LINKS)[number]) => (
    <li key={link.href}>
      <Link
        href={link.href}
        onClick={close}
        aria-current={link.href === pathname ? "page" : undefined}
        className="block rounded-md px-2.5 py-1.5 transition-colors hover:bg-zinc-100 aria-[current=page]:bg-zinc-100 dark:hover:bg-zinc-900 dark:aria-[current=page]:bg-zinc-900"
      >
        <span className="block font-medium text-black dark:text-zinc-50">{link.label}</span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">{link.purpose}</span>
      </Link>
    </li>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={MENU_ID}
        aria-expanded={open}
        aria-controls={MENU_ID}
        // Marks Admin as the current area; the nav also uses it to scroll this tab into view on phones.
        aria-current={inAdmin ? "true" : undefined}
        // Placed before the browser opens the popover, so it never paints in the wrong spot.
        onClick={() => place(buttonRef.current, menuRef.current)}
        // The red pill brings its own padding, so the tab trims its own (px-1.5) to keep the nav's spacing even.
        className={`group -mb-px shrink-0 whitespace-nowrap border-b-2 px-1.5 py-2 text-sm font-medium transition-colors ${
          inAdmin
            ? "border-black text-black dark:border-white dark:text-zinc-50"
            : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        <AudienceTabLabel audience="admin" cue={false}>
          Admin
          <svg viewBox="0 0 12 12" aria-hidden="true" className={`ml-1 inline size-3 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </AudienceTabLabel>
      </button>
      <div
        ref={menuRef}
        id={MENU_ID}
        popover="auto"
        onToggle={(event) => setOpen(event.newState === "open")}
        // The red top edge marks the menu as Admin, like the Admin area's card on the sitemap.
        className="fixed inset-auto m-0 w-72 rounded-lg border border-t-2 border-zinc-200 border-t-admin bg-white p-1.5 text-sm shadow-md dark:border-zinc-800 dark:border-t-admin dark:bg-zinc-950"
      >
        <nav aria-label="Admin screens">
          <ul>{ADMIN_SCREENS.map(item)}</ul>
          <ul className="mt-1.5 border-t border-zinc-200 pt-1.5 dark:border-zinc-800">{ADMIN_CREATE.map(item)}</ul>
        </nav>
      </div>
    </>
  );
}
