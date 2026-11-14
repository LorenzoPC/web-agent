import { PipelineApp } from "@/components/pipeline/pipeline-app";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col py-8 px-4 sm:px-6">
        <PipelineApp />
      </main>
    </div>
  );
}
