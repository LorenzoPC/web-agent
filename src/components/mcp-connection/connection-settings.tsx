"use client";

import { useState } from "react";
import { CopyButton } from "@/components/onboarding/copy-button";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  connectionStatus,
  currentMethod,
  sharedCredentialActive,
} from "@/lib/mcp-connection";
import type {
  Harness,
  HarnessActivity,
  HarnessId,
  HarnessSetting,
  Organization,
} from "@/lib/mock-mcp-connection-data";
import { ClientPanel } from "./client-panel";

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-white p-4 dark:bg-zinc-950">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm text-black dark:text-zinc-50">{children}</dd>
    </div>
  );
}

export function McpConnectionSettings({
  org,
  mcpUrl,
  harnesses,
  initialSettings,
  activity,
  groups,
}: {
  org: Organization;
  mcpUrl: string;
  harnesses: Harness[];
  initialSettings: Record<HarnessId, HarnessSetting>;
  activity: Partial<Record<HarnessId, HarnessActivity>>;
  /** Groups from the organization's identity provider. */
  groups: string[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [selectedId, setSelectedId] = useState<HarnessId>(harnesses[0].id);
  const selected = harnesses.find((h) => h.id === selectedId) ?? harnesses[0];
  const allowed = harnesses.filter((h) => settings[h.id].enabled).length;
  const stillShared = harnesses.filter((h) => sharedCredentialActive(h, settings[h.id]));

  function update(id: HarnessId, patch: Partial<HarnessSetting>) {
    setSettings((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)] dark:border-zinc-800 dark:bg-zinc-800">
        <SummaryItem label="Server URL">
          <span className="flex items-center gap-2">
            <code className="min-w-0 truncate font-mono text-sm">{mcpUrl}</code>
            <CopyButton text={mcpUrl} />
          </span>
        </SummaryItem>
        <SummaryItem label="People sign in with">
          {org.identityProvider.name} <span className="text-zinc-500">· {org.identityProvider.tenant}</span>
        </SummaryItem>
        <SummaryItem label="Verified domains">{org.verifiedDomains.join(", ")}</SummaryItem>
        <SummaryItem label="AI clients allowed">
          {allowed} of {harnesses.length}
        </SummaryItem>
      </dl>

      {stillShared.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-zinc-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-zinc-300">
          <p>
            <span className="font-medium text-black dark:text-zinc-50">
              {stillShared.length} of {harnesses.length} clients still use one shared credential for everyone at{" "}
              {org.name}:
            </span>{" "}
            {stillShared.map((h) => h.name).join(", ")}.
          </p>
          <p className="mt-1">
            Calls through it all look like the same person, so everyone gets the organization&apos;s full access and
            per-person permissions can&apos;t apply. Set up per-person sign-in for each one, then revoke its shared
            credential.
          </p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <nav aria-label="AI clients">
          <ul className="flex flex-col gap-1.5">
            {harnesses.map((harness) => {
              const setting = settings[harness.id];
              const status = connectionStatus(harness, setting);
              const active = harness.id === selected.id;
              const used = activity[harness.id];
              return (
                <li key={harness.id}>
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => setSelectedId(harness.id)}
                    className={`flex w-full flex-col gap-1 rounded-lg border bg-white p-3 text-left transition-colors dark:bg-zinc-950 ${
                      active
                        ? "border-zinc-900 dark:border-zinc-100"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-black dark:text-zinc-50">{harness.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {currentMethod(harness, setting).label}
                      {setting.enabled && used ? ` · ${used.people} signed in` : ""}
                    </span>
                    {sharedCredentialActive(harness, setting) && (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Shared credential still on</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <ClientPanel
          key={selected.id}
          harness={selected}
          setting={settings[selected.id]}
          onChange={(patch) => update(selected.id, patch)}
          org={org}
          mcpUrl={mcpUrl}
          activity={activity[selected.id]}
          groups={groups}
        />
      </div>
    </div>
  );
}
