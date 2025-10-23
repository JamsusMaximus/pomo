# Convex Backend Documentation

> **Last Updated:** 2025-10-23
> **Purpose:** Overview and navigation for Convex backend

---

## 🎯 Quick Start

The Convex backend provides a real-time, type-safe API for Pomo. All functions are automatically exposed as RPC endpoints with TypeScript types.

### Development

```bash
npx convex dev        # Start dev server
npx convex dashboard  # Open dashboard UI
npx convex logs       # View function logs
```

### Using Functions

```typescript
import { api } from "@/convex/_generated/api";

// Query (auto-updates on data changes)
const sessions = useQuery(api.pomodoros.getMyPomodoros, { limit: 50 });

// Mutation
const saveSession = useMutation(api.pomodoros.saveSession);
await saveSession({ mode: "focus", duration: 1500, completedAt: Date.now() });
```

---

## 📚 Documentation

### Quick Reference

- **[QUICK_LOOKUP.md](./QUICK_LOOKUP.md)** - Fast API reference (start here!)

### Detailed Documentation

- **[SCHEMA.md](./SCHEMA.md)** - Database tables, fields, indexes, and relationships
- **[API.md](./API.md)** - Complete function reference (queries, mutations, actions)
- **[PATTERNS.md](./PATTERNS.md)** - Best practices, conventions, testing, and common patterns

### Related

- **[Architecture](../ARCHITECTURE.md)** - System design and architectural decisions
- **[Testing Guide](../docs/testing/guide.md)** - Backend testing strategies

---

## 🗂️ Key Features

### Real-Time Queries

Queries automatically re-run when underlying data changes:

```typescript
const stats = useQuery(api.stats.getStats);
// Updates automatically when new sessions are saved
```

### Type Safety

Functions generate TypeScript types automatically:

```typescript
// Types inferred from Convex validators
const sessions: Pomodoro[] = useQuery(api.pomodoros.getMyPomodoros);
```

### Built-in Authentication

Integrates seamlessly with Clerk:

```typescript
const identity = await ctx.auth.getUserIdentity();
// JWT verified, identity contains Clerk user info
```

### Serverless Execution

No infrastructure management - scales automatically.

---

## 🔑 Common Queries

| Task             | Function                       | Example                                                 |
| ---------------- | ------------------------------ | ------------------------------------------------------- |
| Get user profile | `users.getMe`                  | `useQuery(api.users.getMe)`                             |
| Get sessions     | `pomodoros.getMyPomodoros`     | `useQuery(api.pomodoros.getMyPomodoros, { limit: 50 })` |
| Get statistics   | `stats.getStats`               | `useQuery(api.stats.getStats)`                          |
| Get challenges   | `challenges.getUserChallenges` | `useQuery(api.challenges.getUserChallenges)`            |

See [QUICK_LOOKUP.md](./QUICK_LOOKUP.md) for complete reference.

---

## 🔧 Common Mutations

| Task             | Function                 | Example                                                                    |
| ---------------- | ------------------------ | -------------------------------------------------------------------------- |
| Create user      | `users.ensureUser`       | `await mutate(api.users.ensureUser, { firstName, lastName })`              |
| Save session     | `pomodoros.saveSession`  | `await mutate(api.pomodoros.saveSession, { mode, duration, completedAt })` |
| Save preferences | `timers.savePreferences` | `await mutate(api.timers.savePreferences, { focusDuration })`              |

See [API.md](./API.md) for complete reference.

---

## 🏗️ Database Schema

### Tables

- **`users`** - User profiles and aggregate stats
- **`pomodoros`** - Completed pomodoro sessions
- **`timers`** - User timer preferences
- **`challenges`** - Challenge definitions (admin-managed)
- **`userChallenges`** - User progress on challenges
- **`levelConfig`** - Level progression configuration

### Relationships

```
users (1) ──< (N) pomodoros
  │
  ├──< (N) userChallenges ──> (1) challenges
  └──< (1) timers
```

See [SCHEMA.md](./SCHEMA.md) for complete schema documentation.

---

## 📖 Key Patterns

### Authentication

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();
```

### Always Use Indexes

```typescript
// ✅ Good - uses index
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();

// ❌ Bad - full table scan
await ctx.db
  .query("pomodoros")
  .filter((p) => p.userId === user._id)
  .collect();
```

### Scheduled Side Effects

```typescript
await ctx.scheduler.runAfter(0, internal.challenges.updateChallengeProgress, {
  userId: user._id,
});
```

See [PATTERNS.md](./PATTERNS.md) for complete patterns and best practices.

---

## 🧪 Testing

Tests use `convex-test` framework:

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";

test("saveSession creates new session", async () => {
  const t = convexTest(schema);
  t.withIdentity({ subject: "user123" });

  await t.mutation(api.users.ensureUser, {});
  const sessionId = await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: Date.now(),
  });

  expect(sessionId).toBeDefined();
});
```

Run tests: `pnpm run test`

See [Testing Guide](../docs/testing/guide.md) for complete testing documentation.

---

## 🚀 Deployment

### Production Deployment

```bash
npx convex deploy
```

### Environment Variables

Set in Convex dashboard (Settings → Environment Variables):

- `ADMIN_EMAILS` - Comma-separated admin emails
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer (auto-configured)

---

## 🔍 Debugging

### View Logs

```bash
npx convex logs
npx convex logs --watch
npx convex logs --function saveSession
```

### Console Logs

```typescript
export const myFunction = query({
  handler: async (ctx) => {
    console.log("Debug:", someValue);
    // Appears in dashboard and logs
  },
});
```

### Dashboard

Open Convex dashboard to:

- View function execution history
- See query performance metrics
- Monitor data in real-time
- Test functions interactively

---

## 🆘 Troubleshooting

| Issue              | Solution                                      |
| ------------------ | --------------------------------------------- |
| "User not found"   | Call `ensureUser` after Clerk sign-in         |
| Slow queries       | Add indexes in `schema.ts`                    |
| Auth failing       | Check `CLERK_JWT_ISSUER_DOMAIN` matches Clerk |
| Schema not pushing | Restart `npx convex dev`                      |

---

## 📚 Learn More

### External Resources

- [Convex Documentation](https://docs.convex.dev)
- [Convex + Clerk Auth](https://docs.convex.dev/auth/clerk)
- [Convex Testing](https://docs.convex.dev/testing)

### Internal Documentation

- [Architecture](../ARCHITECTURE.md) - System design
- [Development Setup](../docs/setup/development.md) - Local setup
- [AI Context](../AI_CONTEXT.md) - AI agent guidelines

---

## 🎯 Next Steps

1. **New to Convex?** Start with [QUICK_LOOKUP.md](./QUICK_LOOKUP.md)
2. **Adding a feature?** Check [PATTERNS.md](./PATTERNS.md)
3. **Schema changes?** Read [SCHEMA.md](./SCHEMA.md)
4. **Need API details?** See [API.md](./API.md)

---

**Remember:** All functions must use indexes for user-scoped queries. Check the dashboard for full table scans!
