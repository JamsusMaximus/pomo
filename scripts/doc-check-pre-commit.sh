#!/bin/bash
# Pre-commit hook for documentation validation
# Checks if documentation updates are needed based on staged changes

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Checking for documentation updates..."

WARNINGS=0
ERRORS=0

# Check if schema was modified
if git diff --cached --name-only | grep -q "convex/schema.ts"; then
  if ! git diff --cached --name-only | grep -q "convex/README.md"; then
    echo -e "${YELLOW}⚠️  WARNING: convex/schema.ts modified but convex/README.md not updated${NC}"
    echo "   Consider updating: Schema Overview section"
    WARNINGS=$((WARNINGS + 1))
  fi

  if ! git diff --cached --name-only | grep -q "ARCHITECTURE.md"; then
    echo -e "${YELLOW}⚠️  WARNING: Schema modified but ARCHITECTURE.md not updated${NC}"
    echo "   Consider updating: Data Model section"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check for new Convex functions
NEW_CONVEX_FILES=$(git diff --cached --name-only --diff-filter=A | grep "^convex/.*\.ts$" | grep -v "_generated" | grep -v "schema.ts")
if [ -n "$NEW_CONVEX_FILES" ]; then
  echo -e "${YELLOW}⚠️  WARNING: New Convex file(s) detected:${NC}"
  echo "$NEW_CONVEX_FILES" | sed 's/^/   - /'
  echo "   Consider updating: convex/README.md API Reference"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for modified Convex functions (look for new exports)
MODIFIED_CONVEX=$(git diff --cached --name-only | grep "^convex/.*\.ts$" | grep -v "_generated" | grep -v "schema.ts")
for file in $MODIFIED_CONVEX; do
  if git diff --cached "$file" | grep -q "^+export.*=.*\(mutation\|query\|action\)"; then
    echo -e "${YELLOW}⚠️  WARNING: New Convex function(s) in $file${NC}"
    echo "   Consider updating: convex/README.md API Reference"
    WARNINGS=$((WARNINGS + 1))
    break
  fi
done

# Check if middleware or auth config changed
if git diff --cached --name-only | grep -qE "(middleware\.ts|auth\.config\.ts)"; then
  if ! git diff --cached --name-only | grep -q "ARCHITECTURE.md"; then
    echo -e "${YELLOW}⚠️  WARNING: Auth flow modified but ARCHITECTURE.md not updated${NC}"
    echo "   Consider updating: Authentication & Authorization section"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check if offline sync logic changed
if git diff --cached --name-only | grep -q "^lib/storage/"; then
  if ! git diff --cached --name-only | grep -q "ARCHITECTURE.md"; then
    echo -e "${YELLOW}⚠️  WARNING: Offline sync modified but ARCHITECTURE.md not updated${NC}"
    echo "   Consider updating: Offline-First Design section"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check for new TypeScript files without file headers
NEW_TS_FILES=$(git diff --cached --name-only --diff-filter=A | grep -E '\.(ts|tsx)$' | grep -v "\.next" | grep -v "node_modules" | grep -v "_generated")
for file in $NEW_TS_FILES; do
  if [ -f "$file" ]; then
    if ! head -5 "$file" | grep -q "@fileoverview"; then
      echo -e "${YELLOW}⚠️  WARNING: New file $file missing @fileoverview header${NC}"
      echo "   Add header (see .claude/templates/file-header.template.ts)"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

# Check for existing files with significant changes but no header
MODIFIED_TS=$(git diff --cached --name-only | grep -E '\.(ts|tsx)$' | grep -v "\.next" | grep -v "node_modules" | grep -v "_generated")
for file in $MODIFIED_TS; do
  if [ -f "$file" ]; then
    # Check if file has significant changes (more than 20 lines added)
    LINES_ADDED=$(git diff --cached "$file" | grep "^+" | grep -v "^+++" | wc -l)
    if [ "$LINES_ADDED" -gt 20 ]; then
      if ! head -5 "$file" | grep -q "@fileoverview"; then
        echo -e "${YELLOW}⚠️  WARNING: $file has significant changes but no @fileoverview header${NC}"
        echo "   Consider adding header (see .claude/templates/file-header.template.ts)"
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi
done

# Summary
echo ""
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ $ERRORS error(s) found - commit blocked${NC}"
  echo "   Fix errors and try again"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
  echo ""
  echo "Documentation may need updates. Review the warnings above."
  echo "See AI_CONTEXT.md for documentation requirements."
  echo ""
  echo "To commit anyway, run: git commit --no-verify"
  echo "To update docs now, press Ctrl+C and make changes"
  echo ""
  # Not blocking commit, just warning
  exit 0
else
  echo -e "${GREEN}✅ No documentation issues detected${NC}"
  exit 0
fi
