import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for Tauri builds
  output: process.env.TAURI_BUILD === "true" ? "export" : undefined,
  images: {
    unoptimized: process.env.TAURI_BUILD === "true",
  },
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "@radix-ui/react-avatar",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-progress",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "lucide-react",
      "date-fns",
      "framer-motion", // Tree-shake unused motion components
    ],
    // Use webpack build worker for parallel compilation
    webpackBuildWorker: true,
  },
  // Ensure SWC minification is enabled (faster than Terser)
  swcMinify: true,
};

export default nextConfig;
