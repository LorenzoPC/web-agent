import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The bottom-left corner belongs to <QuickActions />. Compile and runtime
  // errors still surface with the indicator off.
  devIndicators: false,
};

export default nextConfig;
