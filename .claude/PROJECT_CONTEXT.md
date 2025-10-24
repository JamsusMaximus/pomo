# Project Context for AI Agents

> **Quick reference for AI agents working on Pomo**
> **Last Updated:** 2025-10-23

## 📝 One-Paragraph Summary

Pomo is an **offline-first Pomodoro timer web app** built with Next.js 15, Convex (real-time backend), and Clerk (auth). The core architecture prioritizes local-first operation: timers run entirely in-browser with localStorage persistence, syncing to Convex when online. Features include gamification (levels, challenges, badges), social accountability pacts, and comprehensive statistics. The codebase emphasizes type safety (strict TypeScript), real-time reactivity (Convex queries auto-update), and progressive enhancement (works fully offline).

---

## 🎯 Key Architectural Decisions

### 1. Why Offline-First?

**Decision:** Timer and sessions stored in localStorage first, synced to cloud second.

**Rationale:**

- Zero latency for critical path (timer completion)
- Works on unreliable networks
- Better UX (no loading states for basic functionality)

**Implications:**

- Duplicate sync logic (client + server)
- Must handle sync failures gracefully
- Local storage is source of truth until sync confirms

### 2. Why Convex?

**Decision:** Use Convex instead of traditional REST API + database + WebSockets.

**Rationale:**

- Eliminates boilerplate (no API routes, no cache invalidation)
- Built-in real-time subscriptions
- Automatic TypeScript type generation
- Serverless execution (no infrastructure management)

**Implications:**

- Lock-in to Convex ecosystem
- Must understand Convex query model
- Limited control over caching behavior

### 3. Why Best Streak Never Decreases?

**Decision:** Store `bestDailyStreak` separately, never reset on missed days.

**Rationale:**

- Users stay motivated even after bad weeks
- Rewards long-term engagement
- Aligns with gamification psychology

**Implications:**

- More complex logic for streak challenges
- "Current streak" and "best streak" must be distinguished
- Historical best streak calculated from all sessions

### 4. Why Append-Only Sessions?

**Decision:** Pomodoro sessions cannot be edited or deleted.

**Rationale:**

- Simpler sync logic (no conflict resolution)
- Maintains gamification integrity
- Prevents cheating

**Implications:**

- No "undo" for mistakes
- Tags can't be changed after completion (but added via edit feature)
- Must handle user frustration with clear messaging

### 5. Why No Server-Side Timer?

**Decision:** Timer runs entirely client-side (no server polling).

**Rationale:**

- Works offline
- Zero server cost for timer operation
- Instant responsiveness

**Implications:**

- Can't sync active timer across devices
- Timer can be manipulated in dev tools (acceptable trade-off)
- Must handle background tab throttling

---

## 🚨 Top 5 Gotchas

### 1. **Convex Functions Need Indexes**

**Problem:** Queries without indexes do full table scans.

**Solution:** Always use `.withIndex()` for user-scoped queries.

**Example:**

```typescript
// ❌ Bad - full table scan
await ctx.db
  .query("pomodoros")
  .filter((p) => p.userId === user._id)
  .collect();

// ✅ Good - uses index
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

### 2. **Clerk Auth Requires ensureUser**

**Problem:** User exists in Clerk but not in Convex database.

**Solution:** Call `ensureUser` mutation after Clerk sign-in.

**Where:** `app/page.tsx`, triggered by Clerk webhook or manual call.

### 3. **Challenge Updates Are Async**

**Problem:** Completing pomodoro doesn't immediately show challenge progress.

**Why:** Challenge recalculation scheduled via `ctx.scheduler.runAfter()`.

**Impact:** ~100-500ms delay before UI updates.

### 4. **Background Tabs Throttle JavaScript**

**Problem:** Timer completion callback may be delayed in background tabs.

**Solution:** Use Web Workers for critical timers (future enhancement), or accept slight delays.

**Workaround:** Page Focus API triggers sync on tab focus.

### 5. **Best Streak Calculation is Expensive**

**Problem:** `getStats` query recalculates streaks from all sessions every time.

**Impact:** Slow for users with 1000+ pomodoros.

**Future Fix:** Cache streak calculation in user record, recompute only on new sessions.

---

## 🗺️ Essential Documentation

### For Understanding System

1. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Complete system design (800+ lines)
2. **[convex/README.md](../convex/README.md)** - Backend API reference
3. **[AI_CONTEXT.md](../AI_CONTEXT.md)** - Detailed agent instructions

### For Making Changes

1. **[docs/setup/development.md](../docs/setup/development.md)** - Local development setup
2. **[docs/testing/guide.md](../docs/testing/guide.md)** - Testing strategies
3. **[convex/QUICK_LOOKUP.md](../convex/QUICK_LOOKUP.md)** - Quick API reference

### For Specific Features

- **Offline Sync:** `lib/storage/sessions.ts`, `app/page.tsx:296-416`
- **Gamification:** `convex/challenges.ts`, `convex/levels.ts`
- **Authentication:** `convex/users.ts`, `middleware.ts`
- **Real-time Updates:** `convex/stats.ts`, uses Convex reactivity

---

## 🔧 Quick Command Reference

```bash
# Development
pnpm run dev              # Start Next.js + Convex
pnpm run verify-setup     # Check environment

# Code Quality
pnpm run lint:strict      # Lint with zero warnings
pnpm run typecheck        # TypeScript check
pnpm run test             # Run tests

# Database
npx convex dev            # Sync schema changes
npx convex dashboard      # Open Convex dashboard
npx convex logs           # View backend logs
```

---

## 📂 Where to Find Things

| Need to...                 | Look in...                          |
| -------------------------- | ----------------------------------- |
| **Modify timer logic**     | `app/page.tsx` (client-side timer)  |
| **Add Convex function**    | `convex/*.ts` (queries/mutations)   |
| **Change database schema** | `convex/schema.ts`                  |
| **Update UI component**    | `components/*.tsx`                  |
| **Fix offline sync**       | `lib/storage/sessions.ts`           |
| **Add challenge**          | `convex/challenges.ts`              |
| **Modify auth flow**       | `middleware.ts`, `convex/users.ts`  |
| **Update styles**          | `app/globals.css`, Tailwind classes |

---

## 🎨 Code Patterns to Follow

### Authentication in Convex

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();
if (!user) throw new Error("User not found");
```

### Offline-First Save

```typescript
// 1. Save to localStorage immediately
const localSession = saveCompletedSession("focus", duration, tag);

// 2. Update UI optimistically
setSessions([...sessions, localSession]);

// 3. Sync to Convex in background
saveSession(...).then(() => {
  markSessionsSynced([localSession.id]);
}).catch(handleSyncError);
```

### Using Indexes for Queries

```typescript
// Always use indexes for user-scoped queries
const sessions = await ctx.db
  .query("pomodoros")
  .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
  .filter((p) => p.completedAt >= startDate)
  .collect();
```

---

## 🛠️ Common Tasks

### Adding a New Convex Table

1. Update `convex/schema.ts`
2. Add indexes for common queries
3. Run `npx convex dev` (auto-pushes schema)
4. Update `ARCHITECTURE.md` → Data Model section
5. Update `convex/SCHEMA.md`

### Adding a New Feature

1. Check existing patterns first
2. Create component in `components/`
3. Add backend logic in `convex/`
4. Test offline behavior
5. Update relevant documentation
6. Add tests

### Fixing a Bug

1. Reproduce in dev environment
2. Check Convex logs: `npx convex logs`
3. Add test to prevent regression
4. Fix and verify in browser
5. Update docs if behavior changed

---

## 💡 Quick Tips

- **Documentation is mandatory** - Update docs as you code, not after
- **Always use indexes** - Check Convex dashboard for full table scans
- **Test offline mode** - Chrome DevTools → Network → Offline
- **Check mobile** - Use responsive mode or `pnpm run test:pages`
- **Watch Convex logs** - Real-time debugging: `npx convex logs`

---

## 🔗 Related Files

- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Ultra-condensed cheat sheet
- **[documentation-map.json](./documentation-map.json)** - Doc update triggers
- **[AGENT_PROTOCOLS.md](./AGENT_PROTOCOLS.md)** - Agent behavior guidelines

---

**Remember:** This is an offline-first app. Always consider what happens when network fails!
