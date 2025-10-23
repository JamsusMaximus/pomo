# Contributing to Pomo

Thank you for your interest in contributing to Pomo! This guide will help you get started.

## 📚 Before You Start

### Read the Documentation

- **[Development Setup](./docs/setup/development.md)** - Set up your local environment
- **[Architecture](./ARCHITECTURE.md)** - Understand the system design
- **[AI Context](./AI_CONTEXT.md)** - Documentation standards (important!)
- **[Testing Guide](./docs/testing/guide.md)** - Testing strategies

### Useful Resources

- **[.claude/PROJECT_CONTEXT.md](./.claude/PROJECT_CONTEXT.md)** - Quick project overview
- **[.claude/QUICK_REFERENCE.md](./.claude/QUICK_REFERENCE.md)** - Fast reference card
- **[convex/QUICK_LOOKUP.md](./convex/QUICK_LOOKUP.md)** - API quick reference

---

## 🚀 Getting Started

### 1. Set Up Your Environment

```bash
# Clone the repository
git clone https://github.com/your-username/pomo.git
cd pomo

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Set up Clerk and Convex (follow prompts)
pnpm run verify-setup

# Start development servers
pnpm run dev
```

See [Development Setup](./docs/setup/development.md) for detailed instructions.

### 2. Install Git Hooks

```bash
bash scripts/install-hooks.sh
```

This installs:

- **Pre-commit** - Auto-formats code, runs linting, validates documentation
- **Pre-push** - Runs build to catch errors before CI

---

## 🎯 Contribution Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions/fixes

### 2. Make Changes

Follow the decision trees in `.claude/decision-trees/`:

- [Feature Addition](./.claude/decision-trees/feature-addition.md)
- [Bug Fix](./.claude/decision-trees/bug-fix.md)
- [Schema Change](./.claude/decision-trees/schema-change.md)

**Key principles:**

- **Documentation is mandatory** - Update docs as you code
- **Follow existing patterns** - Check similar features first
- **Test your changes** - Manual + automated testing
- **Consider offline behavior** - This is an offline-first app

### 3. Document Your Changes

**Always update:**

- File headers (`@fileoverview`) for new files
- Relevant documentation (see [AI_CONTEXT.md](./AI_CONTEXT.md))
- Comments for non-obvious code

**Update if applicable:**

- `README.md` - User-facing features
- `ARCHITECTURE.md` - Architecture changes
- `convex/SCHEMA.md` - Database schema
- `convex/API.md` - New functions

### 4. Test Your Changes

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint:strict

# Formatting
pnpm run format

# Unit tests
pnpm run test

# E2E tests (if applicable)
pnpm run test:e2e
```

**Manual testing:**

- Test feature in dev environment
- Test offline behavior (Chrome DevTools → Offline)
- Test on mobile (responsive mode)
- Test authentication flows
- Check browser console for errors

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: Add feature description"
```

**Commit message format:**

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

**Examples:**

```
feat: Add notification system with sound alerts

Implements toast notifications and optional sound alerts
for session completions. Works offline with queued notifications.

Closes #123
```

```
fix: Prevent duplicate sessions within 1-second window

Problem: Multiple quick completions created duplicate sessions
Solution: Check for existing sessions within 1-second window
before inserting new record

Tested: Added regression test in pomodoros.test.ts
```

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

**PR Title:** Same as commit message

**PR Description should include:**

- **Summary** - What changed (1-3 sentences)
- **Motivation** - Why this change is needed
- **Testing** - How you tested it
- **Screenshots** - If UI changed
- **Documentation** - What docs were updated
- **Breaking Changes** - If any (highlight clearly)

**PR Template:**

```markdown
## Summary

Brief description of changes

## Motivation

Why this change is needed

## Changes

- Change 1
- Change 2

## Testing

- [ ] Manual testing completed
- [ ] All tests pass
- [ ] Tested offline mode
- [ ] Tested on mobile

## Documentation

- [ ] Updated relevant docs
- [ ] Added file headers
- [ ] Updated API reference (if applicable)

## Screenshots

[If UI changed]
```

---

## 📋 Code Standards

### TypeScript

- **Strict mode enabled** - No implicit `any`
- **Explicit return types** - For exported functions
- **Type imports** - Use `import type` where possible

```typescript
// ✅ Good
export function calculateLevel(pomodoros: number): number {
  return Math.floor(Math.sqrt(pomodoros));
}

// ❌ Bad
export function calculateLevel(pomodoros) {
  return Math.floor(Math.sqrt(pomodoros));
}
```

### React Components

- **Functional components** - No class components
- **TypeScript interfaces** - For props
- **Meaningful names** - Descriptive component names

```typescript
// ✅ Good
interface TimerProps {
  duration: number;
  onComplete: () => void;
}

export function Timer({ duration, onComplete }: TimerProps) {
  // ...
}

// ❌ Bad
export function Timer(props: any) {
  // ...
}
```

### Convex Functions

- **Always use indexes** - No full table scans
- **Validate inputs** - Use Convex validators
- **Check authentication** - For protected functions
- **Descriptive errors** - Clear error messages

```typescript
// ✅ Good
export const saveSession = mutation({
  args: {
    mode: v.union(v.literal("focus"), v.literal("break")),
    duration: v.number(),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Use index for query
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found - call ensureUser first");

    // ...
  },
});
```

### File Structure

```
file.tsx
├── Imports (external → internal → types)
├── Types/Interfaces
├── Component/Function
└── Exports
```

### Naming Conventions

- **Files:** PascalCase for components, camelCase for utilities
- **Components:** PascalCase (`Timer`, `FocusGraph`)
- **Functions:** camelCase (`calculateLevel`, `formatTime`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_SESSIONS`, `DEFAULT_DURATION`)
- **Convex functions:** Prefix pattern (`getX`, `createX`, `updateX`)

---

## 🧪 Testing Standards

### When to Write Tests

**Always test:**

- Complex business logic
- Critical user paths
- Bug fixes (regression tests)
- Edge cases

**Test types:**

- **Unit tests** - `*.test.ts` (Vitest)
- **Integration tests** - `convex/*.test.ts` (convex-test)
- **E2E tests** - `tests/e2e/*.spec.ts` (Playwright)

### Test Guidelines

```typescript
// Good test structure
test("descriptive test name", async () => {
  // Arrange
  const input = setupTestData();

  // Act
  const result = functionUnderTest(input);

  // Assert
  expect(result).toBe(expectedValue);
});
```

---

## 📝 Documentation Standards

### File Headers

Add to all major files in `app/`, `components/`, `convex/`, `lib/`, `hooks/`:

```typescript
/**
 * @fileoverview Brief description of file's purpose
 * @module path/to/file
 *
 * Key responsibilities:
 * - Responsibility 1
 * - Responsibility 2
 *
 * Dependencies: List key dependencies
 * Used by: List main consumers
 */
```

### Inline Comments

```typescript
// ✅ Good - explains WHY
// Use best streak to prevent penalizing users for missed days
const streakToUse = user.bestDailyStreak || 0;

// ❌ Bad - explains WHAT (obvious from code)
// Set streak to best streak or 0
const streakToUse = user.bestDailyStreak || 0;
```

### Documentation Updates

See `.claude/documentation-map.json` for what to update when.

**Common triggers:**

- Schema change → Update `convex/SCHEMA.md`, `ARCHITECTURE.md`
- New function → Update `convex/API.md`, `convex/QUICK_LOOKUP.md`
- Architecture change → Update `ARCHITECTURE.md`, `.claude/PROJECT_CONTEXT.md`

---

## 🚨 What NOT to Do

### ❌ Don't Skip Documentation

Documentation is not optional. It's part of the implementation.

### ❌ Don't Push Broken Code

Always test before pushing:

```bash
pnpm run typecheck && pnpm run lint:strict && pnpm run test
```

### ❌ Don't Commit Secrets

Never commit:

- `.env.local` (already gitignored)
- API keys
- Credentials
- Tokens

### ❌ Don't Make Breaking Changes Without Discussion

Discuss major changes in an issue first:

- Schema breaking changes
- API breaking changes
- Architecture changes

### ❌ Don't Ignore Offline Behavior

This is an offline-first app. Always consider:

- Does it work offline?
- What happens when sync fails?
- Is data saved locally first?

---

## 🎯 Quick Commands

```bash
# Development
pnpm run dev              # Start dev servers
pnpm run dev:clean        # Clean and restart
pnpm run verify-setup     # Verify environment

# Code Quality
pnpm run typecheck        # Type checking
pnpm run lint:strict      # Lint with zero warnings
pnpm run format           # Format code

# Testing
pnpm run test             # Unit tests
pnpm run test:e2e         # E2E tests

# Database
npx convex dashboard      # Open Convex dashboard
npx convex logs           # View backend logs
npx convex deploy         # Deploy to production
```

---

## 💡 Tips for Success

1. **Start small** - Fix a bug or improve docs before big features
2. **Ask questions** - Open an issue if unsure
3. **Follow patterns** - Check existing code for examples
4. **Test thoroughly** - Manual + automated testing
5. **Document early** - Update docs as you code, not after
6. **Use decision trees** - Follow `.claude/decision-trees/` guides
7. **Check CI** - Ensure GitHub Actions pass
8. **Be patient** - Reviews may take time

---

## 🤝 Getting Help

### Documentation

- [Development Setup](./docs/setup/development.md)
- [Architecture](./ARCHITECTURE.md)
- [Testing Guide](./docs/testing/guide.md)
- [Convex Backend](./convex/README.md)

### Ask Questions

- Open a [GitHub Issue](https://github.com/your-username/pomo/issues)
- Tag with `question` label
- Provide context and what you've tried

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project (ISC).

---

**Thank you for contributing to Pomo! 🍅**
