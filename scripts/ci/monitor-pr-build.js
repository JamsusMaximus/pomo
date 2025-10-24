#!/usr/bin/env node

/**
 * Monitor PR build status and fetch logs if build fails
 *
 * Usage: node scripts/monitor-pr-build.js [--timeout=600]
 *
 * This script:
 * 1. Polls PR checks status (Vercel, GitHub Actions)
 * 2. Waits for builds to complete
 * 3. If any fail, fetches and displays error logs
 * 4. Returns exit code 0 if all pass, 1 if any fail
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require("child_process");

const POLL_INTERVAL = 10000; // 10 seconds
const DEFAULT_TIMEOUT = 600000; // 10 minutes

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: options.silent ? "pipe" : "inherit",
      ...options,
    });
  } catch (error) {
    if (options.ignoreError) {
      return error.stdout || "";
    }
    throw error;
  }
}

function getPRChecks() {
  const output = exec("gh pr checks --json name,state,link,bucket", {
    silent: true,
  });
  return JSON.parse(output);
}

function getFailedCheckLogs(link) {
  console.log(`\n📋 Fetching logs from: ${link}\n`);

  // Check if it's a GitHub Actions URL
  if (link.includes("/actions/runs/")) {
    const match = link.match(/\/runs\/(\d+)\/job\/(\d+)/);
    if (match) {
      const [, runId, jobId] = match;
      try {
        const logs = exec(`gh run view ${runId} --job ${jobId} --log`, {
          silent: true,
          ignoreError: true,
        });
        return logs;
      } catch {
        return "Unable to fetch GitHub Actions logs";
      }
    }
  }

  // Vercel logs would need Vercel CLI or API
  if (link.includes("vercel.com")) {
    return "Vercel deployment details available at: " + link;
  }

  return "Logs not available via CLI";
}

function printCheckStatus(checks) {
  console.log("\n📊 PR Check Status:\n");

  checks.forEach((check) => {
    const icon =
      check.state === "SUCCESS"
        ? "✅"
        : check.state === "FAILURE" || check.state === "ERROR"
          ? "❌"
          : check.state === "PENDING"
            ? "🔄"
            : "⏸️";

    console.log(`${icon} ${check.name.padEnd(30)} ${check.state.toLowerCase()}`);
  });
  console.log("");
}

async function monitorBuilds(timeoutMs) {
  const startTime = Date.now();

  console.log("🔍 Monitoring PR build status...");
  console.log(`   Timeout: ${timeoutMs / 1000}s`);
  console.log(`   Poll interval: ${POLL_INTERVAL / 1000}s\n`);

  while (Date.now() - startTime < timeoutMs) {
    const checks = getPRChecks();

    // Check if all are completed (not PENDING)
    const allCompleted = checks.every(
      (check) => check.state !== "PENDING" && check.state !== "EXPECTED"
    );

    if (allCompleted) {
      printCheckStatus(checks);

      // Check for failures
      const failed = checks.filter((check) => check.state === "FAILURE" || check.state === "ERROR");

      if (failed.length > 0) {
        console.log(`\n❌ ${failed.length} check(s) failed:\n`);

        for (const check of failed) {
          console.log(`\n${"=".repeat(60)}`);
          console.log(`❌ ${check.name}`);
          console.log(`${"=".repeat(60)}`);

          const logs = getFailedCheckLogs(check.link);
          console.log(logs);
        }

        console.log(`\n${"=".repeat(60)}\n`);
        console.log("💡 Fix the errors above and push again");
        process.exit(1);
      }

      console.log("✅ All checks passed!");
      process.exit(0);
    }

    // Still running, show status and wait
    printCheckStatus(checks);
    console.log(
      `⏳ Waiting for checks to complete... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
    );

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  console.log("\n⏱️  Timeout reached. Checks still running:");
  printCheckStatus(getPRChecks());
  process.exit(1);
}

// Parse command line args
const args = process.argv.slice(2);
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const timeout = timeoutArg ? parseInt(timeoutArg.split("=")[1]) * 1000 : DEFAULT_TIMEOUT;

monitorBuilds(timeout).catch((error) => {
  console.error("\n❌ Error monitoring builds:", error.message);
  process.exit(1);
});
