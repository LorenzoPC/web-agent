"use client";

import { useState } from "react";
import { matchRule } from "@/lib/mcp-server";
import { MOCK_BUSINESS_UNITS } from "@/lib/mock-data";
import {
  MCP_ACCESS_LEVELS,
  MCP_AUDIENCES,
  MCP_DEPARTMENTS,
  MCP_TOOL_ACCESS_OPTIONS,
  type McpAccess,
  type McpAccessRule,
  type McpAudience,
  type McpDataset,
  type McpToolAccess,
} from "@/lib/mock-mcp-server-data";

export const SELECT_CLASS =
  "rounded-lg border border-zinc-300 bg-white p-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type Who = Pick<McpAccessRule, "audience" | "unitId" | "departmentId">;

export function unitName(id: string | null): string | undefined {
  return MOCK_BUSINESS_UNITS.find((unit) => unit.id === id)?.name;
}

export function departmentName(id: string | null): string | undefined {
  return MCP_DEPARTMENTS.find((department) => department.id === id)?.name;
}

/** "Internal · Customer Support · Escalations" */
export function ruleLabel(who: Who): string {
  return [MCP_AUDIENCES.find((a) => a.id === who.audience)?.label, unitName(who.unitId), departmentName(who.departmentId)]
    .filter(Boolean)
    .join(" · ");
}

// Audience order, then each audience-wide rule before the rules that narrow it.
function sortRules(rules: McpAccessRule[]): McpAccessRule[] {
  const audienceIndex = (rule: McpAccessRule) => MCP_AUDIENCES.findIndex((a) => a.id === rule.audience);
  return [...rules].sort(
    (a, b) =>
      audienceIndex(a) - audienceIndex(b) ||
      (unitName(a.unitId) ?? "").localeCompare(unitName(b.unitId) ?? "") ||
      (departmentName(a.departmentId) ?? "").localeCompare(departmentName(b.departmentId) ?? ""),
  );
}

const INDENT = ["pl-3", "pl-5", "pl-7"];

const CELL_SELECT_CLASS =
  "w-full min-w-20 rounded-md border border-zinc-300 bg-white px-1.5 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900";

/** Rules down the side, exposed datasets and then Tools across the top, an access level in each cell. */
export function AccessRules({
  rules,
  datasets,
  onChange,
}: {
  rules: McpAccessRule[];
  /** Exposed datasets only. */
  datasets: McpDataset[];
  onChange: (rules: McpAccessRule[]) => void;
}) {
  const [draft, setDraft] = useState<Who>({ audience: "internal", unitId: null, departmentId: null });
  const exists = rules.some(
    (r) => r.audience === draft.audience && r.unitId === draft.unitId && r.departmentId === draft.departmentId,
  );

  function setAccess(ruleId: string, datasetId: string, level: McpAccess) {
    onChange(rules.map((r) => (r.id === ruleId ? { ...r, access: { ...r.access, [datasetId]: level } } : r)));
  }

  function setTools(ruleId: string, tools: McpToolAccess) {
    onChange(rules.map((r) => (r.id === ruleId ? { ...r, tools } : r)));
  }

  function addRule() {
    // Starts as a copy of whatever these people get today, so only the differences need setting.
    const broader = matchRule(rules, draft);
    const id = `rule-${draft.audience}-${draft.unitId ?? "all"}-${draft.departmentId ?? "all"}`;
    onChange([...rules, { id, ...draft, access: { ...(broader?.access ?? {}) }, tools: broader?.tools }]);
  }

  const departments = MCP_DEPARTMENTS.filter((d) => d.unitId === draft.unitId);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Who
              </th>
              {datasets.map((dataset) => (
                <th key={dataset.id} scope="col" className="px-1.5 py-2 font-medium">
                  {dataset.name}
                </th>
              ))}
              <th scope="col" className="px-1.5 py-2 font-medium">
                Tools
              </th>
              <th scope="col" className="w-0 px-2 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortRules(rules).map((rule) => {
              const label = ruleLabel(rule);
              const depth = rule.departmentId ? 2 : rule.unitId ? 1 : 0;
              return (
                <tr key={rule.id}>
                  <th scope="row" className={`min-w-32 py-2 pr-2 text-left text-xs font-medium ${INDENT[depth]}`}>
                    {/* Narrower rules lead with what they narrow to; the audience stays as a quiet prefix. */}
                    {depth > 0 && (
                      <span className="font-normal text-zinc-500 dark:text-zinc-500">
                        {MCP_AUDIENCES.find((a) => a.id === rule.audience)?.label} ·{" "}
                      </span>
                    )}
                    <span className="text-black dark:text-zinc-50">
                      {depth > 0 ? label.split(" · ").slice(1).join(" · ") : label}
                    </span>
                  </th>
                  {datasets.map((dataset) => {
                    const level = rule.access[dataset.id] ?? "none";
                    return (
                      <td key={dataset.id} className="px-1.5 py-1.5">
                        <select
                          aria-label={`${label}: ${dataset.name}`}
                          value={level}
                          onChange={(e) => setAccess(rule.id, dataset.id, e.target.value as McpAccess)}
                          className={`${CELL_SELECT_CLASS} ${level === "none" ? "text-zinc-400 dark:text-zinc-600" : "text-black dark:text-zinc-50"}`}
                        >
                          {MCP_ACCESS_LEVELS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  <td className="px-1.5 py-1.5">
                    <select
                      aria-label={`${label}: Tools`}
                      value={rule.tools ?? "per-tool"}
                      onChange={(e) => setTools(rule.id, e.target.value as McpToolAccess)}
                      className={`${CELL_SELECT_CLASS} ${rule.tools === "none" ? "text-zinc-400 dark:text-zinc-600" : "text-black dark:text-zinc-50"}`}
                    >
                      {MCP_TOOL_ACCESS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Remove rule ${label}`}
                      onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
                      className="rounded-md px-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {rules.length === 0 && (
              <tr>
                <td colSpan={datasets.length + 3} className="px-3 py-4 text-center text-xs text-zinc-500">
                  No rules, so nobody can connect. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {datasets.length === 0 && (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-500">Expose a dataset above to set access on it.</p>
      )}

      <div role="group" aria-label="Add a rule" className="flex flex-wrap items-end gap-2">
        <select
          aria-label="Audience"
          value={draft.audience}
          onChange={(e) => setDraft({ ...draft, audience: e.target.value as McpAudience })}
          className={SELECT_CLASS}
        >
          {MCP_AUDIENCES.map((audience) => (
            <option key={audience.id} value={audience.id}>
              {audience.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Business unit"
          value={draft.unitId ?? ""}
          onChange={(e) => setDraft({ ...draft, unitId: e.target.value || null, departmentId: null })}
          className={SELECT_CLASS}
        >
          <option value="">Every business unit</option>
          {MOCK_BUSINESS_UNITS.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Department"
          value={draft.departmentId ?? ""}
          disabled={!draft.unitId}
          onChange={(e) => setDraft({ ...draft, departmentId: e.target.value || null })}
          className={`${SELECT_CLASS} disabled:opacity-50`}
        >
          <option value="">Every department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addRule}
          disabled={exists}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Add rule
        </button>
        {exists && <span className="self-center text-xs text-zinc-500">That rule already exists.</span>}
      </div>
    </div>
  );
}
