"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/onboarding/copy-button";
import { Field, INPUT_CLASS, MONO_INPUT_CLASS, Section, Segmented } from "@/components/tools/form-controls";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  checkSteps,
  connectionStatus,
  currentMethod,
  fill,
  installLink,
  issuedCredential,
  missingStep,
  sharedCredentialActive,
  type CheckStep,
} from "@/lib/mcp-connection";
import {
  ORG_WIDE_TOOLS,
  SERVER_NAME,
  SHARED_CREDENTIALS,
  TEST_PEOPLE,
  type AuthMethod,
  type CopyValue,
  type Harness,
  type HarnessActivity,
  type HarnessSetting,
  type Organization,
  type SettingPick,
  type SharedCredential,
} from "@/lib/mock-mcp-connection-data";

const ACCESS_OPTIONS = [
  { id: "everyone", label: "Everyone" },
  { id: "groups", label: "Some groups" },
] as const;

const SMALL_BUTTON_CLASS =
  "shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

const PRIMARY_BUTTON_CLASS =
  "w-fit rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200";

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
    >
      <span className="max-sm:sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
          checked ? "bg-black dark:bg-white" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white transition-transform dark:bg-black ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function ValueRow({ value }: { value: CopyValue }) {
  const [shown, setShown] = useState(!value.secret);
  return (
    <div className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="text-xs text-zinc-500 sm:w-36 sm:shrink-0">{value.label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2">
        <code className="min-w-0 flex-1 font-mono text-xs break-all text-zinc-800 dark:text-zinc-200">
          {shown ? value.value : "•".repeat(20)}
        </code>
        {value.secret && (
          <button type="button" onClick={() => setShown(!shown)} className={SMALL_BUTTON_CLASS}>
            {shown ? "Hide" : "Show"}
          </button>
        )}
        <CopyButton text={value.value} />
      </dd>
    </div>
  );
}

function ValueList({ values }: { values: CopyValue[] }) {
  return (
    <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 px-3 dark:divide-zinc-900 dark:border-zinc-800">
      {values.map((value) => (
        <ValueRow key={value.label} value={value} />
      ))}
    </dl>
  );
}

function CodeBlock({ filename, code }: { filename: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="min-w-0 truncate font-mono text-xs text-zinc-500">{filename}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto bg-white p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-700 [overflow-wrap:anywhere] marker:text-zinc-400 dark:text-zinc-300">
      {steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-black dark:text-zinc-50">{children}</h3>;
}

/** The client's own fields and the one value to pick in each, so the admin matches values instead of reading don'ts. */
function PickTable({ picks }: { picks: SettingPick[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <SubHeading>Set these exactly</SubHeading>
        <p className="mt-0.5 text-xs text-zinc-500">They keep every call tied to the person who made it.</p>
      </div>
      <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 px-3 dark:divide-zinc-900 dark:border-zinc-800">
        {picks.map((pick) => (
          <div key={pick.field} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-3">
            <dt className="text-xs text-zinc-500 sm:w-56 sm:shrink-0 sm:pt-0.5">{pick.field}</dt>
            <dd className="min-w-0 text-sm [overflow-wrap:anywhere]">
              <span className="font-medium text-black dark:text-zinc-50">{pick.value}</span>
              {pick.not && <span className="block text-xs text-zinc-500">Not: {pick.not}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function MethodOption({
  harnessId,
  method,
  checked,
  vars,
  onPick,
}: {
  harnessId: string;
  method: AuthMethod;
  checked: boolean;
  vars: Record<string, string>;
  onPick: () => void;
}) {
  const disabled = Boolean(method.unavailable);
  return (
    <label
      className={`flex gap-3 rounded-lg border p-3 transition-colors ${
        checked ? "border-zinc-900 dark:border-zinc-100" : "border-zinc-200 dark:border-zinc-800"
      } ${disabled ? "opacity-60" : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600"}`}
    >
      <input
        type="radio"
        name={`method-${harnessId}`}
        value={method.id}
        checked={checked}
        disabled={disabled}
        onChange={onPick}
        className="mt-1"
      />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-black dark:text-zinc-50">
          {method.label}
          {method.recommended && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              Recommended
            </span>
          )}
        </span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{fill(method.summary, vars)}</span>
        <span
          className={`text-xs font-medium ${
            method.identity === "person" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
          }`}
        >
          {method.identity === "person"
            ? "Each person gets their own token"
            : "One shared credential: doesn't work with user-based RBAC"}
        </span>
        {method.needs && <span className="text-xs text-zinc-500">Needs {method.needs}.</span>}
        {method.unavailable && <span className="text-xs text-zinc-500">{fill(method.unavailable, vars)}</span>}
        {method.caveat && (
          <span className="mt-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {fill(method.caveat, vars)}
          </span>
        )}
      </span>
    </label>
  );
}

function CredentialBlock({
  method,
  issued,
  credential,
  onIssue,
  onRevoke,
}: {
  method: AuthMethod;
  issued: boolean;
  credential: { id: string; secret: string };
  onIssue: () => void;
  onRevoke: () => void;
}) {
  const spec = method.issuesCredential;
  if (!spec) return null;
  if (!issued) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{spec.note}</p>
        <button type="button" onClick={onIssue} className={PRIMARY_BUTTON_CLASS}>
          {spec.action}
        </button>
      </div>
    );
  }
  const values: CopyValue[] = {
    client: [
      { label: "Client ID", value: credential.id },
      { label: "Client secret", value: credential.secret, secret: true },
    ],
    "public-client": [{ label: "Client ID", value: credential.id }],
    token: [{ label: "Token", value: `${credential.id}.${credential.secret}`, secret: true }],
  }[spec.kind];
  return (
    <div className="flex flex-col gap-2">
      <ValueList values={values} />
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
        <span>
          Issued just now for this organization only.
          {spec.kind !== "public-client" && " A real secret would be shown once."}
        </span>
        <button type="button" onClick={onRevoke} className={SMALL_BUTTON_CLASS}>
          Revoke
        </button>
      </div>
    </div>
  );
}

function CheckMark({ state }: { state: "ok" | "fail" | "pending" }) {
  const style = {
    ok: "bg-emerald-600 text-white",
    fail: "bg-red-600 text-white",
    pending: "border border-zinc-300 text-zinc-400 dark:border-zinc-700",
  }[state];
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] leading-none ${style}`}
    >
      {state === "ok" ? "✓" : state === "fail" ? "✕" : ""}
    </span>
  );
}

/**
 * The organization-wide credential from before per-person sign-in, and the way
 * off it. Revoking waits until per-person sign-in works, so no one is locked out.
 */
function SharedCredentialCard({
  shared,
  revoked,
  ready,
  personal,
  orgName,
  vars,
  onRevoke,
  onUndo,
}: {
  shared: SharedCredential;
  revoked: boolean;
  /** Per-person sign-in is set up and nothing is missing. */
  ready: boolean;
  /** People who already sign in as themselves. */
  personal: number;
  orgName: string;
  vars: Record<string, string>;
  onRevoke: () => void;
  onUndo: () => void;
}) {
  const cleanup = fill(shared.cleanup, vars);
  if (revoked) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-black dark:text-zinc-50">Shared credential revoked.</span> Calls that use it
          are refused now, and people are asked to sign in as themselves. {cleanup}
        </p>
        <button type="button" onClick={onUndo} className={SMALL_BUTTON_CLASS}>
          Undo
        </button>
      </div>
    );
  }
  const moved = Math.min(personal, shared.people);
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
      <div>
        <h2 className="font-medium text-black dark:text-zinc-50">Move off the shared credential</h2>
        {/* One template string: JSX text mixing expressions with &apos; lost a space here. */}
        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
          {`Today everyone at ${orgName} uses ${fill(shared.how, vars)}, set up in ${shared.since}. Every call through it looks like ${orgName} as a whole, so all ${shared.people} people get the organization's full access (${ORG_WIDE_TOOLS} tools) instead of their own.`}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {moved} of {shared.people} people sign in as themselves
        </span>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
          <div
            className="h-full rounded-full bg-amber-600 dark:bg-amber-400"
            style={{ width: `${(moved / shared.people) * 100}%` }}
          />
        </div>
      </div>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-700 marker:text-zinc-500 dark:text-zinc-300">
        <li>Set up per-person sign-in below and run the check.</li>
        <li>Ask people to connect again. Get started has their steps.</li>
        <li>Revoke the shared credential. {cleanup}</li>
      </ol>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        Until you revoke it, both work: people who&apos;ve signed in get their own access, and everyone else keeps the
        shared one.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!ready} onClick={onRevoke} className={PRIMARY_BUTTON_CLASS}>
          Revoke the shared credential
        </button>
        {!ready && (
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Set up per-person sign-in first, so no one is locked out.
          </span>
        )}
      </div>
    </section>
  );
}

/** Mockup: the steps and their results come from the page's own settings, revealed one by one. */
function ConnectionCheck({ steps, readyText }: { steps: CheckStep[]; readyText: string }) {
  const [revealed, setRevealed] = useState<number | null>(null);
  const firstFail = steps.findIndex((step) => !step.ok);
  // Stop at the first failing step, as a real sign-in would.
  const total = firstFail === -1 ? steps.length : firstFail + 1;
  const running = revealed !== null && revealed < total;

  useEffect(() => {
    if (revealed === null || revealed >= total) return;
    const timer = setTimeout(() => setRevealed(revealed + 1), 450);
    return () => clearTimeout(timer);
  }, [revealed, total]);

  return (
    <div className="flex flex-col gap-3">
      {revealed !== null && (
        <ol className="flex flex-col gap-2" aria-live="polite">
          {steps.slice(0, Math.min(revealed + 1, total)).map((step, i) => {
            const done = i < revealed;
            return (
              <li key={step.label} className="flex items-start gap-2 text-sm">
                <CheckMark state={done ? (step.ok ? "ok" : "fail") : "pending"} />
                <span className="min-w-0">
                  <span className={done ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-500"}>{step.label}</span>
                  {done && !step.ok && step.fix && (
                    <span className="block text-xs text-red-700 dark:text-red-400">{step.fix}</span>
                  )}
                  {done && step.ok && step.note && <span className="block text-xs text-zinc-500">{step.note}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {revealed !== null && !running && (
        <p className="text-sm font-medium text-black dark:text-zinc-50">
          {firstFail === -1 ? readyText : "Fix that, then run the check again."}
        </p>
      )}
      <button type="button" disabled={running} onClick={() => setRevealed(0)} className={PRIMARY_BUTTON_CLASS}>
        {running ? "Checking…" : revealed === null ? "Run a check" : "Run it again"}
      </button>
    </div>
  );
}

export function ClientPanel({
  harness,
  setting,
  onChange,
  org,
  mcpUrl,
  activity,
  groups,
}: {
  harness: Harness;
  setting: HarnessSetting;
  onChange: (patch: Partial<HarnessSetting>) => void;
  org: Organization;
  mcpUrl: string;
  activity: HarnessActivity | undefined;
  groups: string[];
}) {
  const [personName, setPersonName] = useState(TEST_PEOPLE[0].name);
  const person = TEST_PEOPLE.find((p) => p.name === personName) ?? TEST_PEOPLE[0];
  const method = currentMethod(harness, setting);
  const status = connectionStatus(harness, setting);
  const shared = SHARED_CREDENTIALS[harness.id];
  const sharedActive = sharedCredentialActive(harness, setting);
  const missing = missingStep(method, setting);
  const credential = issuedCredential(org, harness.id);
  const vars: Record<string, string> = {
    url: mcpUrl,
    host: new URL(mcpUrl).host,
    org: org.name,
    idp: org.identityProvider.name,
    tenant: org.identityProvider.tenant,
    issuer: org.identityProvider.issuer,
    clientId: setting.credentialIssued ? credential.id : "<client ID>",
  };
  const adminSteps = (method.adminSteps ?? harness.adminSteps).map((step) => fill(step, vars));
  const memberSteps = (method.memberSteps ?? harness.memberSteps).map((step) => fill(step, vars));
  const config = method.config ? { ...method.config, code: fill(method.config.code, vars) } : undefined;
  // An install link with the client ID still missing would install a server no one can sign in to.
  const link =
    config && method.installLink && (!method.issuesCredential || setting.credentialIssued)
      ? installLink(method.installLink, config.code, SERVER_NAME)
      : null;
  const values: CopyValue[] = [
    ...(link ? [{ label: "Install link", value: link }] : []),
    ...(method.values ?? []).map((v) => ({ ...v, value: fill(v.value, vars) })),
  ];
  const prerequisites = harness.prerequisites?.map((p) => fill(p, vars));
  const picks = method.picks.map((pick) => ({ ...pick, value: fill(pick.value, vars) }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">{harness.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[status]}`}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{harness.surfaces}</p>
            <p className="mt-0.5 text-xs text-zinc-500">For the whole organization, needs {harness.plans}.</p>
          </div>
          <Switch
            checked={setting.enabled}
            label={`Allow ${harness.name}`}
            onChange={(enabled) => onChange({ enabled })}
          />
        </div>
        <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-600 dark:border-zinc-900 dark:text-zinc-400">
          {!setting.enabled
            ? `People at ${org.name} can't sign in from ${harness.name}. Turning it off ends their sessions on their next call.`
            : missing
              ? `Almost there: ${missing.charAt(0).toLowerCase()}${missing.slice(1)}`
              : activity
                ? `${activity.people} people sign in as themselves. Last call ${activity.lastCall}.`
                : sharedActive
                  ? "Ready. No one signs in as themselves yet."
                  : "Ready. No one has connected yet."}
        </p>
      </div>

      {shared && (
        <SharedCredentialCard
          shared={shared}
          revoked={setting.sharedRevoked}
          ready={status === "on"}
          personal={activity?.people ?? 0}
          orgName={org.name}
          vars={vars}
          onRevoke={() => onChange({ sharedRevoked: true })}
          onUndo={() => onChange({ sharedRevoked: false })}
        />
      )}

      <Section
        step={1}
        title="How people sign in"
        hint="The server applies user-based RBAC, so every call has to carry the person's own token. A client ID only says which app is calling; who is calling comes from each person's own sign-in. Options that can't do that are listed but can't be picked."
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">How people sign in from {harness.name}</legend>
          {harness.methods.map((m) => (
            <MethodOption
              key={m.id}
              harnessId={harness.id}
              method={m}
              checked={m.id === method.id}
              vars={vars}
              onPick={() => onChange({ methodId: m.id })}
            />
          ))}
        </fieldset>
      </Section>

      <Section step={2} title={`Set up in ${harness.name}`} hint={`In ${harness.adminConsole}.`}>
        {prerequisites && prerequisites.length > 0 && (
          <div className="flex flex-col gap-2">
            <SubHeading>Before you start</SubHeading>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-zinc-700 marker:text-zinc-400 dark:text-zinc-300">
              {prerequisites.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {method.issuesCredential && (
          <CredentialBlock
            method={method}
            issued={setting.credentialIssued}
            credential={credential}
            onIssue={() => onChange({ credentialIssued: true })}
            onRevoke={() => onChange({ credentialIssued: false })}
          />
        )}

        <div className="flex flex-col gap-2">
          <SubHeading>Steps</SubHeading>
          <StepList steps={adminSteps} />
        </div>

        {picks.length > 0 && <PickTable picks={picks} />}

        {values.length > 0 && <ValueList values={values} />}

        {method.redirectFromClient && (
          <Field label={method.redirectFromClient.label} hint={method.redirectFromClient.hint}>
            <input
              type="url"
              value={setting.redirectUrl}
              onChange={(e) => onChange({ redirectUrl: e.target.value })}
              placeholder={method.redirectFromClient.placeholder}
              className={MONO_INPUT_CLASS}
            />
          </Field>
        )}

        {config && <CodeBlock filename={config.filename} code={config.code} />}

        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <SubHeading>Then each person</SubHeading>
          <StepList steps={memberSteps} />
        </div>
      </Section>

      <Section
        step={3}
        title="Who can connect"
        hint={`Groups come from ${org.identityProvider.name}. What each person can reach is then decided by their own permissions, on every call.`}
      >
        <Segmented
          label={`Who can connect from ${harness.name}`}
          options={ACCESS_OPTIONS}
          value={setting.access}
          onChange={(access) => onChange({ access })}
        />
        {setting.access === "groups" && (
          <div role="group" aria-label="Groups" className="flex flex-wrap gap-1.5">
            {groups.map((group) => {
              const on = setting.groups.includes(group);
              return (
                <button
                  key={group}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onChange({ groups: on ? setting.groups.filter((g) => g !== group) : [...setting.groups, group] })
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500"
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        step={4}
        title="Check the connection"
        hint="Signs in as a test person and lists the tools they'd see, without calling any."
      >
        <Field label="Test as">
          <select
            value={person.name}
            onChange={(e) => setPersonName(e.target.value)}
            className={`${INPUT_CLASS} sm:w-72`}
          >
            {TEST_PEOPLE.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} · {p.group}
              </option>
            ))}
          </select>
        </Field>
        <ConnectionCheck
          key={`${JSON.stringify(setting)}:${person.name}`}
          steps={checkSteps(harness, setting, org, mcpUrl, person, ORG_WIDE_TOOLS)}
          readyText={`Ready: people at ${org.name} can connect from ${harness.name}.`}
        />
      </Section>
    </div>
  );
}
