# AI_CONTEXT.md

> **Last Updated:** 2025-10-08
> **Purpose:** Instructions and context for AI agents working on this codebase

## 🤖 Instructions for AI Agents

This document provides critical context and rules for AI agents contributing to this codebase. Following these guidelines ensures consistency, maintainability, and proper documentation.

---

## 📋 Documentation Maintenance (CRITICAL)

### General Rule

After making ANY code change, you MUST check and update relevant documentation. Documentation is not optional—it's part of the implementation.

### 1. File Headers

**When to update:** Creating a new file OR significantly modifying an existing file's purpose

**Format:** Add JSDoc header at the top of every `.ts` and `.tsx` file:

```typescript
/**
 * @fileoverview Brief description of file's purpose (1-2 sentences)
 * @module path/to/file
 *
 * Key responsibilities:
 * - Responsibility 1
 * - Responsibility 2
 * - Responsibility 3
 *
 * Dependencies: List key external dependencies
 * Used by: List main consumers/callers
 */
```

**Examples:**

- New component created → Add file header
- Function's main purpose changed → Update "Key responsibilities"
- Major refactor → Update "Dependencies" and "Used by" sections

### 2. ARCHITECTURE.md

**When to update:**

| Change Type                                          | Action Required                                 |
| ---------------------------------------------------- | ----------------------------------------------- |
| Modify `convex/schema.ts` (add/remove tables)        | Update "Data Model" section                     |
| Add/remove external service (Clerk, Convex, etc.)    | Update "Tech Stack" and rationale sections      |
| Change auth flow (`middleware.ts`, `auth.config.ts`) | Update "Authentication & Authorization" section |
| Modify offline sync strategy (`lib/storage/*`)       | Update "Offline-First Design" section           |
| Change state management approach                     | Update "State Management" section               |
| Add/remove major architectural patterns              | Update relevant architecture section            |

**How to update:**

1. Read the current section completely
2. Make surgical edits (preserve structure and tone)
3. Ensure consistency with code reality
4. Update "Last Updated" timestamp

### 3. convex/README.md

**When to update:**

| Change Type                       | Action Required                                   |
| --------------------------------- | ------------------------------------------------- |
| Modify `convex/schema.ts`         | Update "Schema Overview" with table relationships |
| Add/remove Convex function        | Update API reference section                      |
| Add/change indexes                | Update "Index Strategy" section                   |
| Modify auth patterns              | Update "Authentication Patterns" section          |
| Change query/mutation conventions | Update "Conventions" section                      |
| Add scheduler usage               | Update "Scheduler Usage" section                  |

**Critical:** If you add a new Convex function, document:

- Function name and type (query/mutation/action)
- Parameters and validation
- Return type
- Purpose and when to use it
- Error cases

### 4. Using TodoWrite for Documentation

**REQUIRED:** When making changes that affect documentation, add specific todo items:

```typescript
// Example todo items when modifying schema:
[
  {
    content: "Update ARCHITECTURE.md - Data Model section for new 'notifications' table",
    status: "pending",
    activeForm: "Updating ARCHITECTURE.md - Data Model section for new 'notifications' table",
  },
  {
    content: "Update convex/README.md - Add 'notifications' table to Schema Overview",
    status: "pending",
    activeForm: "Updating convex/README.md - Add 'notifications' table to Schema Overview",
  },
];
```

**Rules:**

- Create documentation todos BEFORE making code changes
- Keep todos specific (mention exact sections/files)
- Mark as completed ONLY after docs are actually updated
- Verify updated docs are accurate

---

## 🏗️ Project Architecture Quick Reference

### Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19
- **Backend:** Convex (real-time database + serverless functions)
- **Auth:** Clerk
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** React hooks + Convex queries (offline-first with localStorage sync)

### Key Directories

```
app/              → Next.js pages (App Router)
components/       → React components (ui/ = shadcn, rest = custom)
convex/           → Backend functions and schema
lib/              → Utilities and helpers
  storage/        → localStorage sync logic
  constants.ts    → App-wide constants
  levels.ts       → Level calculation logic
hooks/            → Custom React hooks
types/            → TypeScript type definitions
scripts/          → Build and automation scripts
```

### Data Flow Patterns

**Session Creation:**

1. Timer completes → `app/page.tsx`
2. Save to localStorage → `lib/storage/sessions.ts`
3. If signed in → Save to Convex → `convex/pomodoros.ts`
4. Trigger challenge update → `convex/challenges.ts` (via scheduler)
5. Update user stats → Recalculated on next query

**Offline Sync:**

1. Sessions marked as `synced: false` in localStorage
2. Multiple sync triggers:
   - On sign-in
   - On page load (if signed in)
   - Every 60 seconds (background)
   - On tab focus
3. Retry with exponential backoff (2s, 4s, 8s)

### Critical Patterns

**Authentication:**

- All Convex functions check `ctx.auth.getUserIdentity()`
- User must call `ensureUser` mutation after sign-in
- Admin access checked via `ADMIN_EMAILS` env var

**Database Indexes:**

- Always use indexes for queries
- Common pattern: `by_user`, `by_user_and_date`
- See `convex/schema.ts` for all indexes

**Error Handling:**

- Use `<ErrorBoundary>` for component errors
- Convex functions throw errors (caught by client)
- Offline operations stored locally, synced later

---

## 🔧 Development Conventions

### File Naming

- Components: PascalCase (`Timer.tsx`, `FocusGraph.tsx`)
- Utilities: camelCase (`format.ts`, `utils.ts`)
- Pages: lowercase with router structure (`app/page.tsx`, `app/profile/page.tsx`)

### Import Order

1. External packages (React, Next.js, etc.)
2. Convex imports (`api`, types)
3. Internal components
4. Internal utilities
5. Types
6. Relative imports last

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier enforced
- No build warnings allowed (CI fails)
- Prefer explicit types over inference for exports

### Testing

- Unit tests: Vitest (`*.test.ts`)
- Convex tests: `convex-test` (`*.test.ts` in convex/)
- Run tests before committing significant changes

---

## 🚨 Common Gotchas

### 1. Convex Schema Changes

- Schema changes require `npx convex dev` to push
- Don't forget to update types in `types/pomodoro.ts`
- Always consider migration path for existing data

### 2. Offline Sync

- Don't assume Convex save succeeded immediately
- Always save to localStorage first
- Mark as synced only after Convex confirms

### 3. Level Calculations

- Levels calculated from total pomodoro count
- XP = pomodoros × 100
- Always use `lib/levels.ts` helper functions

### 4. Challenge Updates

- Triggered via scheduler (async)
- Don't expect immediate challenge completion
- Use internal mutations for challenge updates

### 5. Clerk Auth

- User object available client-side only
- Server uses `ctx.auth.getUserIdentity()`
- Always call `ensureUser` before other mutations

---

## ✅ Pre-Commit Checklist

Before completing any task:

- [ ] All modified files have accurate file headers
- [ ] ARCHITECTURE.md reflects current system design (if architecture changed)
- [ ] convex/README.md matches actual schema/functions (if backend changed)
- [ ] No orphaned documentation (references to deleted code)
- [ ] All documentation todos marked as completed
- [ ] Types updated if schema changed
- [ ] Tests updated if behavior changed
- [ ] No console errors in dev mode
- [ ] Offline functionality still works (if relevant)

---

## 💡 Tips for Effective Contributions

### When Adding Features

1. Check existing patterns first (don't reinvent)
2. Follow established conventions
3. Add tests for new functions
4. Update docs as you code (not after)
5. Consider offline behavior

### When Fixing Bugs

1. Understand root cause before fixing
2. Add test to prevent regression
3. Check if bug affects offline mode
4. Update docs if behavior changed

### When Refactoring

1. Ensure no breaking changes to API
2. Update all references
3. Run full test suite
4. Update file headers
5. Consider impact on existing docs

---

## 🔗 Related Documentation

- `ARCHITECTURE.md` - System design and technical decisions
- `convex/README.md` - Backend API and schema reference
- `README.md` - User-facing project overview
- `SETUP.md` - Development environment setup
- `CONVENTIONS.md` - Detailed coding standards

---

## 📞 Questions?

If uncertain about documentation requirements:

1. Check existing docs for patterns
2. When in doubt, over-document rather than under-document
3. Ask the user if truly ambiguous

**Remember:** Good documentation is part of good code. Future you (and future agents) will thank you.
