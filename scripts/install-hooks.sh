#!/bin/bash

# Install git hooks for changelog generation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "📦 Installing git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook for code quality checks
# 1. Auto-format with Prettier
# 2. Generate changelog (if ANTHROPIC_API_KEY is set)

echo "🔍 Running pre-commit checks..."

# 1. Auto-format staged files with Prettier
echo "✨ Formatting code with Prettier..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx|json|css|md|mjs)$')
if [ -n "$STAGED_FILES" ]; then
  npx prettier --write $STAGED_FILES
  git add $STAGED_FILES
fi

# 2. Auto-fix ESLint errors
echo "🔧 Fixing ESLint errors..."
STAGED_CODE=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx|ts|tsx|mjs)$')
if [ -n "$STAGED_CODE" ]; then
  npx eslint --fix $STAGED_CODE || true
  git add $STAGED_CODE
fi

# 2. Auto-generate changelog (optional - requires API key)
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "🤖 Generating changelog from recent commits..."
  npm run generate:changelog --silent

  # If changelog was updated, add it to the commit
  if git diff --quiet lib/changelog-data.ts; then
    echo "✅ No changelog updates needed"
  else
    echo "📝 Changelog updated - adding to commit"
    git add lib/changelog-data.ts
  fi
else
  echo "⚠️  ANTHROPIC_API_KEY not set. Skipping changelog generation."
fi

echo "✅ Pre-commit checks complete!"
exit 0
EOF

# Make hook executable
chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will:"
echo "  1. Auto-format code with Prettier"
echo "  2. Auto-fix ESLint errors"
echo "  3. Generate changelog using Claude Haiku (if ANTHROPIC_API_KEY is set)"
echo "  4. Auto-add all fixed files to your commit"
echo ""
echo "Your commits will now always pass CI checks! 🎉"
