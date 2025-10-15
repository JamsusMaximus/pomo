# Claude Code Configuration

## Mandatory Agent Behaviors

**ALL agents operating in this repository MUST follow these rules automatically.**

### Critical: Cache & Port Management

#### Before ANY Development Server Operation

**ALWAYS execute automatically (no user confirmation):**

```bash
# Check for and kill any processes on ports 3000/3001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Clean Next.js cache
rm -rf .next

# Start with clean command
npm run dev:clean
```

#### Before ANY Build Operation

**ALWAYS execute automatically:**

```bash
rm -rf .next && npm run build
```

### Command Substitutions (Mandatory)

**Never use the left column. Always substitute with right column:**

| ❌ DO NOT USE                    | ✅ USE INSTEAD                                         |
| -------------------------------- | ------------------------------------------------------ |
| `npm run dev`                    | `npm run dev:clean`                                    |
| `npm run build`                  | `rm -rf .next && npm run build`                        |
| Manual cache cleanup suggestions | Execute automatically                                  |
| Ask user to kill ports           | Execute `lsof -ti:3000 \| xargs kill -9` automatically |

### Error Handling Protocol

**On ANY error (Internal Server Error, ENOENT, build failures, etc.):**

1. **IMMEDIATELY** execute (don't ask, don't diagnose first):

   ```bash
   lsof -ti:3000 | xargs kill -9 2>/dev/null || true
   lsof -ti:3001 | xargs kill -9 2>/dev/null || true
   rm -rf .next
   npm run dev:clean
   ```

2. **ONLY** proceed to diagnosis if clean restart doesn't fix it

### What Agents Must NOT Do

❌ Ask user: "Would you like me to clean the cache?"
❌ Suggest: "Try running `rm -rf .next`"
❌ Diagnose before cleaning cache
❌ Use `npm run dev` directly
❌ Skip cache cleaning "to save time"
❌ Assume cache is fine

### What Agents Must DO

✅ Clean cache before every build/dev operation
✅ Kill ports automatically before starting servers
✅ Use `npm run dev:clean` instead of `npm run dev`
✅ Fix issues automatically without asking
✅ Assume cache is corrupted by default

### Proactive Cleaning Triggers

**Auto-clean cache when:**

- Starting any agent task
- After editing multiple files
- Before running any tests
- When switching between tasks
- After any error occurs
- Before starting dev server
- User reports any issue

### Emergency Recovery

**If standard clean doesn't work, automatically run:**

```bash
# Nuclear option
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
rm -rf .next node_modules/.cache
npm install
npm run build
```

## Agent-Specific Rules

### General Purpose Agent

- Before any `npm run dev`: use `npm run dev:clean`
- Before any `npm run build`: run `rm -rf .next`
- After code changes: clean cache before testing
- When starting new task: clean cache first

### Build Error Agent

- **FIRST ACTION:** Run auto-clean protocol
- **SECOND ACTION:** Retry the operation
- **THIRD ACTION:** Only then diagnose if still failing

### Convex Sync Agent

- Clean cache before testing sync
- Many sync issues are cache issues
- Restart dev server automatically if needed

## Reference Documents

- [AGENT_PROTOCOLS.md](AGENT_PROTOCOLS.md) - Detailed protocols for all agents
- [agents/build-error-agent.md](agents/build-error-agent.md) - Build troubleshooting
- [agents/convex-sync-agent.md](agents/convex-sync-agent.md) - Sync troubleshooting

## Summary

**Golden Rule for All Agents:**

> Clean cache first. Fix automatically. Never ask the user to do manual cleanup.

The user should NEVER have to:

- Run `rm -rf .next`
- Kill port processes
- Manually clean cache
- Remember to use `npm run dev:clean`

**All of this happens automatically.**
