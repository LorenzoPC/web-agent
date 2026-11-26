import { unbuilt } from "@/lib/unbuilt";

/**
 * The Marketplace's call to action on an opened card: pick the pool or agent for
 * the organization's Agents Departments. Nothing saves the pick yet, so the
 * checkbox carries the orange "not built yet" marker.
 */
export const AGENTS_DEPARTMENTS_PICK = {
  label: "Add to my Agents Departments",
  picked: "In your Agents Departments",
  props: unbuilt("action", "Agents Departments API"),
};
