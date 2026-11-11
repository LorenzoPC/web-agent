/**
 * The two sitemap areas (docs/prds/sitemap.html) whose screens get their own
 * colour wherever they're linked from: Admin red, Developer orange. Every other
 * screen stays neutral. See docs/design/web-agent.md, "Colour palette".
 */
export type Audience = "admin" | "developer";

/**
 * Today's routes the sitemap puts in the Admin area. No screen is wholly
 * Developer yet: the Playground and the docs are still sections of the Builder
 * and Get started, which mark those sections themselves.
 */
const ROUTE_AUDIENCE: Record<string, Audience> = {
  "/product": "admin",
  "/builder": "admin",
  "/patterns": "admin",
  "/prompts": "admin",
  "/tools/new": "admin",
  "/mcp-servers/new": "admin",
};

export function routeAudience(href: string): Audience | undefined {
  return ROUTE_AUDIENCE[href.split("?")[0]];
}

/** Text cue shown with the colour, so colour isn't the only signal. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  admin: "Admin",
  developer: "Developer",
};
