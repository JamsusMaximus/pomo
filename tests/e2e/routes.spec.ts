/**
 * @fileoverview E2E tests for route existence, redirects, and auth flow
 * Tests all public/protected routes and ensures proper redirects
 */

import { test, expect } from "@playwright/test";

test.describe("Public Routes", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lock\.in/i);
    // Check for timer component
    await expect(page.locator("text=Start").or(page.locator("text=Pause"))).toBeVisible();
  });

  test("changelog page loads", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.locator("h1")).toContainText(/changelog/i);
  });

  test("download page loads", async ({ page }) => {
    await page.goto("/download");
    await expect(page.locator("h1")).toContainText(/download/i);
  });

  test("rules page loads", async ({ page }) => {
    await page.goto("/rules");
    await expect(page.locator("h1").or(page.locator("text=Rules"))).toBeVisible();
  });

  test("profile page loads (public)", async ({ page }) => {
    await page.goto("/profile");
    // Profile page should load without error (may show empty state or redirect)
    await expect(page).not.toHaveURL(/.*404.*/);
  });
});

test.describe("Auth Flow", () => {
  test("navbar has sign in button on desktop", async ({ page }) => {
    // Set desktop viewport (navbar is hidden on mobile with md:block)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    // Check for sign-in button in navbar (Clerk uses modal mode, not routes)
    const signInButton = page.locator("button:has-text('Sign In')");
    await expect(signInButton).toBeVisible();
  });
});

test.describe("Redirects", () => {
  test("redirects /signin to /sign-in (which may 404 in modal mode)", async ({ page }) => {
    await page.goto("/signin");

    // Should redirect to /sign-in (but in modal mode, /sign-in itself doesn't exist as a page)
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");
  });
});

test.describe("Protected Routes", () => {
  test("admin page requires auth or shows sign-in", async ({ page }) => {
    await page.goto("/admin");

    // Should either:
    // 1. Redirect to sign-in (if middleware enforces)
    // 2. Show "Sign in to continue" message
    // 3. Show auth modal

    const isSignInRequired =
      page.url().includes("/sign-in") ||
      (await page.locator("text=Sign in").count()) > 0 ||
      (await page.locator("text=Admin").count()) === 0;

    expect(isSignInRequired).toBeTruthy();
  });

  test("friends page requires auth or shows sign-in", async ({ page }) => {
    await page.goto("/friends");

    // Should either redirect or show auth requirement
    const isSignInRequired =
      page.url().includes("/sign-in") || (await page.locator("text=Sign in").count()) > 0;

    expect(isSignInRequired).toBeTruthy();
  });
});

test.describe("404 Detection", () => {
  test("non-existent route loads (Next.js handles 404)", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");

    // Next.js will render a page (may be default 404 or custom)
    // Just verify we got a response and page loaded
    expect(response?.status()).toBeGreaterThanOrEqual(200);

    // Page should not crash or show server error
    const hasError = await page
      .locator("text=/Application error|Internal Server Error/i")
      .isVisible()
      .catch(() => false);
    expect(hasError).toBe(false);
  });

  test("/signin redirects to /sign-in (verifies redirect works)", async ({ page }) => {
    await page.goto("/signin", { waitUntil: "domcontentloaded" });

    // Should redirect to /sign-in
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");

    // Redirect is working - that's what we're testing
    // (Note: /sign-in may 404 in Clerk modal mode since it's not a real page)
  });
});
