#!/usr/bin/env node

/**
 * Validates required environment variables before starting dev server
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_VARS = [
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

const OPTIONAL_VARS = ["CONVEX_DEPLOYMENT", "ANTHROPIC_API_KEY"];

function checkEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const envExamplePath = path.join(__dirname, "..", ".env.example");

  if (!fs.existsSync(envPath)) {
    console.error("\n❌ Missing .env.local file!\n");
    console.log("📝 Copy .env.example to .env.local and fill in your values:\n");
    console.log("   cp .env.example .env.local\n");
    if (fs.existsSync(envExamplePath)) {
      console.log("See .env.example for required variables.");
    }
    process.exit(1);
  }
}

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const envContent = fs.readFileSync(envPath, "utf8");
  const env = {};

  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });

  return env;
}

function validateEnvVars() {
  checkEnvFile();
  const env = loadEnvFile();

  // Also check process.env in case they're set in shell
  const allEnv = { ...env, ...process.env };

  const missing = [];
  const empty = [];

  REQUIRED_VARS.forEach((varName) => {
    const value = allEnv[varName];
    if (!value) {
      missing.push(varName);
    } else if (value.trim() === "") {
      empty.push(varName);
    }
  });

  if (missing.length > 0 || empty.length > 0) {
    console.error("\n❌ Environment validation failed!\n");

    if (missing.length > 0) {
      console.error("Missing required variables:");
      missing.forEach((v) => console.error(`  - ${v}`));
    }

    if (empty.length > 0) {
      console.error("\nEmpty required variables:");
      empty.forEach((v) => console.error(`  - ${v}`));
    }

    console.log("\n📚 Setup guide: See SETUP.md or README.md\n");
    process.exit(1);
  }

  // Check optional vars (warn only)
  const missingOptional = OPTIONAL_VARS.filter((v) => !allEnv[v]);

  console.log("✅ Environment variables validated\n");

  if (missingOptional.length > 0) {
    console.log("ℹ️  Optional variables not set:");
    missingOptional.forEach((v) => {
      if (v === "ANTHROPIC_API_KEY") {
        console.log(`  - ${v} (required for AI changelog generation)`);
      } else {
        console.log(`  - ${v}`);
      }
    });
    console.log("");
  }
}

validateEnvVars();
