# Convex Patterns & Conventions

> **Last Updated:** 2025-10-23
> **Purpose:** Best practices, conventions, and common patterns for Convex development

---

## Naming Conventions

### Queries

- **`getX`** - Fetch single item: `getMe`, `getUser`
- **`listX`** - Fetch multiple items: `listChallenges`
- **`getMyX`** - Fetch current user's items: `getMyPomodoros`
- **`findX`** - Search/filter: `findUserByUsername`

### Mutations

- **`createX`** - Create new record: `createChallenge`
- **`updateX`** - Modify existing: `updateChallenge`
- **`deleteX`** - Remove record: `deleteChallenge`
- **`saveX`** - Upsert pattern: `saveSession`, `savePreferences`
- **`ensureX`** - Create if not exists: `ensureUser`

### Internal Functions

- **Export with `internal`** - Functions called by scheduler
- **Prefix with underscore** (optional) - `_updateChallengeProgress`

### Admin Functions

- **Check admin in handler** - No special naming required
- **Document as "(Admin)"** - In JSDoc comments

---

## Authentication Patterns

### Standard Auth Check

**All authenticated functions follow this pattern:**

```typescript
export const myFunction = query({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    // 1. Get identity from JWT
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 2. Look up user in database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found - call ensureUser first");

    // 3. Proceed with authenticated logic
    // ...
  },
});
```

**Key points:**

- `identity.subject` contains Clerk user ID (verified by JWT)
- `identity.email` available for admin checks
- Always check both `identity` and `user` existence

### Admin Check

```typescript
export const adminFunction = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check admin email
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",");
    if (!identity.email || !adminEmails.includes(identity.email)) {
      throw new Error("Not authorized: Admin access only");
    }

    // Proceed with admin logic
    // ...
  },
});
```

**Environment variable:** Set `ADMIN_EMAILS` in Convex dashboard (comma-separated)

### Optional Auth

```typescript
export const publicQuery = query({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      // Return personalized data
    } else {
      // Return public data
    }
  },
});
```

---

## Query Patterns

### Use Indexes for All User-Scoped Queries

**❌ Bad - Full table scan:**

```typescript
await ctx.db
  .query("pomodoros")
  .filter((p) => p.userId === user._id)
  .collect();
```

**✅ Good - Uses index:**

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

### Date-Range Queries

**Pattern for date filtering:**

```typescript
const startOfDay = new Date().setHours(0, 0, 0, 0);

await ctx.db
  .query("pomodoros")
  .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
  .filter((p) => p.completedAt >= startOfDay)
  .collect();
```

**Why compound index?**

- Filters by `userId` first (uses index)
- Then filters by date (in-memory on smaller set)
- Much faster than full table scan

### Limit Results for Performance

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .order("desc")
  .take(50); // Limit to 50 most recent
```

---

## Mutation Patterns

### Idempotent Mutations

**Pattern:** Safe to call multiple times with same result

**Example - `ensureUser`:**

```typescript
export const ensureUser = mutation({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (existing) {
      return { userId: existing._id, username: existing.username, isNew: false };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      username: generateUsername(),
      createdAt: Date.now(),
    });

    return { userId, username: existing.username, isNew: true };
  },
});
```

**Benefits:**

- Network retry-safe
- No duplicate records
- Clear success/already-exists distinction

### Duplicate Prevention

**Pattern:** Prevent duplicate records within time window

**Example - `saveSession`:**

```typescript
export const saveSession = mutation({
  handler: async (ctx, args) => {
    // Check for duplicates within 1 second
    const recentDuplicate = await ctx.db
      .query("pomodoros")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((p) => p.mode === args.mode && Math.abs(p.completedAt - args.completedAt) < 1000)
      .first();

    if (recentDuplicate) {
      return recentDuplicate._id; // Return existing, don't create duplicate
    }

    // Create new session
    return await ctx.db.insert("pomodoros", {
      /* ... */
    });
  },
});
```

### Scheduled Side Effects

**Pattern:** Use scheduler for async operations

**Example:**

```typescript
export const saveSession = mutation({
  handler: async (ctx, args) => {
    // 1. Primary operation (fast)
    const sessionId = await ctx.db.insert("pomodoros", {
      /* ... */
    });

    // 2. Schedule side effect (async, doesn't block)
    if (args.mode === "focus") {
      await ctx.scheduler.runAfter(
        0, // Run immediately but asynchronously
        internal.challenges.updateChallengeProgress,
        { userId: user._id }
      );
    }

    return sessionId;
  },
});

// Internal mutation for scheduler
export const updateChallengeProgress = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Expensive recalculation happens here
    // ...
  },
});
```

**Benefits:**

- Primary mutation stays fast
- Automatic retries on failure
- Idempotent execution

---

## Validation Patterns

### Always Use Validators

```typescript
import { v } from "convex/values";

export const saveSession = mutation({
  args: {
    mode: v.union(v.literal("focus"), v.literal("break")),
    duration: v.number(),
    tag: v.optional(v.string()),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // args are type-safe and validated
  },
});
```

**Benefits:**

- Automatic runtime validation
- TypeScript type inference
- Clear API contract

### Custom Validation

```typescript
export const createChallenge = mutation({
  args: {
    target: v.number(),
    type: v.string(),
    // ...
  },
  handler: async (ctx, args) => {
    // Custom business logic validation
    if (args.target < 1) {
      throw new Error("Target must be at least 1");
    }

    if (args.type === "recurring_monthly" && !args.recurringMonth) {
      throw new Error("recurringMonth required for recurring_monthly type");
    }

    // Proceed with mutation
  },
});
```

---

## Error Handling

### Throw Descriptive Errors

**❌ Bad:**

```typescript
throw new Error("Error");
throw new Error("Invalid");
```

**✅ Good:**

```typescript
throw new Error("User not found - call ensureUser first");
throw new Error("Session already exists within 1 second window");
throw new Error("Not authorized: Admin access only");
```

**Why:** Helps debugging and provides actionable feedback to users

### Error vs. Empty Results

**Use errors for exceptional cases:**

```typescript
if (!user) throw new Error("User not found");
```

**Return empty for expected missing data:**

```typescript
export const getMyPomodoros = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return []; // Not an error, just not signed in

    // ...
  },
});
```

---

## Testing Patterns

### Using `convex-test`

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

  // Verify in database
  const sessions = await t.query(api.pomodoros.getMyPomodoros);
  expect(sessions).toHaveLength(1);
});
```

### Test Authentication

```typescript
test("requires authentication", async () => {
  const t = convexTest(schema);
  // Don't set identity

  await expect(
    t.mutation(api.pomodoros.saveSession, {
      /* ... */
    })
  ).rejects.toThrow("Not authenticated");
});
```

### Test Edge Cases

```typescript
test("prevents duplicate sessions", async () => {
  const t = convexTest(schema);
  t.withIdentity({ subject: "user123" });

  await t.mutation(api.users.ensureUser, {});

  const timestamp = Date.now();

  // Save first session
  const id1 = await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: timestamp,
  });

  // Try to save duplicate (within 1 second)
  const id2 = await t.mutation(api.pomodoros.saveSession, {
    mode: "focus",
    duration: 1500,
    completedAt: timestamp + 500, // 500ms later
  });

  // Should return same ID (no duplicate created)
  expect(id1).toBe(id2);

  // Verify only one record
  const sessions = await t.query(api.pomodoros.getMyPomodoros);
  expect(sessions).toHaveLength(1);
});
```

---

## Modifying Schema

### Adding a New Table

1. **Update `schema.ts`:**

```typescript
export default defineSchema({
  // ... existing tables
  notifications: defineTable({
    userId: v.id("users"),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

2. **Schema auto-pushes** (if `npx convex dev` running)

3. **Update documentation:**
   - `SCHEMA.md` → Add table documentation
   - `ARCHITECTURE.md` → Update Data Model section

### Adding an Index

**When to add:**

- Query doing full table scan
- Performance degradation with data growth
- Frequent filter on non-indexed field

**How to add:**

```typescript
// In schema.ts
users: defineTable({
  // ... fields
})
  .index("by_clerk", ["clerkId"])
  .index("by_email", ["email"]),  // New index
```

**Note:** Indexes are built automatically by Convex (no manual migration)

### Removing Fields

**⚠️ Breaking change - requires migration**

**Safe approach:**

1. Make field optional first
2. Deploy and wait for full rollout
3. Stop writing to field
4. Remove field from schema in next deployment

---

## Development Workflow

### Running Locally

```bash
npx convex dev
```

**What it does:**

- Watches for file changes
- Auto-pushes schema updates
- Streams function logs
- Generates TypeScript types

### Viewing Logs

```bash
npx convex logs

# Filter by function
npx convex logs --function saveSession

# Watch in real-time
npx convex logs --watch
```

### Debugging

**Console logs appear in Convex dashboard:**

```typescript
export const myFunction = query({
  handler: async (ctx) => {
    console.log("Debug info:", someValue);
    // Visible in dashboard or `npx convex logs`
  },
});
```

**Error stack traces:**

- Full stack in Convex dashboard
- Error message only sent to client

### Testing Schema Changes

1. Make change in `schema.ts`
2. Wait for push confirmation
3. Test in browser/tests
4. Check Convex dashboard for errors

---

## Common Tasks

### Adding a New Query

1. **Create function:**

```typescript
// convex/myModule.ts
export const myQuery = query({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

2. **Use in client:**

```typescript
import { api } from "@/convex/_generated/api";
const data = useQuery(api.myModule.myQuery, args);
```

3. **Update documentation:**
   - `API.md` → Add to Queries section
   - `QUICK_LOOKUP.md` → Add quick reference

### Adding a New Mutation

Same as query, but use `useMutation`:

```typescript
const mutate = useMutation(api.myModule.myMutation);
await mutate(args);
```

### Migrating Data

**Use action for one-time migrations:**

```typescript
export const migrateData = internalMutation({
  handler: async (ctx) => {
    const records = await ctx.db.query("table").collect();

    for (const record of records) {
      await ctx.db.patch(record._id, {
        newField: calculateValue(record),
      });
    }
  },
});
```

**Run via dashboard:** Functions → Run → `migrateData`

---

## Performance Best Practices

### 1. Always Use Indexes

Check Convex dashboard for full table scans.

### 2. Limit Query Results

```typescript
.take(50)  // Only return 50 records
```

### 3. Avoid N+1 Queries

**❌ Bad:**

```typescript
for (const user of users) {
  const sessions = await ctx.db
    .query("pomodoros")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
}
```

**✅ Good:**

```typescript
const allSessions = await ctx.db.query("pomodoros").collect();
const sessionsByUser = groupBy(allSessions, (s) => s.userId);
```

### 4. Cache Expensive Calculations

Store in user record instead of recalculating:

```typescript
// Store bestDailyStreak in user record
// Recalculate only when new sessions added
```

---

## Related Documentation

- [Schema Reference](./SCHEMA.md) - Database structure
- [API Reference](./API.md) - All functions
- [Quick Lookup](./QUICK_LOOKUP.md) - Fast reference
- [Testing Guide](../docs/testing/guide.md) - Testing strategies

---

## Quick Checklist

When adding new Convex code:

- [ ] Function has descriptive name following conventions
- [ ] Arguments use Convex validators
- [ ] Authentication checked (if required)
- [ ] Queries use indexes (no full table scans)
- [ ] Error messages are descriptive
- [ ] Side effects use scheduler (if async)
- [ ] Documentation updated (API.md, SCHEMA.md if needed)
- [ ] Tests added (if complex logic)

---

Need help? Check existing files for patterns or consult [Convex Documentation](https://docs.convex.dev).
