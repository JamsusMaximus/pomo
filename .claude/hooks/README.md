# Claude Code Documentation Hooks

## Overview

These hooks remind AI agents to update documentation when they make code changes.

## Available Hooks

### after-edit.sh

Runs checks on edited files and reminds agents to update documentation.

**Triggers reminders for:**

- Schema changes (`convex/schema.ts`)
- New Convex functions
- Auth flow changes (`middleware.ts`, `auth.config.ts`)
- Offline sync changes (`lib/storage/*`)
- Missing file headers

## Usage

### Manual Execution

You can manually run the hook to check a file:

```bash
.claude/hooks/after-edit.sh path/to/file.ts
```

### AI Agent Integration

AI agents should consult `AI_CONTEXT.md` for documentation requirements. This hook script provides additional automated reminders.

**Note:** Claude Code doesn't currently support automatic afterEdit hooks. Agents should:

1. Read `AI_CONTEXT.md` before making changes
2. Use `TodoWrite` to track documentation tasks
3. Manually run this script to verify documentation needs

## Future Integration

When Claude Code supports custom hooks, add to `.claude/settings.local.json`:

```json
{
  "hooks": {
    "afterEdit": ".claude/hooks/after-edit.sh $FILE"
  }
}
```

## Alternative: Pre-commit Hooks

For automatic enforcement, use Git pre-commit hooks (see `.git/hooks/pre-commit`).
