# Convex Backend Documentation

> **Last Updated:** 2025-10-08
> **Purpose:** Backend API reference, schema documentation, and conventions

> **🤖 UPDATE TRIGGERS:**
>
> - Add/remove/modify tables in `schema.ts` → Update "Schema Overview" section
> - Add/remove Convex functions → Update "API Reference" section
> - Change index strategy → Update "Index Strategy" section
> - Modify query/mutation patterns → Update "Conventions" section
> - Add scheduler usage → Update "Scheduler Usage" section
> - Change auth patterns → Update "Authentication" section

---

## Overview

The Convex backend provides a real-time, type-safe API for the Pomodoro app. All functions are automatically exposed as RPC endpoints with TypeScript types generated in `_generated/api.d.ts`.

**Key Features:**

- Real-time queries that auto-update on data changes
- Type-safe validators using `convex/values`
- Serverless execution with automatic scaling
- Built-in authentication via Clerk integration

---

## Schema Overview

### Tables

#### `users`

**Purpose:** User profiles and aggregate stats

**Fields:**

```typescript
{
  clerkId: string,              // Clerk user ID (unique, indexed)
  username: string,             // Generated or custom username
  avatarUrl?: string,           // Profile picture URL from Clerk
  createdAt: number,            // Account creation timestamp
  bestDailyStreak?: number,     // Historical best daily streak (never decreases)
}
```

**Indexes:**

- `by_clerk`: `["clerkId"]` - Primary lookup for authenticated requests

**Relationships:**

- One → Many `pomodoros`
- One → Many `userChallenges`
- One → One `timers`

---

#### `pomodoros`

**Purpose:** Completed pomodoro sessions

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key
  tag?: string,                 // Optional session label
  duration: number,             // Session length in seconds
  mode: "focus" | "break",      // Session type
  completedAt: number,          // Completion timestamp (ms)
}
```

**Indexes:**

- `by_user`: `["userId"]` - Get all user sessions
- `by_user_and_date`: `["userId", "completedAt"]` - Efficient date-range queries

**Design Notes:**

- Append-only (no edits/deletes to preserve gamification integrity)
- `completedAt` used for all date-based aggregations

---

#### `timers`

**Purpose:** User timer preferences

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key
  mode: "focus" | "break",      // Current mode
  focusDuration: number,        // Focus duration in seconds
  breakDuration: number,        // Break duration in seconds
  startedAt?: number,           // Timer start time (null if paused)
  remainingAtPause?: number,    // Time remaining when paused
  currentTag?: string,          // Tag for current session
  cyclesCompleted: number,      // Legacy field (not actively used)
  updatedAt: number,            // Last update timestamp
}
```

**Indexes:**

- `by_user`: `["userId"]` - One timer per user

---

#### `challenges`

**Purpose:** Challenge definitions (admin-managed)

**Fields:**

```typescript
{
  name: string,                 // Challenge display name
  description: string,          // Challenge description
  type: "streak" | "daily" | "weekly" | "monthly" | "recurring_monthly" | "total",
  target: number,               // Pomodoros required to complete
  badge: string,                // Lucide icon name or emoji
  recurring: boolean,           // True for resettable challenges
  recurringMonth?: number,      // 1-12 for recurring_monthly type
  active: boolean,              // Only active challenges shown
  createdAt: number,            // Creation timestamp
}
```

**Indexes:**

- `by_active`: `["active"]` - Filter active challenges efficiently

**Challenge Types:**

- `total`: Complete X pomodoros all-time
- `streak`: X consecutive days with 1+ pomodoro (uses best historical)
- `daily`: X pomodoros today
- `weekly`: X pomodoros this week
- `monthly`: X pomodoros this month
- `recurring_monthly`: X pomodoros in specific month (e.g., January)

---

#### `userChallenges`

**Purpose:** User progress on challenges

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key
  challengeId: Id<"challenges">, // Foreign key
  progress: number,             // Current progress count
  completed: boolean,           // True when progress >= target
  completedAt?: number,         // Completion timestamp
  periodKey?: string,           // "2025-01" for recurring monthly
}
```

**Indexes:**

- `by_user`: `["userId"]` - Get all user challenges
- `by_user_and_challenge`: `["userId", "challengeId"]` - Lookup specific challenge
- `by_user_completed`: `["userId", "completed"]` - Filter by completion status

---

#### `levelConfig`

**Purpose:** Global level configuration

**Fields:**

```typescript
{
  level: number,                // Level number (1, 2, 3, ...)
  title: string,                // Level title ("Beginner", "Focused", ...)
  threshold: number,            // Total pomodoros needed
}
```

**Indexes:**

- `by_level`: `["level"]` - Ordered lookup for progression

---

### Table Relationships Diagram

```
users
  ├─< pomodoros (by_user)
  ├─< userChallenges (by_user) ─> challenges (by_active)
  └─< timers (by_user)

levelConfig (global, no relations)
```

---

## API Reference

### Queries

#### `users.ts`

##### `getMe`

**Purpose:** Get current user's profile

**Arguments:** None

**Returns:** `User | null`

**Example:**

```typescript
const user = useQuery(api.users.getMe);
```

**Auth:** Required (returns null if not authenticated)

---

#### `pomodoros.ts`

##### `getMyPomodoros`

**Purpose:** Get user's pomodoro history

**Arguments:**

```typescript
{
  limit?: number  // Default: 50, max sessions to return
}
```

**Returns:** `Array<Pomodoro>` (sorted by `completedAt` desc)

**Example:**

```typescript
const sessions = useQuery(api.pomodoros.getMyPomodoros, { limit: 100 });
```

**Auth:** Required (returns empty array if not authenticated)

---

##### `getTodayCount`

**Purpose:** Get count of pomodoros completed today

**Arguments:** None

**Returns:** `number`

**Example:**

```typescript
const todayCount = useQuery(api.pomodoros.getTodayCount);
```

**Auth:** Required (returns 0 if not authenticated)

---

#### `stats.ts`

##### `getStats`

**Purpose:** Get comprehensive user statistics

**Arguments:** None

**Returns:**

```typescript
{
  total: { count: number, minutes: number },
  week: { count: number, minutes: number },
  month: { count: number, minutes: number },
  year: { count: number, minutes: number },
  dailyStreak: number,          // Current consecutive days
  weeklyStreak: number,         // Current consecutive weeks (5+ pomos/week)
  bestDailyStreak: number,      // Historical best (never decreases)
}
```

**Example:**

```typescript
const stats = useQuery(api.stats.getStats);
```

**Auth:** Required

**Side Effects:** Updates `user.bestDailyStreak` if new record achieved

---

##### `getActivity`

**Purpose:** Get daily activity for past year (heatmap data)

**Arguments:** None

**Returns:** `Array<{ date: string, count: number, minutes: number }>`

**Example:**

```typescript
const activity = useQuery(api.stats.getActivity);
// Returns: [{ date: "2025-01-15", count: 5, minutes: 125 }, ...]
```

**Auth:** Required

---

#### `challenges.ts`

##### `getActiveChallenges`

**Purpose:** Get all active challenges (admin-approved)

**Arguments:** None

**Returns:** `Array<Challenge>`

**Example:**

```typescript
const challenges = useQuery(api.challenges.getActiveChallenges);
```

**Auth:** Not required (public data)

---

##### `getUserChallenges`

**Purpose:** Get user's challenge progress

**Arguments:** None

**Returns:**

```typescript
{
  active: Array<Challenge & { progress: number, completed: boolean }>,
  completed: Array<Challenge & { progress: number, completed: boolean, completedAt: number }>
}
```

**Example:**

```typescript
const { active, completed } = useQuery(api.challenges.getUserChallenges);
```

**Auth:** Required (returns empty arrays if not authenticated)

---

##### `getAdminChallenges`

**Purpose:** Get all challenges (active and inactive) - admin only

**Arguments:** None

**Returns:** `Array<Challenge>`

**Example:**

```typescript
const allChallenges = useQuery(api.challenges.getAdminChallenges);
```

**Auth:** Required + admin email in `ADMIN_EMAILS`

**Throws:** `"Not authorized"` if not admin

---

#### `levels.ts`

##### `getLevelConfig`

**Purpose:** Get level progression configuration

**Arguments:** None

**Returns:** `Array<{ level: number, title: string, threshold: number }>`

**Example:**

```typescript
const levels = useQuery(api.levels.getLevelConfig);
```

**Auth:** Not required (public configuration)

---

### Mutations

#### `users.ts`

##### `ensureUser`

**Purpose:** Create user if doesn't exist (called on first sign-in)

**Arguments:**

```typescript
{
  firstName?: string,           // From Clerk
  lastName?: string,            // From Clerk
  avatarUrl?: string,           // From Clerk
}
```

**Returns:**

```typescript
{
  userId: Id<"users">,
  username: string,
  isNew: boolean,               // True if user was just created
}
```

**Example:**

```typescript
const ensureUser = useMutation(api.users.ensureUser);
const { userId, username, isNew } = await ensureUser({
  firstName: "John",
  lastName: "Doe",
  avatarUrl: "https://...",
});
```

**Auth:** Required

**Side Effects:**

- Creates user with unique generated username
- Idempotent (safe to call multiple times)

**Error Cases:**

- `"Not authenticated"` - No valid JWT

---

#### `pomodoros.ts`

##### `saveSession`

**Purpose:** Save completed pomodoro session

**Arguments:**

```typescript
{
  mode: "focus" | "break",
  duration: number,             // Seconds
  tag?: string,                 // Optional label
  completedAt: number,          // Timestamp (ms)
}
```

**Returns:** `Id<"pomodoros">` (session ID)

**Example:**

```typescript
const saveSession = useMutation(api.pomodoros.saveSession);
const sessionId = await saveSession({
  mode: "focus",
  duration: 1500,
  tag: "Deep Work",
  completedAt: Date.now(),
});
```

**Auth:** Required

**Side Effects:**

- If `mode === "focus"`, schedules `updateChallengeProgress` (async)

**Error Cases:**

- `"Not authenticated"` - No valid JWT
- `"User not found - call ensureUser first"` - User doesn't exist in DB

---

#### `timers.ts`

##### `savePreferences`

**Purpose:** Save user's timer preferences

**Arguments:**

```typescript
{
  focusDuration: number,        // Seconds
  breakDuration: number,        // Seconds
  cyclesCompleted: number,      // Legacy field
}
```

**Returns:** `Id<"timers">` (timer ID)

**Example:**

```typescript
const savePrefs = useMutation(api.timers.savePreferences);
await savePrefs({
  focusDuration: 1500,
  breakDuration: 300,
  cyclesCompleted: 0,
});
```

**Auth:** Required

---

#### `challenges.ts`

##### `syncMyProgress`

**Purpose:** Force challenge progress recalculation

**Arguments:** None

**Returns:** `void`

**Example:**

```typescript
const syncProgress = useMutation(api.challenges.syncMyProgress);
await syncProgress();
```

**Auth:** Required

**Side Effects:** Calls internal `updateChallengeProgress`

**Use Case:** Manual sync after bulk session upload

---

##### `createChallenge` (Admin)

**Purpose:** Create new challenge

**Arguments:**

```typescript
{
  name: string,
  description: string,
  type: "streak" | "daily" | "weekly" | "monthly" | "recurring_monthly" | "total",
  target: number,
  badge: string,
  recurring: boolean,
  recurringMonth?: number,      // Required if type === "recurring_monthly"
  active: boolean,
}
```

**Returns:** `Id<"challenges">`

**Example:**

```typescript
const createChallenge = useMutation(api.challenges.createChallenge);
await createChallenge({
  name: "First Steps",
  description: "Complete your first pomodoro",
  type: "total",
  target: 1,
  badge: "🎯",
  recurring: false,
  active: true,
});
```

**Auth:** Required + admin

---

##### `updateChallenge` (Admin)

**Purpose:** Update existing challenge

**Arguments:**

```typescript
{
  id: Id<"challenges">,
  name: string,
  description: string,
  type: "streak" | ...,
  target: number,
  badge: string,
  recurring: boolean,
  recurringMonth?: number,
  active: boolean,
}
```

**Returns:** `Id<"challenges">`

**Auth:** Required + admin

---

##### `deleteChallenge` (Admin)

**Purpose:** Delete challenge (soft delete via `active: false`)

**Arguments:**

```typescript
{
  id: Id<"challenges">;
}
```

**Returns:** `void`

**Auth:** Required + admin

---

#### `levels.ts`

##### `setLevelConfig` (Admin)

**Purpose:** Update level progression configuration

**Arguments:**

```typescript
{
  levels: Array<{ level: number; title: string; threshold: number }>;
}
```

**Returns:** `void`

**Example:**

```typescript
const setLevelConfig = useMutation(api.levels.setLevelConfig);
await setLevelConfig({
  levels: [
    { level: 1, title: "Beginner", threshold: 1 },
    { level: 2, title: "Focused", threshold: 5 },
    { level: 3, title: "Dedicated", threshold: 10 },
  ],
});
```

**Auth:** Required + admin

**Side Effects:** Deletes existing config, replaces with new

---

### Internal Mutations (Scheduler)

#### `challenges.ts`

##### `updateChallengeProgress` (Internal)

**Purpose:** Recalculate all challenge progress for a user

**Trigger:** Scheduled after `saveSession` mutation

**Arguments:**

```typescript
{
  userId: Id<"users">;
}
```

**Logic:**

- Fetches all user pomodoros
- Calculates progress for each active challenge
- Creates/updates `userChallenges` records
- Marks challenges as completed when `progress >= target`

**Note:** Uses `bestDailyStreak` for streak challenges (never decreases)

---

## Conventions

### Naming

- **Queries:** `getX`, `listX`, `findX`, `getMyX`
- **Mutations:** `createX`, `updateX`, `deleteX`, `saveX`, `ensureX`
- **Internal:** Exported as `internalMutation` or `internalQuery`
- **Admin:** Prefix with `admin` or check `ADMIN_EMAILS` in handler

### Authentication

All authenticated functions follow this pattern:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();

if (!user) throw new Error("User not found");
```

**Note:** `identity.subject` contains Clerk user ID (verified by JWT)

### Error Handling

- **Throw errors** for exceptional cases (client catches and displays)
- **Return empty arrays/null** for expected missing data
- **Descriptive messages** for debugging

Examples:

```typescript
// Bad
throw new Error("Error");

// Good
throw new Error("User not found - call ensureUser first");
```

### Validation

Always use Convex validators at function entry:

```typescript
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

---

## Index Strategy

### Why These Indexes?

**`users.by_clerk`:**

- Used on every authenticated request
- Enables O(log n) lookup instead of O(n) scan

**`pomodoros.by_user_and_date`:**

- Compound index for efficient date-range queries
- Stats calculations filter by user then date range

**`challenges.by_active`:**

- Most queries only need active challenges
- Avoids filtering inactive challenges client-side

### Common Query Patterns

#### Pattern 1: User-scoped queries

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

**Used for:** Session history, preferences lookup

#### Pattern 2: Date-range queries

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
  .filter((p) => p.completedAt >= startDate && p.completedAt < endDate)
  .collect();
```

**Used for:** Stats (daily/weekly/monthly), activity heatmap

### Adding New Indexes

**When to add:**

- Query doing full table scan (check Convex dashboard)
- Frequent filter on non-indexed field
- Performance degradation with data growth

**How to add:**

1. Update `schema.ts`
2. Push schema: `npx convex dev`
3. Convex auto-builds index (no manual migration)

---

## Scheduler Usage

### Current Scheduled Tasks

**Challenge Progress Update:**

- **Triggered by:** `saveSession` mutation (when `mode === "focus"`)
- **Delay:** 0ms (runs immediately after mutation completes)
- **Function:** `internal.challenges.updateChallengeProgress`
- **Purpose:** Recalculate all challenge progress asynchronously

### Scheduling Pattern

```typescript
await ctx.scheduler.runAfter(delayMs, internal.module.function, args);
```

**Benefits:**

- Keeps primary mutation fast
- Automatic retries on failure
- Idempotent execution

**Gotchas:**

- Slight delay before UI reflects changes (~100-500ms)
- Must use `internal` functions (not public mutations)

---

## Testing

### Test Files

- `users.test.ts` - User creation and username generation

### Running Tests

```bash
npm run test
```

### Test Patterns

**Convex Test Pattern:**

```typescript
import { convexTest } from "convex-test";
import schema from "./schema";

test("ensureUser creates unique usernames", async () => {
  const t = convexTest(schema);
  // Test implementation
});
```

**Best Practices:**

- Test edge cases (duplicate usernames, empty names)
- Use `convexTest` for integration tests
- Mock `ctx.auth.getUserIdentity()` for auth tests

---

## Development Workflow

### Running Locally

```bash
npx convex dev
```

This starts the development server and watches for changes.

### Pushing Schema Changes

Schema changes push automatically when running `npx convex dev`.

**Migration strategy:**

- **Additive changes** (new tables, new fields): Zero downtime
- **Renames/deletes**: Requires manual migration (see Convex docs)

### Debugging

**Console logs:**

```typescript
console.log("User created:", user);
```

Logs appear in Convex dashboard (Functions → Logs)

**Error stack traces:**

- Full stack traces in Convex dashboard
- Client receives error message only (not stack)

---

## Environment Variables

Set in Convex dashboard (Settings → Environment Variables):

- `ADMIN_EMAILS` - Comma-separated admin emails for auth checks
- `CLERK_ISSUER_URL` - Clerk JWT issuer (auto-configured)

**Local development:**

- Uses deployment's environment variables
- No local `.env` needed for Convex

---

## Common Tasks

### Adding a New Table

1. Add to `schema.ts`:

   ```typescript
   notifications: defineTable({
     userId: v.id("users"),
     message: v.string(),
     read: v.boolean(),
     createdAt: v.number(),
   }).index("by_user", ["userId"]),
   ```

2. Schema auto-pushes (if `npx convex dev` running)

3. Update **ARCHITECTURE.md** Data Model section

4. Update this README's Schema Overview

### Adding a New Function

1. Create function in appropriate file:

   ```typescript
   // convex/notifications.ts
   export const getMyNotifications = query({
     args: {},
     handler: async (ctx) => {
       // Implementation
     },
   });
   ```

2. Import in client:

   ```typescript
   import { api } from "@/convex/_generated/api";
   const notifications = useQuery(api.notifications.getMyNotifications);
   ```

3. Update this README's API Reference

### Modifying Schema

**Safe changes:**

- Adding optional fields: `v.optional(v.string())`
- Adding new tables
- Adding indexes

**Requires migration:**

- Changing field types
- Removing fields
- Renaming tables

**Migration pattern:**

```typescript
// Add new field with default
oldField: v.optional(v.string()),
newField: v.string(), // Fails if oldField is null

// Instead:
newField: v.optional(v.string()), // Add as optional
// Later: backfill data, then make required
```

---

## Related Documentation

- [Convex Documentation](https://docs.convex.dev)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design overview
- [schema.ts](./schema.ts) - Complete database schema
- [AI_CONTEXT.md](../AI_CONTEXT.md) - AI agent instructions

---

## Questions?

For Convex-specific questions:

1. Check [Convex Discord](https://convex.dev/community)
2. Review function comments in source files
3. See ARCHITECTURE.md for design decisions
