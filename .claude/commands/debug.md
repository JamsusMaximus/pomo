---
description: Debug an issue systematically
---

Help me debug this issue systematically:

**Gather Information:**

1. What's the exact error message or unexpected behavior?
2. When does it occur? (specific user action, page, timing)
3. Can you reproduce it consistently?
4. Check browser console for errors
5. Check network tab for failed requests
6. Check Convex logs: `npx convex logs`

**Analyze:**

1. Identify the affected code path
2. Check recent changes (git log)
3. Review related functions/components
4. Check for common issues:
   - Missing authentication check
   - Query without index
   - Offline sync problem
   - Race condition
   - Missing error handling

**Fix:**

1. Propose solution with rationale
2. Implement fix
3. Add test to prevent regression
4. Verify fix works
5. Check for similar issues elsewhere

**Prevent:**

1. Update documentation if needed
2. Add error handling if missing
3. Improve error messages

Walk me through this debugging process.
