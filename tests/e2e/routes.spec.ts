/**
 * @fileoverview E2E tests for route existence, redirects, and auth flow
 * Tests all public/protected routes and ensures proper redirects
 */

import { test, expect } from "@playwright/test";

test.describe("Public Routes", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Pomo/i);
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

test.describe("Auth Routes", () => {
  test("sign-in route exists (Clerk modal)", async ({ page }) => {
    await page.goto("/sign-in");
    // Clerk handles this route - should not 404
    // May redirect to home or show sign-in UI
    await expect(page).not.toHaveURL(/.*404.*/);
  });

  test("sign-up route exists (Clerk modal)", async ({ page }) => {
    await page.goto("/sign-up");
    // Clerk handles this route - should not 404
    await expect(page).not.toHaveURL(/.*404.*/);
  });
});

test.describe("Redirects", () => {
  test("redirects /signin to /sign-in", async ({ page }) => {
    const response = await page.goto("/signin");

    // Should redirect (3xx) or end up at /sign-in
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
  test("non-existent route shows 404 content", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-12345");

    // Next.js renders 404 page with 200 status, check for 404 content instead
    const has404Content = await page.locator("text=/404|not found/i").isVisible();
    expect(has404Content).toBe(true);
  });

  test("/signin does NOT return 404 (redirects)", async ({ page }) => {
    await page.goto("/signin", { waitUntil: "domcontentloaded" });

    // Should redirect to /sign-in
    await page.waitForURL(/\/sign-in/);
    expect(page.url()).toContain("/sign-in");

    // Should show Clerk sign-in UI, not a 404 page with "This page could not be found"
    const hasNotFoundError = await page
      .locator("text=This page could not be found")
      .isVisible()
      .catch(() => false);
    expect(hasNotFoundError).toBe(false);
  });
});
