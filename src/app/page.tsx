import { ResultsSection } from "@/components/dashboard/results-section";
import { getCurrentUser } from "@/lib/auth";
import { MOCK_RUNS } from "@/lib/mock-data";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Welcome back, {user.name}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            An overview of your recent results.
          </p>
        </div>

        <ResultsSection runs={MOCK_RUNS} />
      </main>
    </div>
  );
}
