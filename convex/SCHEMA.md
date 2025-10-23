# Convex Schema Documentation

> **Last Updated:** 2025-10-23
> **Purpose:** Complete database schema reference

## Overview

The Convex schema defines all database tables, their fields, and relationships. All schema changes automatically push when running `npx convex dev`.

---

## Table Relationships

```
users (1) ──< (N) pomodoros
  │
  ├──< (N) userChallenges ──> (1) challenges
  └──< (1) timers

levelConfig (global configuration)
```

---

## Tables

### `users`

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

- `by_clerk`: `["clerkId"]` - Primary lookup for authenticated requests (O(log n))

**Relationships:**

- One user → Many `pomodoros` (focus/break sessions)
- One user → Many `userChallenges` (challenge progress)
- One user → One `timers` (preferences)

**Design Notes:**

- `bestDailyStreak` is historical maximum, never decreases
- `username` is generated on creation (e.g., "focused-dragon-42")
- `clerkId` is the authoritative identity (from JWT)

---

### `pomodoros`

**Purpose:** Completed pomodoro sessions (both focus and break)

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key to users table
  tag?: string,                 // Optional label (e.g., "coding", "reading")
  duration: number,             // Session length in seconds
  mode: "focus" | "break",      // Session type
  completedAt: number,          // Completion timestamp (ms since epoch)
}
```

**Indexes:**

- `by_user`: `["userId"]` - Get all sessions for a user
- `by_user_and_date`: `["userId", "completedAt"]` - Efficient date-range queries for stats

**Design Notes:**

- Append-only (no edits/deletes to preserve gamification integrity)
- `completedAt` used for all date-based aggregations
- `tag` can be added retroactively via edit feature
- Only `focus` mode sessions count toward challenges

---

### `timers`

**Purpose:** User timer preferences and state

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key to users table
  mode: "focus" | "break",      // Current mode
  focusDuration: number,        // Focus duration in seconds (default: 1500)
  breakDuration: number,        // Break duration in seconds (default: 300)
  startedAt?: number,           // Timer start time (null if paused)
  remainingAtPause?: number,    // Time remaining when paused
  currentTag?: string,          // Tag for current focus session
  cyclesCompleted: number,      // Total cycles (legacy, not actively used)
  updatedAt: number,            // Last update timestamp
}
```

**Indexes:**

- `by_user`: `["userId"]` - One timer per user

**Design Notes:**

- Stores preferences for sync across devices
- Server-side timer state mostly deprecated (client-side is source of truth)
- Kept for future multi-device timer synchronization
- Default durations: 25min focus, 5min break

---

### `challenges`

**Purpose:** Challenge definitions (admin-managed)

**Fields:**

```typescript
{
  name: string,                 // Challenge display name
  description: string,          // Challenge description
  type: "streak" | "daily" | "weekly" | "monthly" | "recurring_monthly" | "total",
  target: number,               // Number of pomodoros required
  badge: string,                // Lucide icon name or emoji
  recurring: boolean,           // True for challenges that reset (daily/weekly/monthly)
  recurringMonth?: number,      // 1-12 for recurring_monthly challenges (e.g., 1 = January)
  active: boolean,              // Only active challenges shown to users
  createdAt: number,            // Challenge creation timestamp
}
```

**Indexes:**

- `by_active`: `["active"]` - Fast filtering of active challenges

**Challenge Types:**

| Type                | Description                                  | Reset Behavior              |
| ------------------- | -------------------------------------------- | --------------------------- |
| `total`             | Complete X pomodoros all-time                | Never resets                |
| `streak`            | Maintain X consecutive days with 1+ pomodoro | Uses best historical streak |
| `daily`             | Complete X pomodoros today                   | Resets daily                |
| `weekly`            | Complete X pomodoros this week               | Resets weekly (Monday)      |
| `monthly`           | Complete X pomodoros this month              | Resets monthly              |
| `recurring_monthly` | Complete X in specific month (e.g., January) | Resets yearly               |

**Design Notes:**

- Only `active: true` challenges shown to users
- `recurring_monthly` uses `periodKey` for tracking (format: "YYYY-MM")
- Badge can be Lucide icon name (e.g., "Trophy") or emoji (e.g., "🏆")
- Streak challenges use `bestDailyStreak` (never penalize lost streaks)

---

### `userChallenges`

**Purpose:** User progress on challenges

**Fields:**

```typescript
{
  userId: Id<"users">,          // Foreign key to users table
  challengeId: Id<"challenges">, // Foreign key to challenges table
  progress: number,             // Current progress (e.g., 7 out of 10)
  completed: boolean,           // True when progress >= target
  completedAt?: number,         // When challenge was completed
  periodKey?: string,           // "2025-01" for recurring monthly challenges
}
```

**Indexes:**

- `by_user`: `["userId"]` - Get all challenges for a user
- `by_user_and_challenge`: `["userId", "challengeId"]` - Check specific challenge progress
- `by_user_completed`: `["userId", "completed"]` - Filter completed/incomplete challenges

**Design Notes:**

- Created on-demand when user makes progress (not pre-created)
- `periodKey` enables recurring monthly challenges (new record per period)
- Completed challenges never reset for `total` and `streak` types
- `completed: true` is permanent (even if progress later changes)

---

### `levelConfig`

**Purpose:** Level thresholds and titles (global configuration)

**Fields:**

```typescript
{
  level: number,                // Level number (1, 2, 3, ...)
  title: string,                // Level title ("Beginner", "Focused", "Master")
  threshold: number,            // Total pomodoros needed to reach this level
}
```

**Indexes:**

- `by_level`: `["level"]` - Ordered lookup for level progression

**Design Notes:**

- Configurable via admin panel (`/admin`)
- XP = pomodoros × 100 (calculated client-side)
- Default progression: 1, 5, 10, 25, 50, 100, 250 pomodoros
- Changing thresholds doesn't affect user progress retroactively

---

## Schema Modification Guide

### Safe Changes (Zero Downtime)

- ✅ Adding new tables
- ✅ Adding optional fields: `v.optional(v.string())`
- ✅ Adding new indexes
- ✅ Changing field descriptions (comments only)

### Requires Migration

- ⚠️ Changing field types (e.g., `string` → `number`)
- ⚠️ Removing fields (orphans existing data)
- ⚠️ Renaming tables (breaks existing queries)
- ⚠️ Making optional fields required

### Migration Pattern

**Bad (breaks existing data):**

```typescript
// Before
oldField: v.string(),

// After (ERROR: existing records don't have newField)
newField: v.number(),
```

**Good (gradual migration):**

```typescript
// Step 1: Add as optional
newField: v.optional(v.number()),

// Step 2: Backfill existing records
// (Run migration script)

// Step 3: Make required (in future deployment)
newField: v.number(),
```

---

## Index Strategy

### Why These Indexes?

**`users.by_clerk`:**

- Used on every authenticated request
- Enables O(log n) lookup instead of O(n) scan
- Critical for performance

**`pomodoros.by_user_and_date`:**

- Compound index for efficient date-range queries
- Stats calculations filter by user then date range
- Supports weekly/monthly/yearly aggregations

**`challenges.by_active`:**

- Most queries only need active challenges
- Avoids filtering inactive challenges client-side
- Reduces network transfer

**`userChallenges.by_user_and_challenge`:**

- Fast lookup for specific challenge progress
- Used when displaying challenge details
- Prevents full table scan

### When to Add New Indexes

**Signals you need an index:**

- Query doing full table scan (check Convex dashboard)
- Frequent filter on non-indexed field
- Performance degradation as data grows
- Query timeout errors

**How to add:**

1. Update `schema.ts` with `.index("index_name", ["field1", "field2"])`
2. Push schema: `npx convex dev`
3. Convex auto-builds index (no manual migration needed)
4. Update this documentation

---

## Common Query Patterns

### Pattern 1: User-scoped queries

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

**Used for:** Session history, preferences lookup, user-specific data

### Pattern 2: Date-range queries

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
  .filter((p) => p.completedAt >= startDate && p.completedAt < endDate)
  .collect();
```

**Used for:** Stats (daily/weekly/monthly), activity heatmap, time-based aggregations

### Pattern 3: Filtering active records

```typescript
await ctx.db
  .query("challenges")
  .withIndex("by_active", (q) => q.eq("active", true))
  .collect();
```

**Used for:** Public-facing challenge lists, reducing unnecessary data transfer

---

## Related Documentation

- [API Reference](./API.md) - All Convex functions
- [Patterns & Conventions](./PATTERNS.md) - Best practices
- [Architecture](../ARCHITECTURE.md) - System design
- [schema.ts](./schema.ts) - Source code

---

## Schema Health Checklist

When reviewing schema changes:

- [ ] All new tables have appropriate indexes
- [ ] Foreign key relationships documented
- [ ] Migration strategy planned for breaking changes
- [ ] Related documentation updated (ARCHITECTURE.md, this file)
- [ ] Existing queries still work (test in dev)
- [ ] Performance impact considered (check query plans)

---

Need to modify the schema? See [Patterns & Conventions](./PATTERNS.md#modifying-schema) for best practices.
