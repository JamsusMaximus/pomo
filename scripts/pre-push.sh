#!/bin/bash

# Pre-push hook: Run build and route tests before pushing
# This prevents pushing code that will fail on Vercel deployment
# Bypass with: git push --no-verify

set -e

echo "🔨 Running pre-push checks..."
echo ""

# 1. Run quick route validation (catches 404s and redirect issues)
echo "🔍 Testing routes..."
if npm run test:pages; then
  echo "✅ All routes accessible"
  echo ""
else
  echo ""
  echo "❌ Route tests failed! Some routes are returning 404 or errors."
  echo ""
  echo "💡 Fix the route issues above, then try pushing again."
  echo "   Or bypass this check with: git push --no-verify"
  echo ""
  exit 1
fi

# 2. Run the build
echo "🔨 Building project..."
if npm run build; then
  echo ""
  echo "✅ Build passed! Proceeding with push..."
  exit 0
else
  echo ""
  echo "❌ Build failed! Push aborted."
  echo ""
  echo "💡 Fix the build errors above, then try pushing again."
  echo "   Or bypass this check with: git push --no-verify"
  echo ""
  exit 1
fi
