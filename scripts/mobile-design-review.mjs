/**
 * Mobile Design Review Script
 *
 * Tests all pages on mobile viewport and generates a detailed report
 * with screenshots and findings.
 *
 * Usage: node scripts/mobile-design-review.mjs
 */

import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = "mobile-review-results";

// Mobile viewport configurations
const MOBILE_VIEWPORTS = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14 Pro", width: 393, height: 852 },
  { name: "Samsung Galaxy S21", width: 360, height: 800 },
];

// Pages to test
const PAGES = [
  { path: "/", name: "Home (Signed Out)", requiresAuth: false },
  { path: "/rules", name: "Rules", requiresAuth: false },
  { path: "/friends", name: "Friends", requiresAuth: true },
  { path: "/profile", name: "Profile", requiresAuth: true },
  { path: "/changelog", name: "Changelog", requiresAuth: false },
];

// Common mobile issues to check
const CHECKS = {
  horizontalScroll: "Horizontal scrollbar present",
  buttonsTooSmall: "Buttons smaller than 44x44px (iOS minimum)",
  textOverflow: "Text overflowing container",
  navMissing: "Navigation elements missing",
  offscreenElements: "Interactive elements partially offscreen",
};

async function takeScreenshot(page, name, viewport) {
  const filename = `${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${viewport.name.replace(/\s+/g, "_").toLowerCase()}.png`;
  const filepath = path.join(OUTPUT_DIR, "screenshots", filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filename;
}

async function checkHorizontalScroll(page) {
  return await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

async function checkButtonSizes(page) {
  return await page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('button, a[role="button"], input[type="submit"]')
    );
    const tooSmall = buttons.filter((btn) => {
      const rect = btn.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    });
    return tooSmall.map((btn) => ({
      text:
        btn.textContent?.trim().substring(0, 50) ||
        btn.getAttribute("aria-label") ||
        "Unlabeled button",
      width: Math.round(btn.getBoundingClientRect().width),
      height: Math.round(btn.getBoundingClientRect().height),
      selector: btn.id
        ? `#${btn.id}`
        : btn.className
          ? `.${btn.className.split(" ")[0]}`
          : btn.tagName.toLowerCase(),
    }));
  });
}

async function checkOffscreenElements(page, viewport) {
  return await page.evaluate((viewportWidth) => {
    const interactiveElements = Array.from(
      document.querySelectorAll("button, a, input, select, textarea")
    );
    const offscreen = interactiveElements.filter((el) => {
      const rect = el.getBoundingClientRect();
      // Check if element is visible but extends beyond viewport
      return rect.width > 0 && rect.height > 0 && (rect.left < 0 || rect.right > viewportWidth);
    });
    return offscreen.map((el) => ({
      text:
        el.textContent?.trim().substring(0, 50) ||
        el.getAttribute("aria-label") ||
        "Unlabeled element",
      type: el.tagName.toLowerCase(),
      left: Math.round(el.getBoundingClientRect().left),
      right: Math.round(el.getBoundingClientRect().right),
      selector: el.id
        ? `#${el.id}`
        : el.className
          ? `.${el.className.split(" ")[0]}`
          : el.tagName.toLowerCase(),
    }));
  }, viewport.width);
}

async function checkSignInButton(page) {
  // Check if user is signed out and if sign in button is visible
  const signInVisible = await page.evaluate(() => {
    // Find sign in button by searching for buttons containing "Sign In" or "Sign Up"
    const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]'));
    const signInButtons = allButtons.filter((el) => {
      const text = el.textContent?.trim().toLowerCase() || "";
      return text.includes("sign in") || text.includes("sign up");
    });

    // Check if any sign in button is visible
    const visibleSignInButton = signInButtons.find((btn) => {
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
      );
    });

    if (!visibleSignInButton) {
      return {
        exists: signInButtons.length > 0,
        visible: false,
        reason:
          signInButtons.length === 0
            ? "Button not found in DOM"
            : `Found ${signInButtons.length} button(s) but none visible`,
      };
    }

    const rect = visibleSignInButton.getBoundingClientRect();
    const style = window.getComputedStyle(visibleSignInButton);

    return {
      exists: true,
      visible: true,
      rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
      display: style.display,
      visibility: style.visibility,
      text: visibleSignInButton.textContent?.trim(),
    };
  });

  return signInVisible;
}

async function checkNavigation(page) {
  // Check for navigation elements (navbar, bottom nav, etc.)
  return await page.evaluate(() => {
    const navbar = document.querySelector("nav");
    const mobileNav = document.querySelector('[class*="MobileBottomNav"], nav[class*="mobile"]');

    // Find back button by searching for elements containing "Back"
    const allLinks = Array.from(document.querySelectorAll("a, button"));
    const backButton = allLinks.find(
      (el) =>
        el.textContent?.trim().toLowerCase().includes("back") ||
        el.getAttribute("aria-label")?.toLowerCase().includes("back")
    );

    return {
      hasNavbar: !!navbar,
      hasMobileNav: !!mobileNav,
      hasBackButton: !!backButton,
      navbarVisible: navbar ? window.getComputedStyle(navbar).display !== "none" : false,
      mobileNavVisible: mobileNav ? window.getComputedStyle(mobileNav).display !== "none" : false,
    };
  });
}

async function analyzePage(page, pageName, viewport) {
  const issues = [];
  const info = [];

  // Check for horizontal scroll
  const hasHorizontalScroll = await checkHorizontalScroll(page);
  if (hasHorizontalScroll) {
    issues.push({
      severity: "high",
      type: "horizontal-scroll",
      message: "Page has horizontal scrollbar - content is wider than viewport",
      recommendation: "Check for elements without proper responsive sizing (max-width, overflow-x)",
    });
  }

  // Check button sizes
  const smallButtons = await checkButtonSizes(page);
  if (smallButtons.length > 0) {
    issues.push({
      severity: "medium",
      type: "button-size",
      message: `${smallButtons.length} button(s) smaller than recommended 44x44px touch target`,
      buttons: smallButtons,
      recommendation:
        "Increase padding or min-height/min-width to meet iOS/Android touch target guidelines",
    });
  }

  // Check for offscreen elements
  const offscreenElements = await checkOffscreenElements(page, viewport);
  if (offscreenElements.length > 0) {
    issues.push({
      severity: "high",
      type: "offscreen-elements",
      message: `${offscreenElements.length} interactive element(s) partially offscreen`,
      elements: offscreenElements,
      recommendation: "Add overflow-x-hidden to parent or use flexbox/grid with proper wrapping",
    });
  }

  // Check navigation
  const nav = await checkNavigation(page);
  if (!nav.hasNavbar && !nav.hasMobileNav && !nav.hasBackButton) {
    issues.push({
      severity: "high",
      type: "navigation-missing",
      message: "No navigation elements found on this page",
      recommendation: "Add mobile navigation or back button for better UX",
    });
  }

  info.push({
    type: "navigation-info",
    hasNavbar: nav.hasNavbar,
    navbarVisible: nav.navbarVisible,
    hasMobileNav: nav.hasMobileNav,
    mobileNavVisible: nav.mobileNavVisible,
    hasBackButton: nav.hasBackButton,
  });

  // Special check for home page when signed out
  if (pageName === "Home (Signed Out)") {
    const signInCheck = await checkSignInButton(page);
    if (!signInCheck.visible) {
      issues.push({
        severity: "critical",
        type: "sign-in-missing",
        message: "Sign In button not visible on mobile viewport",
        details: signInCheck,
        recommendation: "Add Sign In button to mobile navigation or make navbar visible on mobile",
      });
    }
  }

  return { issues, info };
}

async function generateHTMLReport(results) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobile Design Review Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #f97316;
    }
    .summary {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .summary h2 { color: #333; margin-bottom: 15px; }
    .stat {
      display: inline-block;
      margin-right: 30px;
      font-size: 1.1rem;
    }
    .stat strong { color: #f97316; font-size: 1.3rem; }
    .severity-critical { color: #dc2626; font-weight: bold; }
    .severity-high { color: #ea580c; }
    .severity-medium { color: #f59e0b; }
    .severity-low { color: #84cc16; }
    .page-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .page-section h3 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      color: #f97316;
    }
    .viewport-result {
      margin-top: 20px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #f97316;
    }
    .viewport-result h4 {
      color: #333;
      margin-bottom: 15px;
    }
    .issue {
      background: #fff;
      padding: 15px;
      margin: 10px 0;
      border-radius: 8px;
      border-left: 4px solid;
    }
    .issue.critical { border-left-color: #dc2626; background: #fef2f2; }
    .issue.high { border-left-color: #ea580c; background: #fff7ed; }
    .issue.medium { border-left-color: #f59e0b; background: #fffbeb; }
    .issue.low { border-left-color: #84cc16; background: #f7fee7; }
    .issue-header {
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .severity-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .severity-badge.critical { background: #dc2626; color: white; }
    .severity-badge.high { background: #ea580c; color: white; }
    .severity-badge.medium { background: #f59e0b; color: white; }
    .severity-badge.low { background: #84cc16; color: white; }
    .recommendation {
      margin-top: 10px;
      padding: 10px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .recommendation strong { color: #1e40af; }
    .details {
      margin-top: 10px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      background: #1f2937;
      color: #f3f4f6;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .screenshot {
      margin-top: 15px;
    }
    .screenshot img {
      max-width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .no-issues {
      color: #059669;
      font-weight: 600;
      padding: 20px;
      text-align: center;
      background: #d1fae5;
      border-radius: 8px;
    }
    .timestamp {
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 Mobile Design Review Report</h1>
    <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>

    <div class="summary">
      <h2>Summary</h2>
      <div class="stat">
        <strong>${results.length}</strong> pages tested
      </div>
      <div class="stat">
        <strong>${results.reduce((sum, r) => sum + r.viewports.length, 0)}</strong> viewport tests
      </div>
      <div class="stat">
        <strong class="severity-critical">${results.reduce((sum, r) => sum + r.viewports.reduce((s, v) => s + v.analysis.issues.filter((i) => i.severity === "critical").length, 0), 0)}</strong> critical issues
      </div>
      <div class="stat">
        <strong class="severity-high">${results.reduce((sum, r) => sum + r.viewports.reduce((s, v) => s + v.analysis.issues.filter((i) => i.severity === "high").length, 0), 0)}</strong> high priority
      </div>
      <div class="stat">
        <strong class="severity-medium">${results.reduce((sum, r) => sum + r.viewports.reduce((s, v) => s + v.analysis.issues.filter((i) => i.severity === "medium").length, 0), 0)}</strong> medium priority
      </div>
    </div>

    ${results
      .map(
        (pageResult) => `
      <div class="page-section">
        <h3>${pageResult.pageName}</h3>
        <p><strong>Path:</strong> ${pageResult.path}</p>
        <p><strong>Auth Required:</strong> ${pageResult.requiresAuth ? "Yes" : "No"}</p>

        ${pageResult.viewports
          .map(
            (viewportResult) => `
          <div class="viewport-result">
            <h4>${viewportResult.viewport.name} (${viewportResult.viewport.width}x${viewportResult.viewport.height})</h4>

            ${
              viewportResult.analysis.issues.length === 0
                ? `
              <div class="no-issues">✅ No issues found!</div>
            `
                : `
              ${viewportResult.analysis.issues
                .map(
                  (issue) => `
                <div class="issue ${issue.severity}">
                  <div class="issue-header">
                    <span class="severity-badge ${issue.severity}">${issue.severity}</span>
                    <span>${issue.message}</span>
                  </div>
                  ${
                    issue.recommendation
                      ? `
                    <div class="recommendation">
                      <strong>💡 Recommendation:</strong> ${issue.recommendation}
                    </div>
                  `
                      : ""
                  }
                  ${
                    issue.buttons
                      ? `
                    <div class="details">
                      Affected buttons:<br>
                      ${issue.buttons.map((btn) => `- ${btn.text} (${btn.width}x${btn.height}px) [${btn.selector}]`).join("<br>")}
                    </div>
                  `
                      : ""
                  }
                  ${
                    issue.elements
                      ? `
                    <div class="details">
                      Affected elements:<br>
                      ${issue.elements.map((el) => `- ${el.type}: "${el.text}" (left: ${el.left}px, right: ${el.right}px) [${el.selector}]`).join("<br>")}
                    </div>
                  `
                      : ""
                  }
                  ${
                    issue.details
                      ? `
                    <div class="details">
                      ${JSON.stringify(issue.details, null, 2)}
                    </div>
                  `
                      : ""
                  }
                </div>
              `
                )
                .join("")}
            `
            }

            <div class="screenshot">
              <h5>Screenshot:</h5>
              <img src="screenshots/${viewportResult.screenshot}" alt="${pageResult.pageName} on ${viewportResult.viewport.name}">
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
      )
      .join("")}
  </div>
</body>
</html>
  `.trim();

  const reportPath = path.join(OUTPUT_DIR, "report.html");
  await writeFile(reportPath, html, "utf-8");
  return reportPath;
}

async function main() {
  console.log("🚀 Starting Mobile Design Review...\n");

  // Create output directories
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(path.join(OUTPUT_DIR, "screenshots"))) {
    await mkdir(path.join(OUTPUT_DIR, "screenshots"), { recursive: true });
  }

  // Launch browser
  console.log("🌐 Launching browser...");
  const browser = await chromium.launch();

  const results = [];

  // Test each page
  for (const pageConfig of PAGES) {
    console.log(`\n📄 Testing: ${pageConfig.name} (${pageConfig.path})`);
    const pageResult = {
      pageName: pageConfig.name,
      path: pageConfig.path,
      requiresAuth: pageConfig.requiresAuth,
      viewports: [],
    };

    // Test on each viewport
    for (const viewport of MOBILE_VIEWPORTS) {
      console.log(`  📱 ${viewport.name} (${viewport.width}x${viewport.height})`);

      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });

      const page = await context.newPage();

      try {
        // Navigate to page
        await page.goto(`${BASE_URL}${pageConfig.path}`, {
          waitUntil: "networkidle",
          timeout: 10000,
        });

        // Wait for page to be fully loaded
        await page.waitForTimeout(2000);

        // Take screenshot
        const screenshotFilename = await takeScreenshot(page, pageConfig.name, viewport);

        // Analyze page
        const analysis = await analyzePage(page, pageConfig.name, viewport);

        console.log(`    ✓ Issues found: ${analysis.issues.length}`);
        if (analysis.issues.length > 0) {
          analysis.issues.forEach((issue) => {
            console.log(`      - [${issue.severity.toUpperCase()}] ${issue.message}`);
          });
        }

        pageResult.viewports.push({
          viewport,
          screenshot: screenshotFilename,
          analysis,
        });
      } catch (error) {
        console.error(
          `    ❌ Error testing ${pageConfig.name} on ${viewport.name}:`,
          error.message
        );
        pageResult.viewports.push({
          viewport,
          screenshot: null,
          analysis: {
            issues: [
              {
                severity: "critical",
                type: "test-error",
                message: `Failed to test page: ${error.message}`,
                recommendation: "Check if the page loads correctly and the server is running",
              },
            ],
            info: [],
          },
        });
      } finally {
        await context.close();
      }
    }

    results.push(pageResult);
  }

  await browser.close();

  // Generate report
  console.log("\n📊 Generating HTML report...");
  const reportPath = await generateHTMLReport(results);

  // Save JSON results
  const jsonPath = path.join(OUTPUT_DIR, "results.json");
  await writeFile(jsonPath, JSON.stringify(results, null, 2), "utf-8");

  console.log("\n✅ Mobile Design Review Complete!");
  console.log(`📄 HTML Report: ${reportPath}`);
  console.log(`📄 JSON Results: ${jsonPath}`);
  console.log(`📸 Screenshots: ${path.join(OUTPUT_DIR, "screenshots")}`);

  // Print summary
  const totalIssues = results.reduce(
    (sum, r) => sum + r.viewports.reduce((s, v) => s + v.analysis.issues.length, 0),
    0
  );
  const criticalIssues = results.reduce(
    (sum, r) =>
      sum +
      r.viewports.reduce(
        (s, v) => s + v.analysis.issues.filter((i) => i.severity === "critical").length,
        0
      ),
    0
  );
  const highIssues = results.reduce(
    (sum, r) =>
      sum +
      r.viewports.reduce(
        (s, v) => s + v.analysis.issues.filter((i) => i.severity === "high").length,
        0
      ),
    0
  );

  console.log("\n📈 Summary:");
  console.log(`  Total issues: ${totalIssues}`);
  console.log(`  Critical: ${criticalIssues}`);
  console.log(`  High: ${highIssues}`);

  if (criticalIssues > 0) {
    console.log("\n⚠️  Critical issues found! Review the report for details.");
  }
}

main().catch(console.error);
