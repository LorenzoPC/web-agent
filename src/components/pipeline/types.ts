import type { ActualUsage } from "@/lib/types";

export type RunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; output: string; usage: ActualUsage }
  | { status: "error"; message: string };
