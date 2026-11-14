/**
 * The two sitemap areas (docs/prds/sitemap.html) whose screens get their own
 * colour wherever they're linked from: Admin red, Developer purple. Every other
 * screen stays neutral. See docs/design/web-agent.md, "Colour palette".
 */
export type Audience = "admin" | "developer";

/**
 * A route's sitemap area, read from its first segment: /admin/… is Admin and
 * /developers/… is Developer. No screen lives under /developers yet: the
 * Playground and the docs are still sections of the Builder and Get started,
 * which mark those sections themselves.
 */
export function routeAudience(href: string): Audience | undefined {
  const segment = href.split(/[?#]/)[0].split("/")[1];
  if (segment === "admin") return "admin";
  if (segment === "developers") return "developer";
  return undefined;
}

/** Text cue shown with the colour, so colour isn't the only signal. */
export const AUDIENCE_LABEL: Record<Audience, string> = {
  admin: "Admin",
  developer: "Developer",
};
