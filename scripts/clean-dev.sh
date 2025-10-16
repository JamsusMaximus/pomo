#!/bin/bash
# Quick clean script for dev server issues

echo "🧹 Cleaning Next.js cache..."
rm -rf .next

echo "🔍 Checking for processes on port 3000..."
if lsof -ti:3000 > /dev/null 2>&1; then
  echo "⚠️  Killing process on port 3000..."
  lsof -ti:3000 | xargs kill -9
else
  echo "✅ Port 3000 is free"
fi

echo "✅ Clean complete! You can now run 'npm run dev'"
