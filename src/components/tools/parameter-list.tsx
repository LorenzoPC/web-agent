import type { MockToolParam, ToolParamType } from "@/lib/mock-data";
import { INPUT_CLASS, MONO_INPUT_CLASS } from "./form-controls";

const PARAM_TYPES: ToolParamType[] = ["string", "number", "integer", "boolean", "enum", "array"];

export function ParameterList({
  parameters,
  onChange,
}: {
  parameters: MockToolParam[];
  onChange: (parameters: MockToolParam[]) => void;
}) {
  function updateAt(index: number, patch: Partial<MockToolParam>) {
    onChange(parameters.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {parameters.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
          No inputs — the model will call this tool with no arguments.
        </p>
      )}
      {parameters.map((param, index) => (
        // Index keys are safe here: every field is controlled, so rows hold no state of their own.
        <div key={index} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              aria-label="Input name"
              value={param.name}
              onChange={(e) => updateAt(index, { name: e.target.value })}
              placeholder="input_name"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white p-2.5 font-mono text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <select
              aria-label="Input type"
              value={param.type}
              onChange={(e) => updateAt(index, { type: e.target.value as ToolParamType })}
              className="rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              {PARAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "array" ? "array of strings" : t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={param.required}
                onChange={(e) => updateAt(index, { required: e.target.checked })}
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => onChange(parameters.filter((_, i) => i !== index))}
              aria-label={`Remove input ${param.name || index + 1}`}
              className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            aria-label="Input description"
            value={param.description}
            onChange={(e) => updateAt(index, { description: e.target.value })}
            placeholder="What this input means and its format, e.g. ISO date (YYYY-MM-DD)"
            className={INPUT_CLASS}
          />
          {param.type === "enum" && (
            <input
              type="text"
              aria-label="Allowed values"
              // Split without trimming so typing ", " round-trips; values are trimmed into the schema.
              value={(param.enumValues ?? []).join(",")}
              onChange={(e) => updateAt(index, { enumValues: e.target.value.split(",") })}
              placeholder="Allowed values, comma-separated, e.g. celsius, fahrenheit"
              className={MONO_INPUT_CLASS}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...parameters, { name: "", type: "string", description: "", required: true }])}
        className="w-fit rounded-md px-2 py-1 text-sm font-medium text-black hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        + Add input
      </button>
    </div>
  );
}
