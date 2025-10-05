#!/bin/bash

# Install git hooks for changelog generation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "📦 Installing git hooks..."

# Create pre-commit hook
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Auto-generate changelog on first commit after any gap
# This runs before the commit is created

# Check if ANTHROPIC_API_KEY is set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ANTHROPIC_API_KEY not set. Skipping changelog generation."
  echo "   Set it in your shell profile or run: export ANTHROPIC_API_KEY=your-key"
  exit 0
fi

# Run changelog generator
echo "🤖 Generating changelog from recent commits..."
npm run generate:changelog --silent

# If changelog was updated, add it to the commit
if git diff --quiet lib/changelog-data.ts; then
  echo "✅ No changelog updates needed"
else
  echo "📝 Changelog updated - adding to commit"
  git add lib/changelog-data.ts
fi

exit 0
EOF

# Make hook executable
chmod +x "$HOOKS_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will:"
echo "  1. Run on every commit"
echo "  2. Check for commits since last changelog entry"
echo "  3. Generate changelog using Claude Haiku"
echo "  4. Auto-add changelog-data.ts to your commit"
echo ""
echo "Make sure to set ANTHROPIC_API_KEY in your environment!"
