#!/usr/bin/env node

/**
 * Conditional Convex deployment for builds
 * - Skips deployment on Vercel preview builds (they use NEXT_PUBLIC_CONVEX_URL)
 * - Runs deployment on production builds (uses CONVEX_DEPLOY_KEY)
 */

const { execSync } = require("child_process");

const isVercelPreview = process.env.VERCEL && process.env.VERCEL_ENV !== "production";
const hasDeployKey = !!process.env.CONVEX_DEPLOY_KEY;

console.log("\n🔧 Prebuild: Checking Convex deployment requirements...");
console.log(`   Environment: ${process.env.VERCEL_ENV || "local"}`);
console.log(`   Has Deploy Key: ${hasDeployKey}`);
console.log(`   Is Vercel Preview: ${isVercelPreview}`);

if (isVercelPreview) {
  console.log("✓ Skipping Convex deployment for preview build");
  console.log("  Preview builds use NEXT_PUBLIC_CONVEX_URL from environment\n");
  process.exit(0);
}

if (hasDeployKey) {
  console.log("→ Running Convex deployment...\n");
  try {
    execSync("npx convex deploy --yes", { stdio: "inherit" });
    console.log("\n✅ Convex deployment complete");
  } catch (error) {
    console.error("\n❌ Convex deployment failed");
    process.exit(1);
  }
} else {
  console.log("✓ No deploy key found, skipping deployment\n");
}
