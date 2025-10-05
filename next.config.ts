import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for Tauri builds
  output: process.env.TAURI_BUILD === "true" ? "export" : undefined,
  images: {
    unoptimized: process.env.TAURI_BUILD === "true",
  },
};

export default nextConfig;
