#!/bin/bash
# Claude Code hook: Reminds agents to update documentation after edits
# This runs after every file edit

FILE=$1

# Color codes for output
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if schema was modified
if [[ $FILE == *"convex/schema.ts"* ]]; then
  echo -e "${YELLOW}⚠️  Schema changed! Remember to:${NC}"
  echo "   - Update convex/README.md with table relationships"
  echo "   - Update ARCHITECTURE.md Data Model section"
  echo "   - Update types/pomodoro.ts if needed"
fi

# Check if new convex function added
if [[ $FILE == convex/*.ts ]] && [[ $FILE != *"schema.ts"* ]] && [[ $FILE != *"_generated"* ]]; then
  # Check if file was newly created or has new exports
  if git diff --cached "$FILE" 2>/dev/null | grep -q "^+export.*=.*\(mutation\|query\|action\|internalMutation\|internalQuery\|internalAction\)"; then
    echo -e "${YELLOW}⚠️  New Convex function detected!${NC}"
    echo "   - Update convex/README.md API Reference"
    echo "   - Add function documentation"
  fi
fi

# Check if middleware or auth config changed
if [[ $FILE == *"middleware.ts"* ]] || [[ $FILE == *"auth.config.ts"* ]]; then
  echo -e "${YELLOW}⚠️  Auth flow may have changed!${NC}"
  echo "   - Update ARCHITECTURE.md Authentication section"
fi

# Check if offline sync logic changed
if [[ $FILE == lib/storage/* ]]; then
  echo -e "${YELLOW}⚠️  Offline sync logic modified!${NC}"
  echo "   - Update ARCHITECTURE.md Offline-First Design section"
fi

# Check for new files without headers
if [[ $FILE == *.ts ]] || [[ $FILE == *.tsx ]]; then
  if [[ ! $FILE == *".next"* ]] && [[ ! $FILE == *"node_modules"* ]] && [[ ! $FILE == *"_generated"* ]]; then
    if ! head -3 "$FILE" 2>/dev/null | grep -q "@fileoverview"; then
      echo -e "${YELLOW}⚠️  File missing @fileoverview header!${NC}"
      echo "   - Add file header (see .claude/templates/file-header.template.ts)"
    fi
  fi
fi

# Remind about AI_CONTEXT.md rules
echo ""
echo "📖 See AI_CONTEXT.md for complete documentation requirements"
