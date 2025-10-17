#!/bin/bash

# Pre-push hook: Quick validation before pushing
# Full build and E2E tests run in CI
# Bypass with: git push --no-verify

set -e

echo "🔍 Pre-push: Quick validation..."
echo ""

# Run typecheck (fast, catches most issues)
echo "🔎 TypeScript check..."
if npm run typecheck; then
  echo "✅ TypeScript checks passed"
else
  echo ""
  echo "❌ TypeScript errors detected!"
  echo "💡 Fix the errors above, then try pushing again."
  echo "   Or bypass with: git push --no-verify"
  echo ""
  exit 1
fi

# Optional: Run tests only if test files changed
CHANGED_TESTS=$(git diff --name-only @{u}.. 2>/dev/null | grep -E '\.(test|spec)\.(ts|tsx|js)$' || true)
if [ -n "$CHANGED_TESTS" ]; then
  echo ""
  echo "🧪 Test files changed, running tests..."
  if npm test; then
    echo "✅ Tests passed"
  else
    echo ""
    echo "❌ Tests failed!"
    echo "💡 Fix the tests, then try pushing again."
    echo "   Or bypass with: git push --no-verify"
    echo ""
    exit 1
  fi
fi

echo ""
echo "✅ Pre-push checks complete!"
echo "💡 Full build + E2E tests will run in CI"
echo ""
exit 0
