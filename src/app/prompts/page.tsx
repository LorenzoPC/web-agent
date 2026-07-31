import { PromptsLibrary } from "@/components/prompts/prompts-library";
import {
  MOCK_AGENT_ROLES,
  MOCK_AGENTS,
  MOCK_BUSINESS_UNITS,
  MOCK_PROMPTS,
  MOCK_TASK_PROCESSES,
} from "@/lib/mock-data";

export default function PromptsPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Prompts
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Reusable prompts scoped by business unit, role, and task/process. Create, edit, and
            test them before binding into a flow.
          </p>
        </div>
        <PromptsLibrary
          prompts={MOCK_PROMPTS}
          businessUnits={MOCK_BUSINESS_UNITS}
          taskProcesses={MOCK_TASK_PROCESSES}
          roles={MOCK_AGENT_ROLES}
          agents={MOCK_AGENTS}
        />
      </main>
    </div>
  );
}
