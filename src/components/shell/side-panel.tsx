"use client";

import { createContext, type ReactNode, use, useState } from "react";

/** The right-hand panels share one slot, so opening one closes the other. */
export type SidePanel = "conversation" | "feature-request";

const SidePanelContext = createContext<{
  panel: SidePanel | null;
  setPanel: (panel: SidePanel | null) => void;
} | null>(null);

export function SidePanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<SidePanel | null>(null);
  return <SidePanelContext value={{ panel, setPanel }}>{children}</SidePanelContext>;
}

export function useSidePanel() {
  const context = use(SidePanelContext);
  if (!context) throw new Error("useSidePanel must be used inside <SidePanelProvider>");
  return context;
}
