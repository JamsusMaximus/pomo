# ARCHITECTURE.md

> **Last Updated:** 2025-10-08
> **Maintainers:** All contributors
> **Purpose:** System design, data flow, and architectural decisions

> **🤖 UPDATE TRIGGERS:**
>
> - Adding/removing a database table → Update "Data Model" section
> - Adding external service integration → Update "Tech Stack" and "Integration Details" sections
> - Changing auth flow → Update "Authentication & Authorization" section
> - Modifying offline sync strategy → Update "Offline-First Design" section
> - Changing state management approach → Update "State Management" section
> - Major performance optimization → Update "Performance Considerations" section
> - New architectural pattern introduced → Add to "Architecture Patterns" section

---

## Overview

Pomo is a full-featured Pomodoro timer web application built with an **offline-first, real-time sync architecture**. The system prioritizes:

1. **Offline capability** - Works without internet, syncs when available
2. **Real-time data** - Instant updates across devices via Convex
3. **Gamification** - Levels, challenges, and badges for motivation
4. **Type safety** - End-to-end TypeScript with strict validation

The architecture follows a **hybrid local/cloud pattern**: critical timer functionality works entirely offline in the browser, with optional cloud sync for authenticated users.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 15 (App Router) + React 19
- **UI Library:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS 4 with CSS-in-JS variables
- **Animations:** Framer Motion
- **Icons:** Lucide React

**Rationale:**

- Next.js 15 App Router provides RSC (React Server Components) for better initial loads
- shadcn/ui offers accessible, customizable components without bundle bloat
- Tailwind CSS 4 uses native CSS features (cascade layers) for better performance
- Framer Motion enables smooth, performant animations for gamification UX

### Backend

- **Platform:** Convex
- **Database:** Convex (real-time document database)
- **Functions:** Serverless queries, mutations, and actions
- **Validation:** Convex validators (`convex/values`)

**Rationale:**

- Convex eliminates need for separate API layer, database, and WebSocket server
- Built-in real-time subscriptions automatically update UI on data changes
- Type-safe RPC functions generate TypeScript types automatically
- Serverless execution scales automatically without infrastructure management

### Authentication

- **Provider:** Clerk
- **Method:** OAuth + JWT tokens
- **Integration:** Native Convex + Clerk integration

**Rationale:**

- Clerk handles complex auth flows (OAuth, MFA, user management)
- Seamless integration with Convex via JWT validation
- Pre-built UI components reduce development time

### Additional Services

- **Analytics:** Vercel Analytics (web vitals and page views)
- **AI:** Anthropic Claude Haiku (optional changelog generation tool)
- **Deployment:** Vercel (Next.js) + Convex Cloud (backend)

---

## Data Model

### Entity Relationship Overview

```
users (1) ──< (N) pomodoros
  │
  ├──< (N) userChallenges ──> (1) challenges
  └──< (1) timers

levelConfig (global configuration)
```

### Tables

#### `users`

**Purpose:** User profiles and aggregated stats

```typescript
{
  clerkId: string,              // Clerk user ID (unique)
  username: string,             // Generated or custom username
  avatarUrl?: string,           // Profile picture URL
  createdAt: number,            // Account creation timestamp
  bestDailyStreak?: number,     // Historical best daily streak (never decreases)
}
```

**Indexes:**

- `by_clerk`: `["clerkId"]` - Fast lookup by Clerk user ID (used on every authenticated request)

**Relationships:**

- One user → Many pomodoros (focus/break sessions)
- One user → Many userChallenges (challenge progress)
- One user → One timer (preferences)

---

#### `pomodoros`

**Purpose:** Completed pomodoro sessions (both focus and break)

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

- Stores completed sessions only (active timers tracked client-side)
- `completedAt` used for date-based queries (daily/weekly/monthly stats)
- No soft deletes (users can't delete history to maintain gamification integrity)

---

#### `timers`

**Purpose:** User timer preferences and state

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

---

#### `challenges`

**Purpose:** Challenge definitions (admin-managed)

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

- `total`: Complete X pomodoros all-time
- `streak`: Maintain X days with 1+ pomodoro (uses best historical streak)
- `daily`: Complete X pomodoros today
- `weekly`: Complete X pomodoros this week
- `monthly`: Complete X pomodoros this month
- `recurring_monthly`: Complete X in a specific month (e.g., "Focused February")

---

#### `userChallenges`

**Purpose:** User progress on challenges

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
- `by_user_and_challenge`: `["userId", "challengeId"]` - Check specific challenge
- `by_user_completed`: `["userId", "completed"]` - Filter completed/incomplete

**Design Notes:**

- Created on-demand when user makes progress
- `periodKey` enables recurring monthly challenges (new record per period)
- Completed challenges never reset (for total/streak types)

---

#### `levelConfig`

**Purpose:** Level thresholds and titles (global configuration)

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

- Configurable via admin panel
- XP = pomodoros × 100 (calculated client-side)
- Default progression: 1, 5, 10, 25, 50, 100, 250 pomodoros

---

## Architecture Patterns

### Offline-First with Optimistic Sync

**Description:** App functions fully offline, syncing to cloud when available

**Implementation:**

1. Timer runs entirely in browser (`useTimer` hook)
2. On completion, session saved to `localStorage` immediately
3. If signed in, session uploaded to Convex in background
4. On success, local session marked as `synced: true`
5. On failure, retry with exponential backoff (2s, 4s, 8s)

**Benefits:**

- Zero-latency for critical path (timer completion)
- Works on flaky networks
- No data loss on network failures

**Trade-offs:**

- Duplicate sync logic (client + server)
- Potential for sync bugs if not careful

**Code:**

- `lib/storage/sessions.ts` - Local storage layer
- `app/page.tsx` (lines 296-416) - Sync mechanism with retry logic

---

### Server-Triggered Side Effects

**Description:** Use Convex scheduler for async operations after mutations

**Used in:**

- Challenge progress updates after pomodoro completion
- Streak calculations after stats query

**Example:**

```typescript
// In pomodoros.ts mutation
await ctx.scheduler.runAfter(0, internal.challenges.updateChallengeProgress, {
  userId: user._id,
});
```

**Benefits:**

- Mutations stay fast (don't wait for challenge recalculation)
- Retries handled automatically by Convex
- Idempotent by design

**Trade-offs:**

- Slight delay before challenge updates visible (~100-500ms)
- Must handle race conditions

---

### Real-time Reactive Queries

**Description:** Convex queries auto-update when underlying data changes

**Implementation:**

- React components use `useQuery(api.stats.getStats)`
- Convex re-runs query when dependencies change
- React automatically re-renders with fresh data

**Benefits:**

- No manual cache invalidation needed
- Instant updates across browser tabs/devices
- Minimal code (no WebSocket boilerplate)

**Trade-offs:**

- Limited control over update frequency
- Can cause unnecessary re-renders if not memoized

---

## Authentication & Authorization

### User Authentication Flow

1. User clicks "Signup / Signin" → Clerk modal opens
2. User authenticates via Clerk (email, OAuth, etc.)
3. Clerk issues JWT token stored in cookies
4. Next.js middleware validates JWT on every request
5. Convex receives JWT via `Authorization` header
6. Convex validates JWT and extracts `ctx.auth.getUserIdentity()`

### User Creation Flow

1. User signs in for first time
2. Frontend calls `ensureUser` mutation
3. Mutation checks if user exists via `clerkId` index
4. If not, creates user with generated username
5. Returns user object to client

**Code:** `convex/users.ts` (lines 15-50)

### Authorization Patterns

#### Client-side (Next.js)

```typescript
// Check auth status
const { isSignedIn, user } = useUser();

// Conditional rendering
<SignedIn>...</SignedIn>
<SignedOut>...</SignedOut>
```

#### Server-side (Convex)

```typescript
// All authenticated mutations/queries
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();

if (!user) throw new Error("User not found");
```

#### Admin Access

```typescript
// Check if user is admin
const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
const isAdmin = identity.email && adminEmails.includes(identity.email);
```

**Environment:** `ADMIN_EMAILS` set in Convex dashboard (comma-separated)

---

## Offline-First Design

### Strategy

The app follows a **"local-first, cloud-sync"** pattern:

1. **Local State**: Timer and session data stored in `localStorage`
2. **Cloud State**: Convex stores authoritative data when online
3. **Sync**: One-way sync from local → cloud (local never overwritten)

### Local Storage Schema

#### Sessions Storage

**Key:** `pomodoro-sessions`

**Structure:**

```typescript
Array<{
  id: string; // Unique ID (timestamp + random)
  mode: "focus" | "break";
  duration: number;
  tag?: string;
  completedAt: number;
  synced: boolean; // True = uploaded to Convex
}>;
```

#### Preferences Storage

**Key:** `pomodoro-prefs`

**Structure:**

```typescript
{
  focusDuration: number,        // Default: 1500 (25 min)
  breakDuration: number,        // Default: 300 (5 min)
  lastMode: "focus" | "break",
  cyclesCompleted: number,      // Legacy, not used
}
```

### Sync Mechanism

#### Sync Triggers

1. **On Sign-in:** User authenticates → sync all unsynced sessions
2. **On Page Load:** App loads + user already signed in → silent sync
3. **Periodic:** Every 60 seconds if unsynced sessions exist
4. **Tab Focus:** User returns to tab → check for unsynced sessions

**Code:** `app/page.tsx` (lines 368-415)

#### Sync Process

```
┌──────────────────┐
│ getUnsyncedSessions() │
└────────┬─────────┘
         │
         ▼
   ┌─────────────┐
   │ Upload each  │
   │ to Convex    │
   └────┬────────┘
        │
        ▼
   ┌─────────────────┐
   │ All successful? │
   └─┬──────────┬────┘
     │ Yes      │ No
     ▼          ▼
┌────────┐  ┌───────────────┐
│ Mark as│  │ Retry (2s, 4s,│
│ synced │  │ 8s backoff)   │
└────────┘  └───────────────┘
```

#### Retry Logic

- **Max retries:** 3
- **Backoff:** Exponential (2s, 4s, 8s)
- **User feedback:** Toast notification shows sync status
- **Manual retry:** Button appears on error

**Code:** `app/page.tsx` (lines 296-362)

### Conflict Resolution

**Current strategy:** Last-write-wins (server always accepts client data)

**Rationale:**

- Pomodoro sessions are append-only (no edits)
- Each session has unique client-generated ID
- No scenario where same session uploaded twice

**Future consideration:**
If multi-device timer sync added, would need CRDTs or vector clocks

---

## State Management

### Client State

**Tool:** React hooks + `useState` / `useReducer`

**Pattern:** Component-local state for UI, lifted to page level when needed

**Persisted State:**

- Timer preferences → `localStorage` + Convex
- Completed sessions → `localStorage` + Convex

### Server State

**Tool:** Convex queries (`useQuery`, `useMutation`)

**Caching Strategy:**

- Convex handles all caching internally
- Queries are reactive (auto-update on data changes)
- No manual cache invalidation needed

**Invalidation:**

- Automatic when underlying data changes
- Example: Completing pomodoro → triggers stats recalculation → UI updates

### Derived State

**Levels/XP:**

- Calculated from total pomodoro count
- Client-side: `lib/levels.ts` (fallback)
- Server-side: `convex/levels.ts` (authoritative)

**Streaks:**

- Calculated on-demand in `stats.ts` query
- Uses `bestDailyStreak` to prevent loss on streak break

---

## Performance Considerations

### Key Optimizations

#### 1. Index-First Queries

All Convex queries use indexes to avoid full table scans:

```typescript
// Good: Uses index
await ctx.db
  .query("pomodoros")
  .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
  .filter((p) => p.completedAt >= startOfWeek)
  .collect();

// Bad: Full table scan
await ctx.db
  .query("pomodoros")
  .filter((p) => p.userId === user._id)
  .collect();
```

#### 2. Local-First Timer

Timer runs in browser (no server polling):

- Uses `setInterval` for countdown
- Only touches server on completion
- Eliminates 99.9% of potential API calls

#### 3. Optimistic UI Updates

Sessions added to UI immediately (before Convex confirms):

```typescript
const localSession = saveCompletedSession("focus", duration, tag);
setSessions([...sessions, localSession]); // Instant UI update

saveSession(...).then(() => {
  markSessionsSynced([localSession.id]); // Background sync
});
```

#### 4. Selective Re-renders

Framer Motion animations memoized to prevent layout thrashing:

```typescript
const hasAnimatedProgress = useState(false);
// Initial animation runs once, subsequent updates are smooth
```

### Known Bottlenecks

#### 1. Stats Calculation (High Session Count)

**Issue:** `getStats` query recalculates streaks on every call

**Impact:** Slow for users with 1000+ pomodoros

**Potential Solution:**

- Cache streak calculation in user record
- Recompute only when sessions added

#### 2. Challenge Progress Updates

**Issue:** Every pomodoro triggers challenge recalculation (all challenges)

**Impact:** ~200ms latency on pomodoro completion

**Potential Solution:**

- Incremental updates (only affected challenges)
- Background job to recalculate overnight

---

## Security Considerations

### Data Protection

1. **Authentication Required:** All user data queries check `ctx.auth.getUserIdentity()`
2. **Row-Level Security:** Queries filtered by `userId` (users can't access others' data)
3. **No Direct DB Access:** Convex enforces access via functions only

### Input Validation

**Server-side (Convex):**

```typescript
export const saveSession = mutation({
  args: {
    mode: v.union(v.literal("focus"), v.literal("break")),
    duration: v.number(),
    tag: v.optional(v.string()),
    completedAt: v.number(),
  },
  // ... function body
});
```

**Client-side:**

- Form inputs sanitized
- Timer can't be set to negative values
- Max tag length enforced (implicit via UI)

### Rate Limiting

**Current:** Relying on Convex's built-in rate limits

**Future consideration:**

- Per-user rate limits for session creation (prevent abuse)
- Admin-only mutations require email whitelist

### Environment Variables

**Client (.env.local):**

- `NEXT_PUBLIC_CONVEX_URL` - Safe to expose
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Safe to expose

**Server (Convex Dashboard):**

- `ADMIN_EMAILS` - Server-side only
- `CLERK_ISSUER_URL` - Server-side only

**Never commit:** `.env.local` (gitignored)

---

## Key Architectural Constraints

### Technical Constraints

1. **localStorage Limit (5-10MB):**
   - **Implication:** Can store ~10,000 sessions before hitting limit
   - **Mitigation:** Sync deletes local sessions after 30 days

2. **Convex Query Timeout (5 seconds):**
   - **Implication:** Large stats queries might timeout
   - **Mitigation:** Paginate session queries, limit history range

3. **Next.js App Router (RSC):**
   - **Implication:** Client components must be marked `"use client"`
   - **Benefit:** Smaller client bundles for non-interactive pages

### Design Trade-offs

#### Trade-off 1: Local Timer vs. Server Timer

**Chosen:** Local (client-side) timer

**Benefits:**

- Works offline
- No server polling overhead
- Instant responsiveness

**Sacrificed:**

- Can't sync active timer across devices
- Timer can be manipulated in dev tools (acceptable for personal app)

#### Trade-off 2: Append-Only Sessions vs. Editable

**Chosen:** Append-only (no editing/deleting sessions)

**Benefits:**

- Simpler sync logic
- Maintains gamification integrity
- Prevents cheating

**Sacrificed:**

- Can't fix mistakes (e.g., wrong tag)
- No "undo" for completed sessions

#### Trade-off 3: Best Streak Never Decreases

**Chosen:** Store `bestDailyStreak` separately, never decreases

**Benefits:**

- Users don't lose progress on bad weeks
- Encourages long-term engagement

**Sacrificed:**

- Not "true" current streak
- More complex logic for challenges

---

## Future Considerations

### Planned Improvements

1. **Multi-device Timer Sync:**
   - Use Convex's real-time updates to sync active timer
   - Show "Timer running on another device" toast

2. **Session Analytics:**
   - Tag-based insights (which tags = most focus)
   - Time-of-day heatmap (when are you most productive?)

3. **Team Features:**
   - Shared team challenges
   - Leaderboards
   - Pomodoro "parties" (sync sessions with friends)

4. **Performance:**
   - Pagination for session history (virtual scrolling)
   - Cache stats calculation for high-volume users

### Potential Migrations

1. **Database:**
   - Convex → PostgreSQL (if need complex joins)
   - Would lose real-time updates, need WebSockets

2. **Auth:**
   - Clerk → NextAuth (if cost becomes issue)
   - Would lose pre-built UI components

---

## Related Documentation

- [README.md](./README.md) - User-facing project overview
- [convex/README.md](./convex/README.md) - Backend API and schema reference
- [AI_CONTEXT.md](./AI_CONTEXT.md) - Instructions for AI agents
- [SETUP.md](./SETUP.md) - Development environment setup

---

## Questions?

For architectural decisions not covered here:

1. Check git history (`git log -p -- [file]`)
2. Look for comments in code
3. Ask in project discussions
