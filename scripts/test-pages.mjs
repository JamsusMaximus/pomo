#!/usr/bin/env node
/**
 * Quick smoke test script to check if all pages load without 500 errors
 * Run: node scripts/test-pages.mjs
 */

const BASE_URL = "http://localhost:3000";

const PAGES = [
  { path: "/", name: "Home" },
  { path: "/profile", name: "Profile" },
  { path: "/admin", name: "Admin" },
  { path: "/changelog", name: "Changelog" },
  { path: "/download", name: "Download" },
];

async function testPage(page) {
  try {
    const response = await fetch(`${BASE_URL}${page.path}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    const status = response.status;
    const body = await response.text();

    if (status >= 500) {
      console.log(`❌ ${page.name} (${page.path}): ${status} Server Error`);
      // Try to extract error from body
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
    console.log(`❌ ${page.name} (${page.path}): ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n🧪 Testing ${PAGES.length} pages on ${BASE_URL}\n`);

  const results = await Promise.all(PAGES.map((page) => testPage(page)));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log(`\n📊 Results: ${passed}/${results.length} passed`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} page(s) with issues. Check logs above.`);
    process.exit(1);
  } else {
    console.log(`\n✨ All pages loading successfully!`);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
