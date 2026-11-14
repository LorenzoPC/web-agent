import type { NextConfig } from "next";

// Screens moved to their sitemap routes (docs/prds/sitemap.html) on 2026-11-11.
// The old URLs redirect, query string included, so links and bookmarks keep
// working. Temporary (307) while everything is mock data and routes can still move.
const MOVED_ROUTES: Record<string, string> = {
  "/dashboard": "/app",
  "/marketplace": "/app/marketplace",
  "/onboarding": "/app/onboarding",
  "/product": "/admin",
  "/builder": "/admin/agents/new",
  "/patterns": "/admin/patterns",
  "/prompts": "/admin/prompts",
  "/tools/new": "/admin/tools/new",
  "/mcp-servers/new": "/admin/mcp-servers/new",
};

const nextConfig: NextConfig = {
  // The bottom-left corner belongs to <QuickActions />. Compile and runtime
  // errors still surface with the indicator off.
  devIndicators: false,

  async redirects() {
    return Object.entries(MOVED_ROUTES).map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

export default nextConfig;
