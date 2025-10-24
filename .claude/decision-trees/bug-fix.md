# Bug Fix Decision Tree

> Systematic approach to debugging and fixing issues

---

## 🔍 Step 1: Reproduce the Bug

### Can you reproduce it?

**YES** → Continue to Step 2

**NO** → Gather more information:

- [ ] What steps did the user take?
- [ ] What's their environment? (browser, device, network)
- [ ] Is it intermittent? (timing, race condition)
- [ ] Can you reproduce in production? staging? local?

---

## 📊 Step 2: Gather Evidence

### Browser Console

```bash
# Open browser DevTools (F12)
# Check Console tab for errors
```

**Look for:**

- JavaScript errors
- Network request failures
- React warnings
- Convex connection issues

### Network Tab

```bash
# DevTools → Network tab
# Reproduce issue
```

**Look for:**

- Failed API calls (red status codes)
- Slow queries (> 1s)
- Missing requests (auth token issues)

### Convex Logs

```bash
npx convex logs
# Or in Convex dashboard
```

**Look for:**

- Function errors
- Authentication failures
- Query/mutation errors
- Unexpected behavior

### Git History

```bash
git log --oneline -20
git log -p -- path/to/file.ts
```

**Look for:**

- Recent changes to affected code
- Related commits
- When bug was introduced

---

## 🎯 Step 3: Identify Root Cause

### Frontend Issue?

**Symptoms:**

- UI not updating
- Component not rendering
- Event handler not firing
- State not updating

**Common causes:**

- Missing dependency in useEffect
- Incorrect state management
- Component not re-rendering
- Event handler not bound correctly

**Debug:**

```typescript
console.log("State:", myState);
console.log("Props:", props);
console.log("Query data:", data);
```

**Go to:** Step 4 (Frontend Fixes)

---

### Backend Issue?

**Symptoms:**

- Query returns wrong data
- Mutation fails
- Authentication error
- Slow performance

**Common causes:**

- Missing authentication check
- Query without index (full table scan)
- Incorrect query logic
- Missing error handling

**Debug:**

```typescript
// In Convex function
console.log("User:", user);
console.log("Query result:", result);
console.log("Args:", args);
```

**Go to:** Step 5 (Backend Fixes)

---

### Database Issue?

**Symptoms:**

- Missing data
- Inconsistent data
- Schema mismatch
- Index not working

**Common causes:**

- Schema not pushed
- Migration incomplete
- Wrong index used
- Data not synced

**Go to:** Step 6 (Database Fixes)

---

### Sync Issue?

**Symptoms:**

- Data not syncing from browser to cloud
- Offline mode broken
- Sessions lost
- Duplicate entries

**Common causes:**

- Sync logic bug
- Network failure not handled
- localStorage quota exceeded
- Race condition in sync

**Go to:** Step 7 (Sync Fixes)

---

## 🔧 Step 4: Frontend Fixes

### UI Not Updating

**Check:**

1. Is query returning `undefined` (still loading)?
2. Is component wrapped in `<Suspense>` if needed?
3. Are dependencies correct in `useEffect`?
4. Is state being mutated directly? (use `setState`)

**Fix:**

```typescript
// Add loading state
if (data === undefined) return <Loading />;

// Ensure dependencies are correct
useEffect(() => {
  // ...
}, [dependency1, dependency2]);

// Don't mutate state directly
// ❌ Bad
state.push(item);
setState(state);

// ✅ Good
setState([...state, item]);
```

### Event Not Firing

**Check:**

1. Is event handler function defined?
2. Is it passed correctly (not called immediately)?
3. Is element enabled/clickable?

**Fix:**

```typescript
// ❌ Bad - calls immediately
<button onClick={handleClick()}>

// ✅ Good - passes function
<button onClick={handleClick}>
<button onClick={() => handleClick(arg)}>
```

---

## 🗄️ Step 5: Backend Fixes

### Query Returns Wrong Data

**Check:**

1. Is query using correct index?
2. Is filter logic correct?
3. Is user filter applied?

**Fix:**

```typescript
// Always use indexes
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", q => q.eq("userId", user._id))
  .collect();

// Check filter logic
.filter((p) => {
  console.log("Checking:", p);  // Debug
  return p.completedAt >= startDate;
})
```

### Mutation Fails

**Check:**

1. Is authentication working?
2. Are validators correct?
3. Is error being thrown?

**Fix:**

```typescript
// Better error messages
if (!user) {
  throw new Error("User not found - call ensureUser first");
}

// Validate business logic
if (args.target < 1) {
  throw new Error("Target must be at least 1");
}
```

### Slow Performance

**Check Convex dashboard for:**

- Full table scans (add indexes)
- Large result sets (add pagination)
- Expensive calculations (cache results)

**Fix:**

```typescript
// Add index
// In schema.ts
.index("by_user_and_date", ["userId", "completedAt"])

// Add pagination
.take(50)

// Cache in user record
await ctx.db.patch(user._id, {
  cachedValue: expensiveCalculation,
});
```

---

## 🗃️ Step 6: Database Fixes

### Schema Not Updated

**Fix:**

```bash
# Restart Convex dev
npx convex dev

# Check schema pushed
# Look for "Schema pushed" message
```

### Missing Data

**Check:**

1. Was mutation successful?
2. Is query filtering correctly?
3. Is data in correct table?

**Debug in Convex dashboard:**

- Open Data tab
- Browse tables
- Verify data exists

### Inconsistent Data

**May need migration:**

```typescript
// Create migration script
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

---

## 🔄 Step 7: Sync Fixes

### Sessions Not Syncing

**Check:**

1. Is user authenticated?
2. Is localStorage accessible?
3. Are network requests succeeding?
4. Is sync logic running?

**Debug:**

```typescript
// In app/page.tsx sync logic
console.log("Unsynced sessions:", getUnsyncedSessions());
console.log("Sync result:", result);
```

**Fix:**

```typescript
// Add retry logic
try {
  await saveSession(session);
  markAsSynced(session.id);
} catch (error) {
  console.error("Sync failed, will retry:", error);
  scheduleRetry();
}
```

### Duplicate Entries

**Check:**

1. Is duplicate prevention working?
2. Are multiple sync attempts happening?

**Fix:**

```typescript
// In saveSession mutation
const recentDuplicate = await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .filter(
    (p) => p.mode === args.mode && Math.abs(p.completedAt - args.completedAt) < 1000 // 1 second window
  )
  .first();

if (recentDuplicate) {
  return recentDuplicate._id; // Don't create duplicate
}
```

---

## ✅ Step 8: Verify Fix

### Testing Checklist:

- [ ] Bug no longer reproduces
- [ ] Fix works in dev environment
- [ ] Fix works in production (if deployed)
- [ ] No new bugs introduced
- [ ] Related functionality still works
- [ ] Error handling improved
- [ ] Performance not degraded

### Manual Testing:

1. Reproduce original bug scenario
2. Verify fix works
3. Test edge cases
4. Test error conditions
5. Test on mobile (if relevant)
6. Test offline (if relevant)

### Automated Testing:

**Add regression test:**

```typescript
test("bug XYZ - prevents duplicate sessions", async () => {
  // Test that verifies bug is fixed
  // Prevents regression in future
});
```

---

## 📝 Step 9: Document Fix

### Update Code:

- [ ] Add comments explaining non-obvious fixes
- [ ] Improve error messages
- [ ] Add validation if missing

### Update Documentation:

- [ ] Update architecture docs (if pattern changed)
- [ ] Update API docs (if function behavior changed)
- [ ] Add to troubleshooting guide (if common issue)

### Commit Message:

```
Fix: [Brief description of bug]

Problem: [What was broken]
Cause: [Root cause identified]
Solution: [What was changed]

Tested: [How you verified the fix]
```

---

## 🎯 Prevention

### Add Error Handling

```typescript
try {
  await riskyOperation();
} catch (error) {
  console.error("Operation failed:", error);
  throw new Error("User-friendly error message");
}
```

### Add Validation

```typescript
// Validate input
if (!isValid(input)) {
  throw new Error("Invalid input: must be...");
}

// Validate state
if (!user) {
  throw new Error("User required for this operation");
}
```

### Add Logging

```typescript
// Strategic logging for debugging
console.log("Starting sync:", { sessionCount, userId });
console.log("Sync complete:", { synced, failed });
```

---

## 🚨 Common Bug Patterns

### Authentication Issues

**Problem:** "User not found" errors

**Solution:** Ensure `ensureUser` called after Clerk sign-in

---

### Query Performance

**Problem:** Slow or timing out

**Solution:** Add indexes, check for full table scans in dashboard

---

### Race Conditions

**Problem:** Intermittent failures, inconsistent state

**Solution:** Add proper state management, use Convex transactions

---

### Background Tab Throttling

**Problem:** Timer doesn't complete in background

**Solution:** Use Page Visibility API, sync on focus

---

**Remember:** Always reproduce first, understand second, fix third, test fourth!
