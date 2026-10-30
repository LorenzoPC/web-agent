"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/onboarding/copy-button";
import { CheckList } from "@/components/tools/recipe-panel";
import { accessFor, checkServer, matchRule, toClientView, type McpPerson } from "@/lib/mcp-server";
import { MOCK_BUSINESS_UNITS } from "@/lib/mock-data";
import {
  MCP_ACCESS_LEVELS,
  MCP_AUDIENCES,
  MCP_BASE_URL,
  MCP_DATASETS,
  MCP_DEPARTMENTS,
  type McpAudience,
  type McpCatalogTool,
  type McpServerDraft,
} from "@/lib/mock-mcp-server-data";
import { SELECT_CLASS, ruleLabel } from "./access-rules";

const CARD_CLASS = "rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

/** Live server lint and publishing, then a preview of what one person would get. */
export function ServerPanel({
  server,
  tools,
  published,
  onPublish,
}: {
  server: McpServerDraft;
  tools: McpCatalogTool[];
  /** The draft as last published. Any edit makes a new draft, so a different object means unpublished changes. */
  published: McpServerDraft | null;
  onPublish: () => void;
}) {
  const checks = checkServer(server, tools);
  const passing = checks.filter((c) => c.level === "pass").length;
  const blocked = checks.some((c) => c.level === "fail");
  const isLive = published === server;
  const status = isLive ? "Published" : published ? "Unpublished changes" : "Draft";
  const url = `${MCP_BASE_URL}${server.slug}`;

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
      <div className={CARD_CLASS}>
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-black dark:text-zinc-50">Server check</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            {passing}/{checks.length} passing
          </span>
        </div>
        <CheckList checks={checks} />

        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            Status
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              }`}
            >
              {status}
            </span>
          </div>
          {isLive ? (
            <div className="flex flex-col gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1 break-all font-mono text-xs">{url}</span>
                <CopyButton text={url} />
              </div>
              <p>
                Listed in the catalog under MCP servers. People connect with the steps on{" "}
                <Link href="/onboarding" className="font-medium underline">
                  Get started
                </Link>
                .
              </p>
              <p className="text-xs">Not persisted yet. This only lives in this browser session.</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onPublish}
                disabled={blocked}
                className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {published ? "Publish changes" : "Publish"}
              </button>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                {blocked
                  ? "Fix the ✕ items to publish."
                  : "Mockup: publishing doesn't deploy anything or save the server."}
              </p>
            </>
          )}
        </div>
      </div>

      <PreviewAs server={server} tools={tools} />
    </aside>
  );
}

function PreviewAs({ server, tools }: { server: McpServerDraft; tools: McpCatalogTool[] }) {
  const [person, setPerson] = useState<McpPerson>({
    audience: "internal",
    unitId: "customer-support",
    departmentId: "support-tier-1",
  });
  const rule = matchRule(server.rules, person);
  const exposed = MCP_DATASETS.filter((d) => server.datasetIds.includes(d.id));
  const external = person.audience !== "internal";

  return (
    <div className={CARD_CLASS}>
      <h2 className="text-sm font-medium text-black dark:text-zinc-50">Preview as</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Pick someone to see which rule applies to them and what their AI client gets.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        <select
          aria-label="Audience"
          value={person.audience}
          onChange={(e) => setPerson({ ...person, audience: e.target.value as McpAudience })}
          className={SELECT_CLASS}
        >
          {MCP_AUDIENCES.map((audience) => (
            <option key={audience.id} value={audience.id}>
              {audience.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            aria-label="Business unit"
            value={person.unitId ?? ""}
            onChange={(e) => setPerson({ ...person, unitId: e.target.value || null, departmentId: null })}
            className={`${SELECT_CLASS} min-w-0`}
          >
            <option value="">No business unit</option>
            {MOCK_BUSINESS_UNITS.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Department"
            value={person.departmentId ?? ""}
            disabled={!person.unitId}
            onChange={(e) => setPerson({ ...person, departmentId: e.target.value || null })}
            className={`${SELECT_CLASS} min-w-0 disabled:opacity-50`}
          >
            <option value="">No department</option>
            {MCP_DEPARTMENTS.filter((d) => d.unitId === person.unitId).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rule ? (
        <>
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            Rule: <span className="font-medium text-black dark:text-zinc-50">{ruleLabel(rule)}</span>
          </p>
          {exposed.length > 0 && (
            <dl className="mt-2 flex flex-col gap-1 text-xs">
              {exposed.map((dataset) => {
                const level = accessFor(server, rule, dataset.id);
                const companyOnly = external && level !== "none" && server.companyScopedIds.includes(dataset.id);
                return (
                  <div key={dataset.id} className="flex justify-between gap-2">
                    <dt className="text-zinc-600 dark:text-zinc-400">{dataset.name}</dt>
                    <dd className={level === "none" ? "text-zinc-400 dark:text-zinc-600" : "font-medium text-black dark:text-zinc-50"}>
                      {level === "none" ? "No access" : MCP_ACCESS_LEVELS.find((l) => l.id === level)?.label}
                      {companyOnly && <span className="font-normal text-zinc-500">, own company</span>}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
          <h3 className="mt-4 text-xs font-medium text-black dark:text-zinc-50">What their AI client sees</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
            The server&apos;s instructions, and only the tools this rule allows.
          </p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {JSON.stringify(toClientView(server, tools, rule), null, 2)}
          </pre>
        </>
      ) : (
        <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          No rule matches, so this person can&apos;t connect.
        </p>
      )}
    </div>
  );
}
