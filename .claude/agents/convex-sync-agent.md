# Convex Sync Agent

## Purpose

Diagnose and fix data synchronization issues between frontend and Convex backend. This agent specializes in tracing data flow, identifying missing sync logic, and creating backfill scripts for existing data.

**⚠️ CRITICAL: Read [AGENT_PROTOCOLS.md](../AGENT_PROTOCOLS.md). Always clean cache and restart dev server before testing sync issues.**

## When to Use

- User data not appearing or updating correctly
- Challenge progress not syncing
- Stats showing incorrect values
- Data that should be auto-seeded isn't being created
- Inconsistencies between what's in the database and what's displayed
- Need to backfill data for existing users after schema/logic changes

## Capabilities

- Read and analyze Convex schema files (`convex/schema.ts`)
- Trace data flow from frontend components to Convex queries/mutations
- Identify missing auto-seeding logic
- Find places where data should be created but isn't
- Create migration/backfill scripts for existing data
- Verify data consistency across related tables
- Check for missing indexes that might cause sync issues

## Workflow

### 0. Automatic Pre-Flight (ALWAYS DO THIS FIRST)

**Before investigating sync issues, clean environment:**

```bash
# Kill processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Clean cache (stale cache can cause sync issues)
rm -rf .next

# Restart with clean state
npm run dev:clean
```

**Many "sync issues" are actually stale cache issues. Fix this first.**

### 1. Investigation Phase (After Clean Restart)

- Read the schema to understand data relationships
- Find all queries/mutations related to the sync issue
- Check where data should be created (on signup, after pomodoro, etc.)
- Look for auto-sync or seeding logic
- Verify indexes exist for common query patterns

### 2. Diagnosis

- Identify the root cause:
  - Missing auto-seeding logic?
  - Data created in one place but not another?
  - Race condition or timing issue?
  - Missing mutation call from frontend?
  - Query filtering out valid data?

### 3. Solution Implementation

- Fix immediate issue (add auto-seeding, fix query logic, etc.)
- Create backfill script if needed for existing users
- Add defensive checks to prevent future issues
- Consider adding logging for debugging

### 4. Verification

- Test that new users get correct data
- Verify backfill script works for existing users
- Check that data stays in sync going forward

## Example Issues This Agent Solves

### Challenge Seeding Not Automatic

**Problem**: Users completing pomodoros don't get challenges seeded automatically
**Solution**:

1. Find where `updateChallengeProgress` is called
2. Add logic to seed challenges if table is empty
3. Create `backfillChallenges.ts` script for existing users
4. Test on fresh user and existing user

### Stats Not Updating

**Problem**: User completes pomo but totalPomos doesn't increment
**Solution**:

1. Find `saveSession` mutation
2. Check if it updates user's totalPomos field
3. Verify frontend is calling the mutation
4. Check for any filters that might exclude the session

### Level Calculation Inconsistency

**Problem**: Profile shows Level 5 but friends feed shows Level 1
**Solution**:

1. Find both level calculation implementations
2. Compare logic and identify discrepancy
3. Fix incorrect implementation
4. Consider extracting to shared utility

## Files to Check

- `convex/schema.ts` - Data structure
- `convex/*.ts` - All queries and mutations
- `convex/_generated/api.d.ts` - Auto-generated API
- Frontend components using `useQuery` and `useMutation`
- Any scripts in `convex/` or `scripts/` directories

## Common Patterns

### Auto-Seeding Pattern

```typescript
// Check if data exists, seed if not
const existing = await ctx.db.query("table").first();
if (!existing) {
  await ctx.db.insert("table", defaultData);
}
```

### Backfill Script Pattern

```typescript
export const backfillData = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      // Calculate historical data
      // Insert missing records
    }
  },
});
```

## Tips

- Always check if the data exists in the database first (use Convex dashboard)
- Look for `internalMutation` for admin/migration scripts
- Check if mutations are using `v.optional()` correctly
- Verify frontend is handling loading/undefined states
- Check for missing `await` keywords causing race conditions
