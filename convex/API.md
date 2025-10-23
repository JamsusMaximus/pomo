# Convex API Reference

> **Last Updated:** 2025-10-23
> **Purpose:** Complete reference for all Convex functions (queries, mutations, actions)

---

## API Overview

All functions are type-safe and automatically generate TypeScript types in `_generated/api.d.ts`.

**Usage pattern:**

```typescript
import { api } from "@/convex/_generated/api";

// In component
const data = useQuery(api.module.functionName, args);
const mutate = useMutation(api.module.functionName);
```

---

## Queries

### `users.ts`

#### `getMe`

**Purpose:** Get current user's profile

**Arguments:** None

**Returns:** `User | null`

**Example:**

```typescript
const user = useQuery(api.users.getMe);
```

**Auth:** Required (returns null if not authenticated)

**Use case:** Display user profile, check authentication status

---

### `pomodoros.ts`

#### `getMyPomodoros`

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

**Use case:** Display recent session history, session feed

---

#### `getTodayCount`

**Purpose:** Get count of focus pomodoros completed today

**Arguments:** None

**Returns:** `number`

**Example:**

```typescript
const todayCount = useQuery(api.pomodoros.getTodayCount);
```

**Auth:** Required (returns 0 if not authenticated)

**Use case:** Display daily progress, today's goal tracking

---

#### `getTagSuggestions`

**Purpose:** Get previously used tags with usage counts

**Arguments:** None

**Returns:** `Array<{ tag: string, count: number }>`

**Example:**

```typescript
const tags = useQuery(api.pomodoros.getTagSuggestions);
// Returns: [{ tag: "coding", count: 25 }, { tag: "reading", count: 10 }, ...]
```

**Auth:** Required

**Use case:** Tag autocomplete, tag suggestions dropdown

---

### `stats.ts`

#### `getStats`

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

**Use case:** Profile page statistics, progress tracking

---

#### `getActivity`

**Purpose:** Get daily activity for past year (heatmap data)

**Arguments:** None

**Returns:** `Array<{ date: string, count: number, minutes: number }>`

**Example:**

```typescript
const activity = useQuery(api.stats.getActivity);
// Returns: [{ date: "2025-01-15", count: 5, minutes: 125 }, ...]
```

**Auth:** Required

**Use case:** Activity heatmap, visual focus graph

---

### `challenges.ts`

#### `getActiveChallenges`

**Purpose:** Get all active challenges (admin-approved)

**Arguments:** None

**Returns:** `Array<Challenge>`

**Example:**

```typescript
const challenges = useQuery(api.challenges.getActiveChallenges);
```

**Auth:** Not required (public data)

**Use case:** Display available challenges to all users

---

#### `getUserChallenges`

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

**Use case:** Profile page challenges section, progress tracking

---

#### `getAdminChallenges` (Admin)

**Purpose:** Get all challenges (active and inactive) - admin only

**Arguments:** None

**Returns:** `Array<Challenge>`

**Example:**

```typescript
const allChallenges = useQuery(api.challenges.getAdminChallenges);
```

**Auth:** Required + admin email in `ADMIN_EMAILS`

**Throws:** `"Not authorized"` if not admin

**Use case:** Admin panel challenge management

---

### `levels.ts`

#### `getLevelConfig`

**Purpose:** Get level progression configuration

**Arguments:** None

**Returns:** `Array<{ level: number, title: string, threshold: number }>`

**Example:**

```typescript
const levels = useQuery(api.levels.getLevelConfig);
```

**Auth:** Not required (public configuration)

**Use case:** Calculate user level, display level progression

---

## Mutations

### `users.ts`

#### `ensureUser`

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

- Creates user with unique generated username (e.g., "focused-dragon-42")
- Idempotent (safe to call multiple times)

**Error Cases:**

- `"Not authenticated"` - No valid JWT token

**Use case:** Called immediately after Clerk sign-in

---

### `pomodoros.ts`

#### `saveSession`

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
- Updates user's total session count

**Duplicate Prevention:** Sessions within 1 second with same mode are considered duplicates

**Error Cases:**

- `"Not authenticated"` - No valid JWT
- `"User not found - call ensureUser first"` - User doesn't exist in DB

**Use case:** Sync completed session from browser to cloud

---

#### `updateSessionTag`

**Purpose:** Update tag on existing session (retroactive editing)

**Arguments:**

```typescript
{
  sessionId: Id<"pomodoros">,
  tag: string,                  // New tag value
}
```

**Returns:** `Id<"pomodoros">` (same session ID)

**Example:**

```typescript
const updateTag = useMutation(api.pomodoros.updateSessionTag);
await updateTag({
  sessionId: session._id,
  tag: "Updated tag",
});
```

**Auth:** Required (can only edit own sessions)

**Error Cases:**

- `"Not authenticated"`
- `"Session not found or unauthorized"` - Trying to edit another user's session

**Use case:** Edit tags on recent sessions retrospectively

---

### `timers.ts`

#### `savePreferences`

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

**Use case:** Sync user's custom timer durations across devices

---

### `challenges.ts`

#### `syncMyProgress`

**Purpose:** Force challenge progress recalculation

**Arguments:** None

**Returns:** `void`

**Example:**

```typescript
const syncProgress = useMutation(api.challenges.syncMyProgress);
await syncProgress();
```

**Auth:** Required

**Side Effects:** Calls internal `updateChallengeProgress` to recalculate all challenges

**Use case:** Manual sync after bulk session upload, troubleshooting challenge issues

---

#### `createChallenge` (Admin)

**Purpose:** Create new challenge

**Arguments:**

```typescript
{
  name: string,
  description: string,
  type: "streak" | "daily" | "weekly" | "monthly" | "recurring_monthly" | "total",
  target: number,
  badge: string,                // Lucide icon name or emoji
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

**Error Cases:**

- `"Not authorized"` - User is not admin

**Use case:** Admin panel challenge creation

---

#### `updateChallenge` (Admin)

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

**Use case:** Edit challenge properties via admin panel

---

#### `deleteChallenge` (Admin)

**Purpose:** Soft delete challenge (sets `active: false`)

**Arguments:**

```typescript
{
  id: Id<"challenges">;
}
```

**Returns:** `void`

**Auth:** Required + admin

**Note:** This is a soft delete - challenge record remains but becomes inactive

**Use case:** Retire old challenges without breaking user progress history

---

### `levels.ts`

#### `setLevelConfig` (Admin)

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

**Side Effects:** Deletes existing config, replaces with new (atomic operation)

**Use case:** Configure level progression via admin panel

---

## Internal Mutations (Scheduler)

These are called by Convex scheduler, not directly by clients.

### `challenges.ts`

#### `updateChallengeProgress` (Internal)

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

**Delay:** Runs immediately (0ms) but asynchronously

---

## Function Call Patterns

### Query with Loading State

```typescript
const data = useQuery(api.module.function);

if (data === undefined) return <Loading />;
if (data === null) return <NotAuthenticated />;
return <Display data={data} />;
```

### Mutation with Error Handling

```typescript
const mutate = useMutation(api.module.function);

try {
  const result = await mutate(args);
  console.log("Success:", result);
} catch (error) {
  console.error("Error:", error);
  toast.error(error.message);
}
```

### Conditional Queries

```typescript
const data = useQuery(user ? api.module.function : "skip", user ? args : "skip");
```

---

## Error Handling

All Convex functions throw errors for exceptional cases. Client should catch and display appropriately.

### Common Error Messages

| Error Message         | Cause                               | Solution                |
| --------------------- | ----------------------------------- | ----------------------- |
| `"Not authenticated"` | No valid JWT token                  | Redirect to sign-in     |
| `"User not found"`    | User exists in Clerk but not Convex | Call `ensureUser`       |
| `"Not authorized"`    | Admin action by non-admin           | Check admin permissions |
| `"Session not found"` | Invalid session ID                  | Verify session exists   |

---

## Performance Tips

### Pagination

For large datasets, use limit parameter:

```typescript
const sessions = useQuery(api.pomodoros.getMyPomodoros, { limit: 20 });
```

### Conditional Fetching

Skip queries when data not needed:

```typescript
const stats = useQuery(showProfile ? api.stats.getStats : "skip");
```

### Debounce Mutations

For frequent updates, debounce on client side:

```typescript
const debouncedSave = useMemo(() => debounce((data) => savePreferences(data), 1000), []);
```

---

## Related Documentation

- [Schema Reference](./SCHEMA.md) - Database tables and relationships
- [Patterns & Conventions](./PATTERNS.md) - Best practices
- [Quick Lookup](./QUICK_LOOKUP.md) - Fast reference

---

Need to add a new function? See [Patterns & Conventions](./PATTERNS.md#adding-new-functions) for guidelines.
