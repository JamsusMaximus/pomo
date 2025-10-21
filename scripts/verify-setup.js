#!/usr/bin/env node

/**
 * Verifies that the development environment is properly set up
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const checks = [];
let allPassed = true;

function check(name, fn) {
  try {
    const result = fn();
    checks.push({ name, passed: result !== false, message: result === true ? "" : result });
  } catch (error) {
    checks.push({ name, passed: false, message: error.message });
    allPassed = false;
  }
}

console.log("🔍 Verifying development environment setup...\n");

// Check Node.js version
check("Node.js version", () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0]);
  if (major >= 20) {
    return `v${major} ✓`;
  }
  allPassed = false;
  return `v${major} (need v20+)`;
});

// Check if .env.local exists
check(".env.local file", () => {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    return true;
  }
  allPassed = false;
  return "Missing - copy .env.example";
});

// Check if node_modules exists
check("Dependencies installed", () => {
  const nodeModules = path.join(__dirname, "..", "node_modules");
  if (fs.existsSync(nodeModules)) {
    return true;
  }
  allPassed = false;
  return "Run npm install";
});

// Check if git hooks are installed
check("Git hooks", () => {
  const preCommitHook = path.join(__dirname, "..", ".git", "hooks", "pre-commit");
  if (fs.existsSync(preCommitHook)) {
    return true;
  }
  return "Not installed - run: bash scripts/install-hooks.sh";
});

// Check Convex CLI
check("Convex CLI", () => {
  try {
    execSync("npx convex --version", { stdio: "pipe" });
    return true;
  } catch {
    allPassed = false;
    return "Failed to run convex";
  }
});

// Check if ports are available
check("Port 3000 (Next.js)", () => {
  try {
    execSync("lsof -i :3000", { stdio: "pipe" });
    return "In use - stop existing process";
  } catch {
    return "Available ✓";
  }
});

// Display results
checks.forEach(({ name, passed, message }) => {
  const icon = passed ? "✅" : "❌";
  const msg = message ? ` - ${message}` : "";
  console.log(`${icon} ${name}${msg}`);
});

console.log("");

if (allPassed) {
  console.log("🎉 All checks passed! Ready to run: npm run dev\n");
  process.exit(0);
} else {
  console.log("⚠️  Some checks failed. Fix the issues above before running dev server.\n");
  console.log("📚 See SETUP.md for detailed setup instructions.\n");
  process.exit(1);
}
