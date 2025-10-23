# Convex Quick Lookup

> Ultra-fast API reference - one-liners for common tasks

## 🔎 I need to...

### User Operations

| Task               | Code                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| Get current user   | `useQuery(api.users.getMe)`                                              |
| Create/ensure user | `await mutate(api.users.ensureUser, { firstName, lastName, avatarUrl })` |

### Pomodoro Sessions

| Task                       | Code                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Get my sessions (limit 50) | `useQuery(api.pomodoros.getMyPomodoros, { limit: 50 })`                                                              |
| Get today's count          | `useQuery(api.pomodoros.getTodayCount)`                                                                              |
| Get tag suggestions        | `useQuery(api.pomodoros.getTagSuggestions)`                                                                          |
| Save completed session     | `await mutate(api.pomodoros.saveSession, { mode: "focus", duration: 1500, tag: "coding", completedAt: Date.now() })` |
| Update session tag         | `await mutate(api.pomodoros.updateSessionTag, { sessionId, tag: "new tag" })`                                        |

### Statistics

| Task                 | Code                              |
| -------------------- | --------------------------------- |
| Get all stats        | `useQuery(api.stats.getStats)`    |
| Get activity heatmap | `useQuery(api.stats.getActivity)` |

### Challenges

| Task                     | Code                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Get active challenges    | `useQuery(api.challenges.getActiveChallenges)`                                                                |
| Get my progress          | `useQuery(api.challenges.getUserChallenges)`                                                                  |
| Force sync progress      | `await mutate(api.challenges.syncMyProgress)`                                                                 |
| Create challenge (admin) | `await mutate(api.challenges.createChallenge, { name, description, type, target, badge, recurring, active })` |

### Timer Preferences

| Task             | Code                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Save preferences | `await mutate(api.timers.savePreferences, { focusDuration: 1500, breakDuration: 300, cyclesCompleted: 0 })` |

### Levels

| Task                     | Code                                                         |
| ------------------------ | ------------------------------------------------------------ |
| Get level config         | `useQuery(api.levels.getLevelConfig)`                        |
| Set level config (admin) | `await mutate(api.levels.setLevelConfig, { levels: [...] })` |

---

## 📦 Common Patterns

### Query with Loading

```typescript
const data = useQuery(api.module.function);
if (data === undefined) return <Loading />;
return <Display data={data} />;
```

### Mutation with Error Handling

```typescript
const mutate = useMutation(api.module.function);
try {
  await mutate(args);
} catch (error) {
  toast.error(error.message);
}
```

### Conditional Query

```typescript
const data = useQuery(user ? api.module.function : "skip", user ? args : "skip");
```

---

## 🔑 Authentication Pattern

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();
if (!user) throw new Error("User not found");
```

---

## 🗄️ Database Tables

| Table            | Purpose               | Key Index                                                                   |
| ---------------- | --------------------- | --------------------------------------------------------------------------- |
| `users`          | User profiles         | `by_clerk: ["clerkId"]`                                                     |
| `pomodoros`      | Completed sessions    | `by_user: ["userId"]`<br>`by_user_and_date: ["userId", "completedAt"]`      |
| `timers`         | Timer preferences     | `by_user: ["userId"]`                                                       |
| `challenges`     | Challenge definitions | `by_active: ["active"]`                                                     |
| `userChallenges` | User progress         | `by_user: ["userId"]`<br>`by_user_and_challenge: ["userId", "challengeId"]` |
| `levelConfig`    | Level progression     | `by_level: ["level"]`                                                       |

---

## 🎯 Common Return Types

### Stats Object

```typescript
{
  total: { count: number, minutes: number },
  week: { count: number, minutes: number },
  month: { count: number, minutes: number },
  year: { count: number, minutes: number },
  dailyStreak: number,
  weeklyStreak: number,
  bestDailyStreak: number,
}
```

### User Challenges

```typescript
{
  active: Challenge[],      // With progress/completed fields
  completed: Challenge[],   // With progress/completed/completedAt fields
}
```

### Activity Entry

```typescript
{
  date: string,      // "2025-10-23"
  count: number,     // Number of sessions
  minutes: number,   // Total minutes
}
```

---

## ⚡ Performance Tips

- **Always use indexes:** `.withIndex("index_name", q => q.eq("field", value))`
- **Limit results:** `.take(50)` or `{ limit: 50 }` parameter
- **Skip unnecessary queries:** `condition ? api.function : "skip"`
- **Check dashboard:** Look for full table scans

---

## 🚨 Common Errors

| Error               | Fix                             |
| ------------------- | ------------------------------- |
| "Not authenticated" | User not signed in via Clerk    |
| "User not found"    | Call `ensureUser` after sign-in |
| Slow query          | Add index in `schema.ts`        |
| "Not authorized"    | Check `ADMIN_EMAILS` env var    |

---

## 📚 Full Documentation

- [Complete API Reference](./API.md)
- [Schema Documentation](./SCHEMA.md)
- [Patterns & Best Practices](./PATTERNS.md)
- [Convex README](./README.md)

---

**Pro Tip:** Use `npx convex dashboard` to test functions interactively!
