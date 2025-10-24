---
description: Run all tests and verify code quality
---

Run comprehensive test suite and code quality checks:

1. Run `pnpm run typecheck` (TypeScript type checking)
2. Run `pnpm run lint:strict` (ESLint with zero warnings)
3. Run `pnpm run format:check` (Prettier formatting)
4. Run `pnpm run test` (Vitest unit tests)
5. Run `pnpm run test:e2e` (Playwright E2E tests)

Report results for each step. If any failures occur, show the errors and suggest fixes.
