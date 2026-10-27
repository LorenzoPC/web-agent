"use client";

import { Fragment, useState } from "react";
import { Checkbox, Field, INPUT_CLASS, Section } from "@/components/tools/form-controls";
import { REQUIRED_ACCESS, canUseTool, slugProblem, slugify } from "@/lib/mcp-server";
import {
  MCP_ACCESS_LEVELS,
  MCP_BASE_URL,
  MCP_DATASETS,
  MCP_TOOL_CATEGORIES,
  type McpCatalogTool,
  type McpServerDraft,
  type McpToolCategory,
  type McpToolSafety,
} from "@/lib/mock-mcp-server-data";
import { formatCost, formatCostModel } from "@/lib/pipeline-data";
import { AccessRules, ruleLabel } from "./access-rules";
import { FILTER_ICON, IconMenu, SORT_ICON } from "./icon-menu";
import { ServerPanel } from "./server-panel";

type ToolSort = "catalog" | "name" | "selected";

const TOOL_SORTS: { id: ToolSort; label: string }[] = [
  { id: "catalog", label: "Catalog order" },
  { id: "name", label: "Name (A–Z)" },
  { id: "selected", label: "Selected first" },
];

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900";

const SAFETY_BADGE: Record<McpToolSafety, { label: string; className: string }> = {
  read: { label: "Read-only", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" },
  write: { label: "Changes data", className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  destructive: { label: "Destructive", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

function toggle(ids: string[], id: string, on: boolean): string[] {
  return on ? [...ids, id] : ids.filter((x) => x !== id);
}

/** Rules that let someone use the tool, minus narrower rules already covered by an allowing broader one. */
function whoCanUse(server: McpServerDraft, tool: McpCatalogTool): string[] {
  const allowing = server.rules.filter((rule) => canUseTool(server, rule, tool));
  return allowing
    .filter(
      (rule) =>
        !allowing.some(
          (broader) =>
            broader.audience === rule.audience &&
            ((broader.unitId === null && rule.unitId !== null) ||
              (broader.unitId === rule.unitId && broader.departmentId === null && rule.departmentId !== null)),
        ),
    )
    .map(ruleLabel);
}

export function McpServerEditor({
  templates,
  tools,
}: {
  templates: { label: string; server: McpServerDraft }[];
  /** Catalog tools the server can offer. */
  tools: McpCatalogTool[];
}) {
  const [startedFrom, setStartedFrom] = useState(templates[0].label);
  const [server, setServer] = useState(templates[0].server);
  const [published, setPublished] = useState<McpServerDraft | null>(null);
  // The URL follows the name until someone types their own.
  const [slugEdited, setSlugEdited] = useState(templates[0].server.slug !== slugify(templates[0].server.name));
  const [query, setQuery] = useState("");
  const [safetyFilter, setSafetyFilter] = useState<McpToolSafety[]>([]);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [sort, setSort] = useState<ToolSort>("catalog");
  const [collapsed, setCollapsed] = useState<McpToolCategory[]>([]);
  // Mockup: dataset requests stay on this page and aren't sent anywhere yet.
  const [datasetRequests, setDatasetRequests] = useState<string[]>([]);
  const [requestDraft, setRequestDraft] = useState<string | null>(null);

  function update(patch: Partial<McpServerDraft>) {
    setServer((prev) => ({ ...prev, ...patch }));
  }

  function startFrom(label: string, next: McpServerDraft) {
    setStartedFrom(label);
    setServer(next);
    setPublished(null);
    setSlugEdited(next.slug !== slugify(next.name));
  }

  const exposed = MCP_DATASETS.filter((d) => server.datasetIds.includes(d.id));
  const problem = server.slug ? slugProblem(server.slug) : null;

  const q = query.trim().toLowerCase();
  const filterCount = safetyFilter.length + (selectedOnly ? 1 : 0);
  const visibleTools = tools
    .filter(
      (t) =>
        (!q || `${t.toolName} ${t.name} ${t.description}`.toLowerCase().includes(q)) &&
        (!safetyFilter.length || safetyFilter.includes(t.safety)) &&
        (!selectedOnly || server.toolIds.includes(t.id)),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.toolName.localeCompare(b.toolName)
        : sort === "selected"
          ? Number(server.toolIds.includes(b.id)) - Number(server.toolIds.includes(a.id))
          : 0,
    );
  const toolGroups = MCP_TOOL_CATEGORIES.map((category) => ({
    category,
    items: visibleTools.filter((t) => t.category === category.id),
    selected: tools.filter((t) => t.category === category.id && server.toolIds.includes(t.id)).length,
    total: tools.filter((t) => t.category === category.id).length,
  })).filter((group) => group.items.length > 0);

  const paid = tools
    .filter((t) => server.toolIds.includes(t.id) && t.cost.kind === "perRequest")
    .map((t) => ({ tool: t, price: t.cost.kind === "perRequest" ? t.cost.dollarsPerRequest : 0 }))
    .sort((a, b) => b.price - a.price)[0];

  function renderTool(tool: McpCatalogTool) {
    const on = server.toolIds.includes(tool.id);
    const badge = SAFETY_BADGE[tool.safety];
    const needs = MCP_ACCESS_LEVELS.find((l) => l.id === REQUIRED_ACCESS[tool.safety])?.label;
    const datasets = tool.datasetIds.map((id) => MCP_DATASETS.find((d) => d.id === id)?.name ?? id);
    const usedBy = on ? whoCanUse(server, tool) : [];
    return (
      <li key={tool.id} className="flex flex-col gap-2 p-3">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={on}
            onChange={(e) =>
              update({
                toolIds: toggle(server.toolIds, tool.id, e.target.checked),
                // Destructive tools start out asking first.
                confirmToolIds:
                  e.target.checked && tool.safety === "destructive"
                    ? toggle(server.confirmToolIds, tool.id, true)
                    : server.confirmToolIds.filter((id) => id !== tool.id),
              })
            }
            className="mt-1"
          />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-black dark:text-zinc-50">{tool.toolName}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
                {badge.label}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-500">{formatCostModel(tool.cost)}</span>
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">{tool.description}</span>
            {datasets.length > 0 && (
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500">
                Needs {needs} on {datasets.join(", ")}
              </span>
            )}
          </span>
        </label>
        {on && (
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pl-6">
            <span
              className={`text-xs ${usedBy.length ? "text-zinc-600 dark:text-zinc-400" : "text-amber-700 dark:text-amber-400"}`}
            >
              {usedBy.length ? `Available to ${usedBy.join(", ")}` : "Nobody can use it yet"}
            </span>
            {tool.safety !== "read" && (
              <Checkbox
                label="Confirm first"
                hint="Ask the person before each call."
                checked={server.confirmToolIds.includes(tool.id)}
                onChange={(checked) =>
                  update({ confirmToolIds: toggle(server.confirmToolIds, tool.id, checked) })
                }
              />
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Start from" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Start from</span>
        {templates.map((template) => (
          <button
            key={template.label}
            type="button"
            aria-pressed={template.label === startedFrom}
            onClick={() => startFrom(template.label, template.server)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              template.label === startedFrom
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {template.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-4">
          <Section
            step={1}
            title="Basics"
            hint="AI clients show the name, connect to the URL, and read the instructions to decide when to use the server."
          >
            <Field label="Name">
              <input
                type="text"
                value={server.name}
                onChange={(e) =>
                  update({ name: e.target.value, ...(slugEdited ? {} : { slug: slugify(e.target.value) }) })
                }
                placeholder="Support knowledge base"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="URL" hint="People paste this into Claude, ChatGPT or another AI client. It can't change after publishing.">
              <span className="flex rounded-lg border border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <span className="shrink-0 border-r border-zinc-300 bg-zinc-50 px-2.5 py-2.5 font-mono text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
                  webagent.dev/mcp/
                </span>
                <input
                  type="text"
                  value={server.slug}
                  onChange={(e) => {
                    const slug = e.target.value.toLowerCase();
                    // Clearing the field hands the URL back to the name.
                    setSlugEdited(slug !== "");
                    update({ slug });
                  }}
                  placeholder="support-kb"
                  spellCheck={false}
                  aria-invalid={!!problem}
                  className="min-w-0 flex-1 rounded-r-lg bg-transparent p-2.5 font-mono text-black outline-none dark:text-zinc-50"
                />
              </span>
              <span
                className={`mt-1.5 block text-xs ${problem ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-500"}`}
              >
                {problem ?? (server.slug ? `${MCP_BASE_URL}${server.slug}` : "Fills in from the name.")}
              </span>
            </Field>
            <Field label="Instructions for the model" hint="What's on this server, when to use it, and in what order to use the tools.">
              <textarea
                value={server.instructions}
                onChange={(e) => update({ instructions: e.target.value })}
                rows={4}
                placeholder="Answers product questions from our help center… Search the help center first and cite the article…"
                className={INPUT_CLASS}
              />
            </Field>
          </Section>

          <Section
            step={2}
            title="Datasets"
            hint="The data this server exposes. Tools can only reach exposed datasets, as far as the access rules allow. Own company only means clients, partners and resellers only see their own company's records."
          >
            <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {MCP_DATASETS.map((dataset) => {
                const on = server.datasetIds.includes(dataset.id);
                return (
                  <li key={dataset.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-3">
                    <Checkbox
                      label={dataset.name}
                      hint={`${dataset.description} · ${dataset.size}`}
                      checked={on}
                      onChange={(checked) => update({ datasetIds: toggle(server.datasetIds, dataset.id, checked) })}
                    />
                    {on && (
                      <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-600 max-sm:pl-6 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={server.companyScopedIds.includes(dataset.id)}
                          onChange={(e) =>
                            update({ companyScopedIds: toggle(server.companyScopedIds, dataset.id, e.target.checked) })
                          }
                        />
                        Own company only
                      </label>
                    )}
                  </li>
                );
              })}
              {datasetRequests.map((request, i) => (
                <li key={i} className="flex items-start justify-between gap-4 p-3">
                  <span className="min-w-0 text-sm text-zinc-700 dark:text-zinc-300">{request}</span>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    Requested
                  </span>
                </li>
              ))}
              <li className="p-3">
                {requestDraft === null ? (
                  <button
                    type="button"
                    onClick={() => setRequestDraft("")}
                    className="flex items-center gap-2 text-sm text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    <span className="w-4 text-center text-base leading-none">+</span>
                    Request for a missing type or known dataset
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setDatasetRequests([...datasetRequests, requestDraft.trim()]);
                      setRequestDraft(null);
                    }}
                    className="flex flex-col gap-2"
                  >
                    <Field
                      label="Request for a missing type or known dataset"
                      hint="Name the data and where it lives today, so the data team can connect it."
                    >
                      <textarea
                        value={requestDraft}
                        onChange={(e) => setRequestDraft(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="e.g. Product usage events from Segment, or our Salesforce opportunities"
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!requestDraft.trim()}
                        className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                      >
                        Send request
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestDraft(null)}
                        className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                      >
                        Cancel
                      </button>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">Mockup: not sent anywhere yet.</span>
                    </div>
                  </form>
                )}
              </li>
            </ul>
          </Section>

          <Section
            step={3}
            title="Access"
            hint="Who can connect, and what they can do with each dataset. Business unit and department come from the person's directory profile when they sign in."
          >
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Each person gets the most specific rule that matches them: their department&apos;s, then their business
              unit&apos;s, then their audience&apos;s. A new rule starts as a copy of the broader one.{" "}
              <span className="font-medium">Read</span> lets tools search and view,{" "}
              <span className="font-medium">Write</span> lets them create and update, and{" "}
              <span className="font-medium">Manage</span> also allows destructive tools.{" "}
              <span className="font-medium">Tools</span> set to Per tool gives each tool to whoever has enough access to
              its data; Read-only drops tools that change data, and None drops them all.
            </p>
            <AccessRules rules={server.rules} datasets={exposed} onChange={(rules) => update({ rules })} />
          </Section>

          <Section
            step={4}
            title="Tools"
            hint="Pick tools from the catalog. Each person's AI client only lists the tools their rule gives them enough access for."
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                aria-label="Search the catalog"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the catalog"
                className={`${INPUT_CLASS} sm:w-72`}
              />
              <span className="ml-auto mr-1 shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                {server.toolIds.length} selected
              </span>
              <IconMenu label="Filter tools" icon={FILTER_ICON} active={filterCount > 0}>
                {() => (
                  <>
                    <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-zinc-500">Safety</p>
                    {(Object.keys(SAFETY_BADGE) as McpToolSafety[]).map((safety) => (
                      <label key={safety} className={MENU_ITEM_CLASS}>
                        <input
                          type="checkbox"
                          checked={safetyFilter.includes(safety)}
                          onChange={(e) => setSafetyFilter(toggle(safetyFilter, safety, e.target.checked) as McpToolSafety[])}
                        />
                        {SAFETY_BADGE[safety].label}
                      </label>
                    ))}
                    <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                    <label className={MENU_ITEM_CLASS}>
                      <input type="checkbox" checked={selectedOnly} onChange={(e) => setSelectedOnly(e.target.checked)} />
                      Selected only
                    </label>
                    {filterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSafetyFilter([]);
                          setSelectedOnly(false);
                        }}
                        className={`${MENU_ITEM_CLASS} text-zinc-500 dark:text-zinc-500`}
                      >
                        Clear filters
                      </button>
                    )}
                  </>
                )}
              </IconMenu>
              <IconMenu label="Sort tools" icon={SORT_ICON} active={sort !== "catalog"}>
                {(close) =>
                  TOOL_SORTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sort === option.id}
                      onClick={() => {
                        setSort(option.id);
                        close();
                      }}
                      className={MENU_ITEM_CLASS}
                    >
                      <span className="flex-1">{option.label}</span>
                      {sort === option.id && (
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 shrink-0">
                          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))
                }
              </IconMenu>
            </div>
            <ul className="flex flex-col divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {toolGroups.map(({ category, items, selected, total }) => {
                // A search shows its matches even inside a collapsed group.
                const open = !!q || !collapsed.includes(category.id);
                return (
                  <Fragment key={category.id}>
                    <li className="bg-zinc-50 dark:bg-zinc-900">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setCollapsed(toggle(collapsed, category.id, open) as McpToolCategory[])}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-900 dark:text-zinc-100"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          aria-hidden="true"
                          className={`size-3 shrink-0 text-zinc-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
                        >
                          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {category.label}
                        <span className="ml-auto font-normal text-zinc-500 dark:text-zinc-500">
                          {selected}/{total} selected
                        </span>
                      </button>
                    </li>
                    {open && items.map(renderTool)}
                  </Fragment>
                );
              })}
              {visibleTools.length === 0 && (
                <li className="p-4 text-center text-xs text-zinc-500">
                  {q ? `No catalog tools match “${query.trim()}”.` : "No tools match the filters."}
                </li>
              )}
            </ul>
          </Section>

          <Section
            step={5}
            title="Limits"
            hint="Keeps one person, or an agent stuck in a loop, from running up the bill."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-md">
              <Field label="Calls per person per day">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={server.callsPerPersonPerDay}
                  onChange={(e) => update({ callsPerPersonPerDay: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Monthly budget ($)">
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={server.monthlyBudget}
                  onChange={(e) => update({ monthlyBudget: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {paid
                ? `At ${server.callsPerPersonPerDay} calls a day, one person spends at most ${formatCost(
                    server.callsPerPersonPerDay * paid.price,
                  )} a day (${paid.tool.toolName} costs ${formatCost(paid.price)} per call). Calls stop for everyone once the month's tool spend reaches $${server.monthlyBudget}.`
                : "Every selected tool is free, so only the daily limit applies. The budget kicks in if you add a paid tool."}
            </p>
          </Section>
        </div>

        <ServerPanel server={server} tools={tools} published={published} onPublish={() => setPublished(server)} />
      </div>
    </div>
  );
}
