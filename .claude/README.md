# Claude Code Agent Configuration

This directory contains configuration and protocols for all AI agents operating in this repository.

## Automatic Behaviors

**All agents in this repository automatically:**

1. ✅ **Clean cache before ANY build/dev operation**
2. ✅ **Kill port processes automatically** (no user confirmation)
3. ✅ **Use `npm run dev:clean` instead of `npm run dev`**
4. ✅ **Fix issues first, diagnose later**
5. ✅ **Never ask user to manually clean cache or kill ports**

## Key Files

### `config.md`

**Global configuration for all agents**

Mandatory behaviors, command substitutions, and error handling protocols that apply to ALL agents operating in this repository.

**Read this first.**

### `AGENT_PROTOCOLS.md`

**Detailed protocols and procedures**

Comprehensive guide on:

- Cache management protocols
- Port management procedures
- Error recovery sequences
- Proactive maintenance triggers
- Command substitutions

### Specialized Agents

#### `agents/build-error-agent.md`

**Build & dev server troubleshooting**

Automatically handles:

- Internal Server Error
- Build failures
- Port conflicts
- Cache corruption
- Turbopack issues

**Auto-triggers:**

- User reports error/issue
- Before any build/dev operation
- After code changes

#### `agents/convex-sync-agent.md`

**Data synchronization troubleshooting**

Automatically handles:

- Sync issues between frontend/backend
- Missing data problems
- Auto-seeding logic
- Database inconsistencies

**Auto-triggers:**

- Before testing sync
- When sync issues reported
- After schema changes

## Automated Systems

### Pre-Flight Validation

**`scripts/validate-environment.sh`**

Runs automatically before:

- `npm run dev`
- `npm run build`

**Does:**

- Kills processes on ports 3000/3001
- Detects stale cache (>1 hour old)
- Detects corrupted cache
- Cleans automatically

### Recovery Scripts

**`scripts/clean-dev.sh`**

- Quick cache cleanup
- Port recovery
- Dev server restart

**`npm run dev:clean`**

- One-command recovery
- Use instead of `npm run dev`

## Command Substitutions

**Agents automatically substitute:**

| ❌ Old               | ✅ New                          |
| -------------------- | ------------------------------- |
| `npm run dev`        | `npm run dev:clean`             |
| `npm run build`      | `rm -rf .next && npm run build` |
| "Try cleaning cache" | Cleans automatically            |
| "Kill the process"   | Kills automatically             |

## User Experience

**What you NEVER have to do:**

- Run `rm -rf .next`
- Kill processes with `lsof`
- Remember to clean cache
- Ask agents to fix issues
- Follow "best practices"

**What happens automatically:**

- Cache cleaned before operations
- Ports killed before server starts
- Issues fixed without asking
- Environment validated constantly

## Agent Invocation

### How Agents Work

1. **Proactive Detection** - Agents detect issues from user messages
2. **Auto-Execute** - Fix issues immediately without asking
3. **Report Results** - Tell user what was done
4. **Only Diagnose** - If auto-fix didn't work

### Example Flow

```
User: "I'm getting an internal server error"

Agent thinks: Error keyword detected → Auto-trigger protocol

Agent executes automatically:
1. Kill ports 3000/3001
2. Clean .next cache
3. Restart dev server

Agent reports: "Fixed: Cleaned cache and restarted. Server is now running."

NO user interaction needed!
```

## Maintenance

### When Adding New Agents

1. Create agent file in `agents/`
2. Add reference to `AGENT_PROTOCOLS.md`
3. Add auto-trigger rules
4. Document in this README
5. Include cache cleaning protocols

### When Updating Protocols

1. Update `AGENT_PROTOCOLS.md` (source of truth)
2. Update `config.md` (quick reference)
3. Update affected agent files
4. Test auto-execution behavior

## Testing

Agents should automatically:

- Clean cache when starting tasks
- Kill ports without confirmation
- Fix errors before diagnosing
- Report what they did

**User should never have to ask agents to clean cache or kill ports.**

## Philosophy

> **"Clean cache first, ask questions never."**

Every agent follows this principle:

1. Assume cache is corrupted
2. Fix automatically
3. Report what was done
4. Only diagnose if still broken

**The user's job:** Write code
**The agent's job:** Everything else

## Support

If agents aren't following these protocols:

1. Check they're reading `.claude/config.md`
2. Verify `AGENT_PROTOCOLS.md` is clear
3. Update agent-specific instructions
4. Test with simulated scenarios

**The goal:** User should NEVER manually clean cache or kill ports ever again.
