/**
 * What an orange "not built yet" marker sits on. An action is a control whose
 * effect needs a backend that doesn't exist (Approve, Save, Install…); it gets a
 * solid orange fill. A panel is a section or card whose data is mocked rather
 * than fetched; it gets an orange tint.
 */
export type UnbuiltKind = "action" | "panel";

/**
 * Props that mark an element as needing a backend that isn't built yet. The
 * rules in src/app/globals.css paint it orange, over the element's own colours.
 * `needs` names what's missing, e.g. "approvals API"; on an action it's also the
 * tooltip. Spread it onto a DOM element, or a component that passes extra props
 * through. See docs/design/web-agent.md, "Colour palette".
 */
export function unbuilt(kind: UnbuiltKind, needs: string) {
  return {
    "data-unbuilt": kind,
    "data-needs": needs,
    ...(kind === "action" && { title: `Not built yet: ${needs}` }),
  };
}
