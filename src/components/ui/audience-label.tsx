import type { ReactNode } from "react";
import { AUDIENCE_LABEL, type Audience } from "@/lib/audience";

const FILL: Record<Audience, string> = {
  admin: "bg-admin text-admin-foreground",
  developer: "bg-developer text-developer-foreground",
};

const GROUP_HOVER: Record<Audience, string> = {
  admin: "group-hover:bg-admin-hover",
  developer: "group-hover:bg-developer-hover",
};

/** Small filled label naming the sitemap area a section belongs to, e.g. "Developer". */
export function AudienceBadge({ audience }: { audience: Audience }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${FILL[audience]}`}>
      {AUDIENCE_LABEL[audience]}
    </span>
  );
}

/**
 * A tab's label as a filled pill, for tabs that lead to an Admin or Developer
 * screen. The tab keeps its own active underline; the pill darkens when its
 * parent link (marked `group`) is hovered.
 */
export function AudienceTabLabel({ audience, children }: { audience: Audience; children: ReactNode }) {
  return (
    <span
      title={AUDIENCE_LABEL[audience]}
      className={`rounded-md px-1.5 py-0.5 transition-colors ${FILL[audience]} ${GROUP_HOVER[audience]}`}
    >
      {children}
      <span className="sr-only"> ({AUDIENCE_LABEL[audience]})</span>
    </span>
  );
}
