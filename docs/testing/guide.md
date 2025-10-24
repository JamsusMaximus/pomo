# Testing Guide

Comprehensive testing documentation for Pomo, covering unit tests, integration tests, and E2E tests.

## 🎯 Test Suite Overview

### Test Files

- **`convex/users.test.ts`** - User authentication and profile tests (13 tests)
- **`convex/pomodoros.test.ts`** - Pomodoro session management tests (15 tests)
- **`tests/e2e/routes.spec.ts`** - End-to-end page routing tests

### Test Coverage

#### Backend Tests (`convex/*.test.ts`)

- ✅ User creation and username generation
- ✅ Saving focus and break sessions
- ✅ Session counting (daily, total)
- ✅ Duplicate detection (prevents double-counting)
- ✅ Tag handling and privacy
- ✅ Authentication checks
- ✅ Edge cases (rapid sessions, timing windows)

#### E2E Tests (`tests/e2e/*.spec.ts`)

- ✅ Page routing and navigation
- ✅ Authentication flows
- ✅ UI component rendering
- ✅ Mobile responsiveness

---

## 🧪 Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests once
pnpm run test

# Watch mode (re-runs on file changes)
pnpm run test:watch

# With coverage report
pnpm run test -- --coverage
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm run test:e2e

# Run with UI (interactive mode)
pnpm run test:e2e:ui

# Run with browser visible
pnpm run test:e2e:headed

# Run specific test file
pnpm run test:e2e tests/e2e/routes.spec.ts
```

### Page Load Tests

```bash
# Test all pages load correctly
pnpm run test:pages

# Test production build
pnpm run test:pages:prod
```

---

## 📝 Writing Tests

### Backend Tests (Convex)

Use `convex-test` for testing Convex functions:

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

test("saveSession creates new session", async () => {
  const t = convexTest(schema);

  // Mock authentication
  t.withIdentity({ subject: "user123", email: "test@example.com" });

  // Create user
  await t.mutation(api.users.ensureUser, {
    firstName: "Test",
    lastName: "User",
  });

  // Test session creation
  const sessionId = await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: Date.now(),
  });

  expect(sessionId).toBeDefined();
});
```

**Key patterns:**

- Use `t.withIdentity()` to mock authenticated user
- Create test users with `ensureUser` first
- Test both success and error cases
- Verify side effects (e.g., challenge updates)

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("home page loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check page loaded
  await expect(page).toHaveTitle(/Pomo/);

  // Check timer is visible
  await expect(page.getByRole("button", { name: /start/i })).toBeVisible();
});

test("authentication flow", async ({ page }) => {
  await page.goto("/");

  // Click sign in
  await page.getByRole("button", { name: /sign in/i }).click();

  // Clerk modal should appear
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

**Best practices:**

- Use semantic selectors (`getByRole`, `getByLabel`)
- Test user flows, not implementation details
- Clean up state between tests
- Use page object pattern for complex UIs

---

## 🔧 Test Configuration

### Vitest Config (`vitest.config.mts`)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

### Playwright Config (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 2,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
});
```

---

## ⚠️ Known Issues

### Convex Test Framework Compatibility

**Status:** Tests work but require specific Node.js version

**Issue:** `convex-test@0.0.38` requires Node.js 20.10.0+ for `fs.glob()` API

**Workaround:** Ensure you're using Node.js 20.10.0 or higher:

```bash
node --version  # Should be v20.10.0+
```

If tests fail with `glob is not a function`, upgrade Node.js.

---

## 🎯 Testing Strategies

### Unit Testing Backend Functions

**What to test:**

- ✅ Query returns correct data format
- ✅ Mutation modifies database correctly
- ✅ Authentication checks work
- ✅ Input validation catches bad data
- ✅ Error handling returns meaningful messages

**Example test cases:**

```typescript
// Query tests
test("getMyPomodoros returns user sessions only", async () => {
  // Create two users, verify each sees only their sessions
});

test("getStats calculates streaks correctly", async () => {
  // Create sessions spanning multiple days
  // Verify daily and weekly streaks
});

// Mutation tests
test("saveSession requires authentication", async () => {
  // Call without identity, expect error
});

test("saveSession prevents duplicates", async () => {
  // Save same session twice within 1 second
  // Verify only one record created
});

// Edge cases
test("handles rapid session completion", async () => {
  // Complete 10 sessions in quick succession
  // Verify all saved correctly
});
```

### Integration Testing Flows

**What to test:**

- User completes pomodoro → session saves → stats update → challenges sync
- User follows friend → friend appears in feed → unfollowing removes them
- Admin creates challenge → appears for users → users can complete it

**Example:**

```typescript
test("complete pomodoro updates all related data", async () => {
  const t = convexTest(schema);
  t.withIdentity({ subject: "user123" });

  // 1. Create user
  const { userId } = await t.mutation(api.users.ensureUser, {});

  // 2. Save session
  await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: Date.now(),
  });

  // 3. Verify stats updated
  const stats = await t.query(api.stats.getStats);
  expect(stats.total.count).toBe(1);

  // 4. Verify challenge progress (scheduled async, may need delay)
  // Wait for scheduler to complete
  await new Promise((resolve) => setTimeout(resolve, 100));

  const challenges = await t.query(api.challenges.getUserChallenges);
  expect(challenges.active.some((c) => c.progress > 0)).toBe(true);
});
```

### E2E Testing User Flows

**Critical user journeys:**

1. **First-time user:**
   - Land on homepage → See timer → Click start → Complete session → Sign up → Session syncs

2. **Returning user:**
   - Sign in → See stats → Start timer → Complete session → Check updated stats

3. **Social features:**
   - Add friend → View friend feed → See friend's activity → React to friend's sessions

4. **Mobile experience:**
   - Navigate on mobile → Timer works → Sessions save → Offline mode works

**Example E2E test:**

```typescript
test("complete pomodoro end-to-end flow", async ({ page }) => {
  // 1. Start as unauthenticated user
  await page.goto("/");

  // 2. Start timer
  await page.getByRole("button", { name: /start/i }).click();

  // 3. Skip timer (for testing)
  await page.getByRole("button", { name: /skip/i }).click();

  // 4. Verify session appears in recent sessions
  await expect(page.getByText(/focus session/i)).toBeVisible();

  // 5. Sign in
  await page.getByRole("button", { name: /sign in/i }).click();
  // ... complete Clerk auth flow

  // 6. Verify session synced to profile
  await page.goto("/profile");
  await expect(page.getByText(/1 session/i)).toBeVisible();
});
```

---

## 🔍 Debugging Tests

### View Test Output

```bash
# Verbose output
pnpm run test -- --reporter=verbose

# Watch mode with UI
pnpm run test:watch
```

### Debug Playwright Tests

```bash
# Run with browser visible
pnpm run test:e2e:headed

# Interactive debugging
pnpm run test:e2e:ui

# Playwright inspector
PWDEBUG=1 pnpm run test:e2e
```

### View Test Reports

After running E2E tests:

```bash
# View HTML report
npx playwright show-report
```

### Debug Convex Tests

Add console.logs in test functions:

```typescript
test("debug session save", async () => {
  const t = convexTest(schema);

  const sessionId = await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: Date.now(),
  });

  console.log("Session ID:", sessionId);

  const sessions = await t.query(api.pomodoros.getMyPomodoros);
  console.log("All sessions:", sessions);
});
```

---

## 📊 Continuous Integration

Tests run automatically on:

- ✅ Every pull request
- ✅ Commits to main branch
- ✅ Manual workflow dispatch

### GitHub Actions Workflow

See `.github/workflows/ci.yml` for configuration.

**What CI runs:**

1. TypeScript type checking
2. ESLint linting
3. Prettier formatting check
4. Unit tests (Vitest)
5. E2E tests (Playwright)
6. Build verification

**View results:** https://github.com/your-username/pomo/actions

---

## ✅ Testing Checklist

Before pushing code:

- [ ] All unit tests pass (`pnpm run test`)
- [ ] All E2E tests pass (`pnpm run test:e2e`)
- [ ] Type checking passes (`pnpm run typecheck`)
- [ ] Linting passes (`pnpm run lint:strict`)
- [ ] Manual testing in browser (critical paths)

Before merging PR:

- [ ] CI passes on GitHub
- [ ] New features have test coverage
- [ ] Changed behavior has updated tests
- [ ] No flaky tests (re-run if needed)

---

## 🎓 Testing Best Practices

### General Principles

1. **Test behavior, not implementation** - Test what users see/experience
2. **Write readable tests** - Tests are documentation
3. **Keep tests isolated** - Each test should be independent
4. **Use descriptive names** - Test names should explain what's being tested
5. **Test edge cases** - Empty states, errors, boundary conditions

### Backend Testing

- ✅ Always mock authentication with `withIdentity()`
- ✅ Create fresh test data for each test
- ✅ Test both authorized and unauthorized access
- ✅ Verify side effects (database changes, scheduled jobs)
- ❌ Don't test Convex framework itself (trust it works)

### E2E Testing

- ✅ Test complete user flows
- ✅ Use semantic selectors (roles, labels, text)
- ✅ Wait for async operations
- ✅ Clean up test data after runs
- ❌ Don't test implementation details (CSS classes, internal state)
- ❌ Don't make tests brittle (exact text matches, pixel-perfect positions)

### Performance Testing

Consider adding tests for:

- Page load times (< 3s Time to Interactive)
- Query response times (< 500ms for typical queries)
- Bundle sizes (track with CI)

---

## 📚 Related Documentation

- [Development Setup](../setup/development.md) - Local testing environment
- [Architecture](../../ARCHITECTURE.md) - System design for context
- [Convex Backend](../../convex/README.md) - Backend API reference

---

## 🔗 External Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Convex Testing Guide](https://docs.convex.dev/testing)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

---

Need help with testing? Check out the examples in existing test files or open a GitHub issue.
