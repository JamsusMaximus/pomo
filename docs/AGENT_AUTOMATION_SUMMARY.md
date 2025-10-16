# Agent Automation Summary

## What You Asked For

> "i don't want to run this clean command or follow best practices myself. i want you to setup all agents operating in here to follow these rules"

## What Was Implemented

### ✅ Complete Automatic Cache & Port Management

**All agents now automatically:**

1. **Clean `.next` cache** before ANY operation
2. **Kill processes on ports 3000/3001** without asking
3. **Use `npm run dev:clean`** instead of `npm run dev`
4. **Fix issues immediately** without user intervention
5. **Report what they did** after auto-fixing

### ✅ Configuration Files Created

#### 1. **`.claude/config.md`**

Global mandatory rules for ALL agents

- Command substitutions
- Error handling protocols
- What agents must/must not do

#### 2. **`.claude/AGENT_PROTOCOLS.md`**

Detailed step-by-step protocols

- Cache management procedures
- Port recovery sequences
- Proactive cleaning triggers
- Emergency recovery steps

#### 3. **`.claude/README.md`**

Overview and quick reference

- How agents work automatically
- What user never has to do
- Testing and maintenance guide

### ✅ Agent Updates

#### Build Error Agent (`.claude/agents/build-error-agent.md`)

- **Step 0: Automatic Pre-Flight** - Clean cache FIRST, no exceptions
- **Proactive Monitoring** - Auto-trigger on error keywords
- **Never ask, just fix** - Explicit instructions

#### Convex Sync Agent (`.claude/agents/convex-sync-agent.md`)

- **Step 0: Automatic Pre-Flight** - Clean cache before testing sync
- Many sync issues are cache issues
- Auto-restart dev server if needed

### ✅ Automated Systems

#### Pre-Flight Validation (`scripts/validate-environment.sh`)

Runs automatically before:

- `npm run dev` (via `predev` hook)
- `npm run build` (via `prebuild` hook)

**Does automatically:**

- Kills processes on ports 3000/3001
- Detects stale cache (>1 hour old)
- Detects corrupted cache (missing BUILD_ID)
- Cleans without asking

#### Recovery Script (`scripts/clean-dev.sh`)

- Quick cache + port cleanup
- One-command recovery
- Used by `npm run dev:clean`

#### Updated `package.json`

```json
{
  "predev": "bash scripts/validate-environment.sh && node scripts/check-env.js",
  "dev:clean": "bash scripts/clean-dev.sh && npm run dev",
  "prebuild": "bash scripts/validate-environment.sh && node scripts/prebuild.js"
}
```

## Command Substitutions

**Agents automatically replace:**

| ❌ YOU WILL NEVER SEE               | ✅ AGENTS WILL USE              |
| ----------------------------------- | ------------------------------- |
| `npm run dev`                       | `npm run dev:clean`             |
| `npm run build`                     | `rm -rf .next && npm run build` |
| "Try running rm -rf .next"          | Runs automatically              |
| "Would you like me to clean cache?" | Cleans automatically            |
| "Kill the process on port 3000"     | Kills automatically             |

## What YOU Never Have To Do Again

❌ Run `rm -rf .next`
❌ Run `lsof -ti:3000 | xargs kill -9`
❌ Remember to clean cache
❌ Follow "best practices"
❌ Ask agents to fix issues
❌ Manually troubleshoot build errors

## What Agents Do Automatically

✅ Clean cache before every operation
✅ Kill ports before starting servers
✅ Detect and fix issues immediately
✅ Report what they did
✅ Only diagnose if auto-fix fails
✅ Assume cache is corrupted by default

## How It Works

### Example 1: User Reports Error

```
You: "getting internal server error"

Agent (automatic sequence):
1. Detects error keyword
2. Kills ports 3000/3001
3. Cleans .next cache
4. Restarts dev server
5. Reports: "Fixed. Cleaned cache and restarted."

No questions. No confirmation. Just fixed.
```

### Example 2: Starting Dev Server

```
You: "start the dev server"

Agent (automatic sequence):
1. Kills any processes on 3000/3001
2. Validates environment (auto-hook)
3. Cleans stale cache if detected
4. Runs npm run dev:clean
5. Reports: "Server started on port 3000"

Cache cleaned automatically if needed.
```

### Example 3: After Code Changes

```
You: "I changed some files, test it"

Agent (automatic sequence):
1. Cleans .next cache (preventive)
2. Kills old dev server
3. Starts fresh with npm run dev:clean
4. Tests the changes
5. Reports results

No cache issues possible.
```

## Verification

**Test completed:** ✅

```bash
$ bash scripts/validate-environment.sh
🔍 Validating development environment...
⚠️  Found process on port 3000, killing...
⚠️  Detected corrupted .next cache, cleaning...
✅ Environment validated and cleaned
```

Script automatically detected and fixed issues without any user intervention.

## Golden Rule

> **"Clean cache first, ask questions never."**

Every agent in this repository follows this principle:

1. Assume cache is corrupted
2. Kill ports automatically
3. Clean cache automatically
4. Fix first, diagnose later
5. Report what was done

## Your Workflow Now

```
You: "build this feature"
Agent: *cleans cache automatically, builds feature, tests it*

You: "fix this error"
Agent: *cleans cache automatically, fixes error, reports result*

You: "start dev server"
Agent: *validates environment, kills ports, cleans cache, starts server*
```

**You literally never touch cache or ports again.**

## Files to Reference

- `.claude/config.md` - Quick reference for agent rules
- `.claude/AGENT_PROTOCOLS.md` - Detailed protocols
- `.claude/README.md` - Overview and maintenance
- `docs/troubleshooting-internal-server-error.md` - Issue documentation
- `scripts/validate-environment.sh` - Auto-validation script
- `scripts/clean-dev.sh` - Manual cleanup script (rarely needed)

## Bottom Line

**Before:** You had to manually clean cache and kill ports.

**Now:** Agents do it automatically every single time without asking.

**Your job:** Write code.
**Agent's job:** Everything else.

---

_Setup completed. All agents now follow automatic cache cleaning and port management protocols._
