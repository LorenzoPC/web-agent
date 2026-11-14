import { PatternGallery } from "@/components/patterns/pattern-gallery";
import { MOCK_FLOW_PATTERNS } from "@/lib/mock-data";

export default function PatternsPage() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-6 py-16 px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Flow Patterns
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Reusable templates for chaining multiple agent tasks together. Click a pattern to see
            its steps.
          </p>
        </div>
        <PatternGallery patterns={MOCK_FLOW_PATTERNS} />
      </main>
    </div>
  );
}
