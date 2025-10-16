#!/bin/bash
# Automatic environment validation and cleanup
# Runs before dev server starts to ensure clean state

set -e

echo "🔍 Validating development environment..."

# Check for processes on ports
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "⚠️  Found process on port 3000, killing..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if lsof -ti:3001 > /dev/null 2>&1; then
  echo "⚠️  Found process on port 3001, killing..."
  lsof -ti:3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# Check for .next directory
if [ -d ".next" ]; then
  # Check if .next is older than 1 hour (stale cache)
  if [ -n "$(find .next -maxdepth 0 -mmin +60 2>/dev/null)" ]; then
    echo "🧹 Found stale .next cache (>1 hour old), cleaning..."
    rm -rf .next
  fi
fi

# Check for corrupted cache indicators
if [ -d ".next" ]; then
  # Check for empty or missing critical files
  if [ ! -f ".next/BUILD_ID" ] || [ ! -d ".next/server" ]; then
    echo "⚠️  Detected corrupted .next cache, cleaning..."
    rm -rf .next
  fi
fi

echo "✅ Environment validated and cleaned"
