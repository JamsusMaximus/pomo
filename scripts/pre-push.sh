#!/bin/bash

# Pre-push hook: Run build before pushing to catch errors early
# This prevents pushing code that will fail on Vercel deployment
# Bypass with: git push --no-verify

set -e

echo "🔨 Running build check before push..."
echo ""

# Run the build
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
