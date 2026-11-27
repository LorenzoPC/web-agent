"use client";

import { Segmented } from "@/components/tools/form-controls";
import { regionLabel } from "@/lib/agent-security";
import {
  HIDDEN_FIELD_TYPES,
  PROVIDERS,
  REGIONS,
  type Agent,
  type ProviderId,
  type RegionId,
  type SecuritySettings,
} from "@/lib/mock-agent-security-data";
import { SubHeading, Switch } from "./controls";

/** Fields masked before any model sees them, where data is processed, and which model providers may process it. */
export function DataAndModels({
  settings,
  agents,
  onChange,
}: {
  settings: SecuritySettings;
  agents: Agent[];
  onChange: (patch: Partial<SecuritySettings>) => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div>
          <SubHeading>Hide from agents</SubHeading>
          <p className="mt-0.5 text-xs text-zinc-500">
            Masked before any model sees the text, and in the decision log. Agents still know a value was there.
          </p>
        </div>
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 px-3 dark:divide-zinc-900 dark:border-zinc-800">
          {HIDDEN_FIELD_TYPES.map((field) => (
            <li key={field.id}>
              <label className="flex items-start gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={settings.hiddenFields[field.id]}
                  onChange={(e) => onChange({ hiddenFields: { ...settings.hiddenFields, [field.id]: e.target.checked } })}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-black dark:text-zinc-50">{field.label}</span>
                  <span className="block text-xs text-zinc-500">{field.example}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Segmented<RegionId>
            label="Process data in"
            options={REGIONS}
            value={settings.region}
            onChange={(region) => onChange({ region })}
          />
          <p className="text-xs text-zinc-500">Models outside this region can&apos;t receive your data, and agents that use them stop.</p>
        </div>

        <div className="flex flex-col gap-2">
          <SubHeading>Model providers</SubHeading>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 px-3 dark:divide-zinc-900 dark:border-zinc-800">
            {PROVIDERS.map((provider) => {
              const outOfRegion = settings.region !== "any" && !provider.regions.includes(settings.region);
              const on = settings.providers[provider.id] && !outOfRegion;
              const users = agents.filter((a) => a.model.provider === provider.id).map((a) => a.name);
              return (
                <li key={provider.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-black dark:text-zinc-50">
                      {provider.name} <span className="text-zinc-500">· {provider.models}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {outOfRegion
                        ? `Not available in ${regionLabel(settings)}`
                        : `Processes data in ${provider.regions.map((r) => REGIONS.find((x) => x.id === r)!.label).join(", ")}`}
                      {users.length > 0 && ` · Used by ${users.join(", ")}`}
                    </p>
                    {!on && users.length > 0 && (
                      <p className="mt-0.5 text-xs font-medium text-red-700 dark:text-red-400">Stops {users.join(", ")}</p>
                    )}
                  </div>
                  <Switch
                    label={`Allow ${provider.name}`}
                    hideLabel
                    checked={on}
                    disabled={outOfRegion}
                    onChange={(allow) => onChange({ providers: { ...settings.providers, [provider.id as ProviderId]: allow } })}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
