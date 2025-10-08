#!/bin/bash
# Install documentation validation git hooks

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"
SCRIPT_PATH="scripts/doc-check-pre-commit.sh"

echo "📦 Installing documentation validation hooks..."

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in a git repository root"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOK_DIR"

# Check if pre-commit hook already exists
if [ -f "$HOOK_FILE" ]; then
  echo "⚠️  Pre-commit hook already exists"
  echo ""
  echo "Current content:"
  cat "$HOOK_FILE"
  echo ""
  read -p "Overwrite existing hook? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation cancelled"
    echo ""
    echo "To manually add documentation checks, add this to your pre-commit hook:"
    echo "  bash $SCRIPT_PATH"
    exit 1
  fi
fi

# Create pre-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# Git pre-commit hook
# Runs documentation validation before allowing commit

# Run documentation checks
if [ -f "scripts/doc-check-pre-commit.sh" ]; then
  bash scripts/doc-check-pre-commit.sh
  DOC_CHECK_RESULT=$?

  # Exit code 0 = pass (no errors)
  # Exit code 1 = fail (blocking errors)
  if [ $DOC_CHECK_RESULT -ne 0 ] && [ $DOC_CHECK_RESULT -ne 0 ]; then
    exit $DOC_CHECK_RESULT
  fi
fi

# Hook succeeded
exit 0
EOF

# Make hook executable
chmod +x "$HOOK_FILE"

echo "✅ Documentation validation hook installed successfully!"
echo ""
echo "The hook will:"
echo "  - Check if schema changes have corresponding doc updates"
echo "  - Warn about new files missing headers"
echo "  - Remind about architecture doc updates"
echo ""
echo "To bypass the hook (not recommended):"
echo "  git commit --no-verify"
echo ""
echo "To uninstall:"
echo "  rm .git/hooks/pre-commit"
