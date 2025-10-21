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
  async headers() {
    return [
      {
        // Prevent service worker from being cached - EMERGENCY FIX
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
