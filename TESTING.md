# Testing Guide

## Test Suite

This project includes comprehensive backend tests for Convex functions.

### Test Files

- `convex/users.test.ts` - User authentication and profile tests (13 tests)
- `convex/pomodoros.test.ts` - Pomodoro session management tests (15 tests)

### Test Coverage

The `convex/pomodoros.test.ts` file includes tests for:

- ✅ Saving focus and break sessions
- ✅ Session counting (daily, total)
- ✅ Duplicate detection (prevents double-counting)
- ✅ Tag handling and privacy
- ✅ Authentication checks
- ✅ Edge cases (rapid sessions, timing windows)

## Known Issue: Test Framework Compatibility

⚠️ **Current Status**: Tests cannot run due to a compatibility issue between `convex-test@0.0.38` and `vitest`.

### The Problem

`convex-test` uses Node.js's `fs.glob()` API (added in Node 20.10.0), but this function is not properly exposed in vitest's worker environment, even when using:

- `pool: "forks"` (process isolation)
- `vitest@1.6.0` (matching convex-test's peer dependency)
- Setup files and polyfills

### Error Message

```
TypeError: (intermediate value).glob is not a function
  at moduleCache (convex-test/dist/index.js:1015:53)
```

### Attempted Solutions

1. ✅ Downgraded vitest from 3.x → 2.x → 1.6.x
2. ✅ Renamed vitest.config.ts → vitest.config.mts (ES modules)
3. ✅ Configured `pool: "forks"` for full Node.js API access
4. ✅ Disabled CSS/PostCSS processing
5. ✅ Created fs.glob() polyfill in setup file
6. ❌ None of these resolved the issue

### Workarounds

Until this is resolved, consider:

1. **Manual Testing** - Run pomodoros in development and verify:
   - Network tab shows `saveSession` mutation succeeds
   - `getTodayCount` query returns correct value
   - Browser console shows no errors

2. **Production Monitoring** - Check Convex logs for errors:

   ```bash
   npx convex logs --prod
   ```

3. **Report to Convex** - File an issue: https://github.com/get-convex/convex-test/issues

## Original Bug Report

**Issue**: Second pomodoro of the day didn't save. Tab was in background when timer completed, break was already 4min in, count still showed 1 pomo.

**Hypothesis**: JavaScript execution throttling in background tabs may delay:

- Timer completion callback
- Session save mutation
- State updates

**Code Analysis** (convex/pomodoros.ts:saveSession):

- ✅ Has duplicate detection (1-second window)
- ✅ Proper authentication checks
- ✅ Auto-syncs challenges after save
- ⚠️ No explicit handling for background tab delays

**Recommendation**: Add diagnostic logging in app/page.tsx:

- Line 308: When saveCompletedSession is called
- Line 352: When sessions state updates
- Line 99: When cyclesCompleted recalculates

Then reproduce the issue and check browser console for timing information.

## Future Work

Once test framework compatibility is resolved:

1. Run the full test suite: `npm test`
2. Add E2E tests for background tab behavior
3. Test rapid session completion scenarios
4. Verify challenge auto-sync works correctly
