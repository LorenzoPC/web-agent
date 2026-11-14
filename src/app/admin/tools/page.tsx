import Link from "next/link";
import { LinkToggle } from "@/components/dashboard/link-toggle";
import { ToolsTable } from "@/components/tools/tools-table";
import { MOCK_ADMIN_TOOLS } from "@/lib/mock-admin-tools-data";
import { TOOL_CATEGORIES } from "@/lib/mock-marketplace-data";

const ALL = "all";

const CATEGORIES = TOOL_CATEGORIES.map((label) => ({
  id: label.toLowerCase().replace(/[^a-z]+/g, "-"),
  label,
}));

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Every tool on the platform (docs/prds/sitemap.html, Admin). The category filter lives in ?category=. */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const category = CATEGORIES.find((c) => c.id === firstParam(params.category));
  const tools = category ? MOCK_ADMIN_TOOLS.filter((tool) => tool.category === category.label) : MOCK_ADMIN_TOOLS;
  const live = tools.filter((tool) => tool.live).length;

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 py-16 px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Tools</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Every tool agents on the platform can call. Live tools run when an agent calls them; catalog-only tools
              are listed for agents but don&apos;t do anything yet.
            </p>
          </div>
          <Link
            href="/admin/tools/new"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-admin px-3 py-1.5 text-sm font-medium text-admin-foreground transition-colors hover:bg-admin-hover"
          >
            Create tool
            <span className="text-xs text-admin-foreground/80">Admin</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <LinkToggle
            label="Category"
            active={category?.id ?? ALL}
            options={[
              { id: ALL, label: "All", href: "/admin/tools" },
              ...CATEGORIES.map((c) => ({ id: c.id, label: c.label, href: `/admin/tools?category=${c.id}` })),
            ]}
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {plural(tools.length, "tool", "tools")} · {live} live
          </p>
        </div>

        <ToolsTable tools={tools} />
      </main>
    </div>
  );
}
