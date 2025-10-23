#!/bin/bash

# Script to update service worker version
# This should be run before each deployment to ensure users get the latest version

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Updating Service Worker Version${NC}"

# Get current version from sw.js
CURRENT_VERSION=$(grep "const VERSION = " public/sw.js | sed "s/.*'\(.*\)'.*/\1/")
echo "Current version: $CURRENT_VERSION"

# Parse version parts
IFS='.' read -ra VERSION_PARTS <<< "${CURRENT_VERSION#v}"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Increment patch version
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="v${MAJOR}.${MINOR}.${NEW_PATCH}"

echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# Update sw.js
sed -i.bak "s/const VERSION = '.*'/const VERSION = '$NEW_VERSION'/" public/sw.js
rm public/sw.js.bak

echo -e "${GREEN}✓ Service worker version updated to $NEW_VERSION${NC}"
echo ""
echo "Don't forget to:"
echo "1. Commit this change"
echo "2. Deploy to production"
echo "3. Users will automatically get the update within 1 hour (or on next visit)"
