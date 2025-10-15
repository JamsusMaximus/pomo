# Build Error Agent

## Purpose

Diagnose and fix build failures, dev server issues, and deployment problems. This agent specializes in cleaning corrupted caches, resolving port conflicts, and handling Next.js/Turbopack build issues.

## When to Use

- Build fails with cryptic errors
- Dev server shows "Internal Server Error"
- Port already in use errors
- ENOENT errors for build manifest files
- Turbopack compilation failures
- Module not found errors that shouldn't exist
- Dev server won't start
- Hot reload stops working

## Capabilities

- Clean build caches (`.next`, `node_modules/.cache`, etc.)
- Find and kill processes on specific ports
- Restart dev servers with correct environment variables
- Diagnose Next.js Turbopack build issues
- Fix module resolution problems
- Handle corrupted build manifests
- Verify environment variables are set correctly

## Workflow

### 1. Initial Diagnosis

- Check the error message type:
  - ENOENT (file not found) → Likely corrupted cache
  - EADDRINUSE (port in use) → Process still running
  - Module not found → Check imports or node_modules
  - TypeScript errors → Check types and dependencies

### 2. Common Fixes (Try in Order)

#### For Internal Server Error / ENOENT / Build Manifest Errors

```bash
# RECOMMENDED: Use the clean script (handles cache + port cleanup)
npm run dev:clean

# Manual clean and rebuild
rm -rf .next && npm run build

# If that doesn't work, also clean node_modules cache
rm -rf .next node_modules/.cache && npm run build

# Nuclear option
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### For Port Already in Use

```bash
# Find process on port
lsof -ti:PORT

# Kill it
lsof -ti:PORT | xargs kill -9

# Or both in one command
lsof -ti:PORT | xargs kill -9 && PORT=PORT npm run dev
```

#### For Dev Server Not Starting

```bash
# Check environment variables
env | grep -E 'NEXT_|CONVEX_|CLERK_'

# Restart with clean slate
rm -rf .next && npm run dev
```

### 3. Verification

- Build completes successfully
- Dev server starts and responds
- Hot reload works
- No console errors

## Common Error Patterns

### Pattern 1: Corrupted Build Cache / Internal Server Error

**Symptoms**:

- "Internal Server Error" in browser
- `ENOENT: no such file or directory, open '.next/server/...'`
- Random module not found errors
- Build worked before, now broken

**Solution**:

```bash
# Use the automated clean script
npm run dev:clean

# Or manual clean
rm -rf .next && npm run dev
```

### Pattern 2: Multiple Dev Servers

**Symptoms**:

- `EADDRINUSE: address already in use`
- Port conflict errors
- Previous dev server didn't shut down properly

**Solution**:

```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Pattern 3: Environment Variable Issues

**Symptoms**:

- "Cannot read property of undefined" for env vars
- Clerk/Convex not connecting
- Missing configuration errors

**Solution**:

```bash
# Check if .env.local exists and has required vars
cat .env.local

# Verify they're being loaded
env | grep NEXT_PUBLIC

# Restart dev server to reload env vars
```

### Pattern 4: Turbopack Compilation Failures

**Symptoms**:

- "Failed to compile"
- Webpack/Turbopack internal errors
- Memory issues

**Solution**:

```bash
# Try without turbopack
next dev

# Or increase memory
NODE_OPTIONS=--max-old-space-size=4096 npm run dev

# Or clean and restart
rm -rf .next && npm run dev
```

## Files to Check

- `.next/` - Build output (delete if corrupted)
- `next.config.js` - Next.js configuration
- `package.json` - Scripts and dependencies
- `.env.local` - Environment variables
- `node_modules/` - Dependencies (reinstall if corrupted)

## Automated Recovery Commands

### Quick Fix Script (Built-in)

The project now includes `npm run dev:clean` which automatically:

- Kills any process on port 3000
- Cleans the `.next` cache
- Restarts the dev server

**Use this first when you encounter dev server issues!**

```bash
npm run dev:clean
```

### Manual Quick Fix

```bash
#!/bin/bash
# Quick fix for most build issues

# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Clean build cache
rm -rf .next

# Restart dev server
npm run dev
```

### Nuclear Option Script

```bash
#!/bin/bash
# Complete reset when nothing else works

# Kill all node processes (use with caution!)
killall node 2>/dev/null || true

# Clean everything
rm -rf .next node_modules/.cache

# Reinstall if really needed
# rm -rf node_modules package-lock.json
# npm install

# Rebuild
npm run build
```

## Prevention Tips

- Always use `npm run dev` instead of manually starting processes
- Don't run multiple dev servers on the same port
- Commit `.env.example` but not `.env.local`
- Clean `.next` directory when switching branches
- Use `lsof -ti:PORT | xargs kill -9` before starting new dev server
- Check for background processes before closing terminal

## Port Reference

- 3000: Default Next.js dev server
- 3001: Alternative Next.js port
- 5001: Common backend port
- Check `package.json` scripts for project-specific ports

## When to Escalate

- Build errors persist after cleaning cache
- TypeScript errors that seem incorrect
- Dependency version conflicts
- Next.js framework bugs (check GitHub issues)
- Out of memory errors on production builds
