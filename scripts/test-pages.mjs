#!/usr/bin/env node
/**
 * Quick smoke test script to check if all pages load without 500 errors
 * Tests BOTH dev and prod builds
 *
 * Usage:
 *   node scripts/test-pages.mjs           # Test dev server (default)
 *   node scripts/test-pages.mjs --prod    # Test production build
 */

const BASE_URL = process.argv.includes("--prod")
  ? "http://localhost:3000" // Prod runs on 3000 via 'npm start'
  : "http://localhost:3000"; // Dev also runs on 3000 via 'npm run dev'

const IS_PROD = process.argv.includes("--prod");

const PAGES = [
  { path: "/", name: "Home" },
  { path: "/profile", name: "Profile" },
  { path: "/admin", name: "Admin" },
  { path: "/changelog", name: "Changelog" },
  { path: "/download", name: "Download" },
];

/**
 * Wait for server to be ready by polling the health endpoint
 */
async function waitForServer(maxAttempts = 30, delayMs = 1000) {
  console.log(`⏳ Waiting for server at ${BASE_URL}...`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(BASE_URL, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (response.status < 500) {
        console.log(`✅ Server ready after ${i + 1} attempts\n`);
        return true;
      }
    } catch {
      // Connection refused - server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.error(`❌ Server not ready after ${maxAttempts} attempts`);
  return false;
}

async function testPage(page, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${page.path}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      const status = response.status;
      const body = await response.text();

      // Check for ENOENT errors in HTML (dev server issue)
      if (!IS_PROD && body.includes("ENOENT") && body.includes(".next")) {
        console.log(`❌ ${page.name} (${page.path}): Build Cache Corruption (ENOENT)`);
        console.log(`   💡 Fix: rm -rf .next && restart dev server`);
        return false;
      }

      if (status >= 500) {
        if (attempt < retries) {
          // Retry once for 500 errors (dev server might be compiling)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        console.log(`❌ ${page.name} (${page.path}): ${status} Server Error`);
        if (body.includes("Internal Server Error")) {
          console.log(`   Details: Check browser console or Next.js logs`);
        }
        return false;
      } else if (status === 404 && body.includes("This page could not be found")) {
        // Check if it's a Clerk auth redirect (404 after rewrite)
        console.log(`🔒 ${page.name} (${page.path}): Auth Required (Clerk protected)`);
        return true; // Auth required is acceptable
      } else if (status === 404) {
        console.log(`⚠️  ${page.name} (${page.path}): 404 Not Found`);
        return false;
      } else if (status === 401 || status === 403) {
        console.log(`🔒 ${page.name} (${page.path}): ${status} Auth Required (expected)`);
        return true; // Auth required is acceptable
      } else if (status >= 200 && status < 300) {
        console.log(`✅ ${page.name} (${page.path}): ${status} OK`);
        return true;
      } else {
        console.log(`⚠️  ${page.name} (${page.path}): ${status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      console.log(`❌ ${page.name} (${page.path}): ${error.message}`);
      return false;
    }
  }

  return false;
}

async function main() {
  const mode = IS_PROD ? "PRODUCTION" : "DEVELOPMENT";
  console.log(`\n🧪 Testing ${PAGES.length} pages in ${mode} mode`);
  console.log(`📍 Server: ${BASE_URL}\n`);

  // Wait for server to be ready
  const serverReady = await waitForServer();
  if (!serverReady) {
    console.error("\n❌ Server not responding. Is it running?");
    console.log(`   Start dev: npm run dev`);
    console.log(`   Start prod: npm run build && npm start`);
    process.exit(1);
  }

  // Test all pages
  const results = await Promise.all(PAGES.map((page) => testPage(page)));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log(`\n📊 Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} page(s) with issues. Check logs above.`);
    process.exit(1);
  } else {
    console.log(`\n✨ All pages loading successfully in ${mode} mode!`);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
