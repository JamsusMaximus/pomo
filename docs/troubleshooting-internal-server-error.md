# Troubleshooting: Internal Server Error

## Problem

The dev server on `localhost:3000` shows "Internal Server Error" after making code changes.

## Root Cause

**Corrupted Next.js build cache (`.next` directory)**

This happens when:

- Code changes conflict with cached build artifacts
- Turbopack cache becomes stale
- Build process was interrupted mid-compilation
- Hot reload fails to update properly

## Quick Fix (Recommended)

```bash
npm run dev:clean
```

This automated script:

1. Kills any process on port 3000
2. Removes the `.next` cache directory
3. Restarts the dev server

## Manual Fix

If you prefer to do it manually:

```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Clean the cache
rm -rf .next

# Restart dev server
npm run dev
```

## Prevention

### Best Practices

1. **Use `npm run dev:clean` when encountering errors** - It handles cache and port cleanup automatically
2. **Clean cache when switching branches** - Run `rm -rf .next` before switching to a different branch
3. **Don't kill terminal forcefully** - Use Ctrl+C to gracefully stop the dev server
4. **Check for background processes** - Run `lsof -ti:3000` to see if processes are still running

### When to Clean Cache

- After pulling code changes from git
- When seeing "Internal Server Error"
- When hot reload stops working
- After installing new dependencies
- When seeing module not found errors that shouldn't exist

## Scripts Available

| Command                     | Purpose                               |
| --------------------------- | ------------------------------------- |
| `npm run dev`               | Normal dev server start               |
| `npm run dev:clean`         | Clean cache + kill port + restart     |
| `bash scripts/clean-dev.sh` | Manual clean script (without restart) |

## Preventive Measures Implemented

✅ Created `scripts/clean-dev.sh` - Automated cleanup script
✅ Added `npm run dev:clean` command - One-command recovery
✅ Updated Build Error Agent documentation - Added Internal Server Error pattern
✅ Documented troubleshooting steps - This file

## Related Issues

- Corrupted build cache
- Port already in use (EADDRINUSE)
- ENOENT errors for build manifest files
- Module not found errors

## When to Escalate

If `npm run dev:clean` doesn't resolve the issue, try:

1. **Nuclear option** - Full clean reinstall:

   ```bash
   rm -rf .next node_modules package-lock.json
   npm install
   npm run dev
   ```

2. **Check environment variables**:

   ```bash
   env | grep -E 'NEXT_|CONVEX_|CLERK_'
   ```

3. **Review recent code changes** - The error might be caused by actual code issues, not just cache

## Additional Resources

- [Build Error Agent](.claude/agents/build-error-agent.md) - Comprehensive troubleshooting guide
- [Next.js Turbopack](https://nextjs.org/docs/app/api-reference/cli/create-next-app#--turbopack) - Official docs
