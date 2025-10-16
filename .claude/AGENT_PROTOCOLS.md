# Agent Protocols - Automatic Maintenance Rules

**All agents MUST follow these protocols automatically without user intervention.**

## Critical Rule: Cache Management

### Before ANY Build or Dev Server Operation

**ALWAYS run cache cleanup first:**

```bash
# Before npm run build
rm -rf .next && npm run build

# Before npm run dev
npm run dev:clean

# Before npm run test
rm -rf .next && npm run test
```

### When to Auto-Clean Cache

**Automatic triggers (NO user confirmation needed):**

1. **Before starting any build** - `rm -rf .next` before `npm run build`
2. **Before starting dev server** - Use `npm run dev:clean` instead of `npm run dev`
3. **After any code editing session** - Clean before restarting server
4. **When encountering ANY error** - First action is always `npm run dev:clean`
5. **After pulling/checking out code** - Clean cache proactively
6. **When switching between tasks** - Clean between major operations

## Port Management Protocol

### Before Starting Dev Server

**ALWAYS check and kill processes:**

```bash
# Check if port is in use
lsof -ti:3000

# If yes, kill it automatically (NO user confirmation)
lsof -ti:3000 | xargs kill -9

# Then start with clean cache
npm run dev:clean
```

### Automatic Port Recovery

If dev server fails to start:

1. Kill port 3000: `lsof -ti:3000 | xargs kill -9`
2. Kill port 3001: `lsof -ti:3001 | xargs kill -9`
3. Clean cache: `rm -rf .next`
4. Retry: `npm run dev`

**Do NOT ask user to do this manually.**

## Error Recovery Protocol

### On Any Error (Internal Server Error, Build Failure, etc.)

**Automatic recovery sequence:**

```bash
# Step 1: Kill all relevant processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Step 2: Clean all caches
rm -rf .next

# Step 3: Retry operation
npm run dev:clean  # or npm run build, depending on context
```

**Execute immediately. Do NOT:**

- Ask user if they want to clean cache
- Suggest user runs commands
- Wait for user approval
- Explain what might be wrong first

**Just fix it automatically.**

## Agent-Specific Auto-Actions

### Build Error Agent

- **ALWAYS** run `npm run dev:clean` before diagnosing
- **ALWAYS** kill ports before starting servers
- **NEVER** ask user to manually clean cache
- **AUTOMATICALLY** retry after cleaning

### Convex Sync Agent

- **ALWAYS** clean cache before testing sync
- **AUTOMATICALLY** restart dev server if sync fails
- **CHECK** for port conflicts before restarting

### General Purpose Agent

- **BEFORE** any `npm run dev`: use `npm run dev:clean` instead
- **BEFORE** any `npm run build`: run `rm -rf .next` first
- **AFTER** code changes: clean cache before testing

## Prevention Over Reaction

### Proactive Cache Cleaning

**Clean cache automatically:**

- After editing 5+ files
- Before running any tests
- After completing a feature implementation
- When starting a new task/session
- Every time you restart the dev server

### Pre-emptive Port Management

**Always verify ports are free:**

- Before starting any server
- After any error
- When switching between dev/build modes

## What NOT to Do

❌ **NEVER** assume cache is fine
❌ **NEVER** skip cleaning "to save time"
❌ **NEVER** ask user if they want to clean cache
❌ **NEVER** suggest user runs cleanup commands
❌ **NEVER** troubleshoot before cleaning cache first
❌ **NEVER** start dev server with `npm run dev` (use `npm run dev:clean`)

## What TO Do

✅ **ALWAYS** clean cache before builds/dev
✅ **ALWAYS** kill ports before starting servers
✅ **ALWAYS** use `npm run dev:clean` instead of `npm run dev`
✅ **ALWAYS** retry automatically after cleaning
✅ **ALWAYS** fix issues without user intervention
✅ **ALWAYS** assume cache is corrupted until proven otherwise

## Command Substitutions (Mandatory)

**Replace these commands automatically:**

| ❌ NEVER Use           | ✅ ALWAYS Use Instead           |
| ---------------------- | ------------------------------- |
| `npm run dev`          | `npm run dev:clean`             |
| `npm run build`        | `rm -rf .next && npm run build` |
| Manual troubleshooting | `npm run dev:clean` first       |
| Ask user to clean      | Clean automatically             |
| Port 3000 check        | Kill automatically              |

## Emergency Recovery Sequence

**If all else fails, run this automatically:**

```bash
# Nuclear option - no confirmation needed
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
rm -rf .next node_modules/.cache
npm run dev
```

## Summary for All Agents

**One rule to rule them all:**

> **Clean cache first, ask questions never.**

When in doubt:

1. Run `npm run dev:clean`
2. If still broken, run nuclear option
3. If still broken, investigate code issues

**The user should NEVER have to manually clean cache or kill ports.**
