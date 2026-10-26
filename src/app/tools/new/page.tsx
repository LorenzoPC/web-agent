import { ToolRecipeEditor } from "@/components/tools/tool-recipe-editor";
import { BLANK_TOOL_RECIPE, MOCK_DISCOVERY_SCRIPT, MOCK_TOOL_TEMPLATES } from "@/lib/mock-data";

export default function NewToolPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Create a tool
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Give an agent a new capability. A tool recipe is what the model reads to decide when to call it — a name,
            description, and typed inputs — plus how the call runs, and the guardrails and cost around it.
          </p>
        </div>
        <ToolRecipeEditor
          templates={MOCK_TOOL_TEMPLATES}
          blankRecipe={BLANK_TOOL_RECIPE}
          discoveryScript={MOCK_DISCOVERY_SCRIPT}
        />
      </main>
    </div>
  );
}
