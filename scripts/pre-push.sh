#!/bin/bash

# Pre-push hook: Run build and route tests before pushing
# This prevents pushing code that will fail on Vercel deployment
# Bypass with: git push --no-verify

set -e

echo "🔨 Running pre-push checks..."
echo ""

# 1. Run quick route validation (catches 404s and redirect issues)
echo "🔍 Testing routes..."
if timeout 120 npm run test:pages; then
  echo "✅ All routes accessible"
  echo ""
else
  EXIT_CODE=$?
  echo ""
  if [ $EXIT_CODE -eq 124 ]; then
    echo "⏱️  Route tests timed out after 2 minutes."
  else
    echo "❌ Route tests failed! Some routes are returning 404 or errors."
  fi
  echo ""
  echo "💡 Fix the issues above, then try pushing again."
  echo "   Or bypass this check with: git push --no-verify"
  echo ""
  exit 1
fi

# 2. Run the build
echo "🔨 Building project..."
if timeout 900 npm run build; then
  echo ""
  echo "✅ Build passed! Proceeding with push..."
  exit 0
else
  EXIT_CODE=$?
  echo ""
  if [ $EXIT_CODE -eq 124 ]; then
    echo "⏱️  Build timed out after 15 minutes."
    echo ""
    echo "💡 This usually indicates a hanging process. Check for:"
    echo "   - Infinite loops in build scripts"
    echo "   - Stuck network requests"
    echo "   - Dev servers still running (kill them with 'pkill -f next')"
  else
    echo "❌ Build failed! Push aborted."
    echo ""
    echo "💡 Fix the build errors above, then try pushing again."
  fi
  echo "   Or bypass this check with: git push --no-verify"
  echo ""
  exit 1
fi
