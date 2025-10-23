# Scripts Directory

> Utility scripts organized by purpose: development, CI/CD, and maintenance

---

## 📁 Directory Structure

```
scripts/
├── dev/              # Development utilities
├── ci/               # CI/CD and build scripts
├── maintenance/      # Occasional maintenance tasks
├── install-hooks.sh  # Git hooks installer
├── pre-push.sh       # Pre-push hook
└── doc-check-pre-commit.sh  # Documentation validation hook
```

---

## 🛠️ Development Scripts (`dev/`)

### `check-env.js`

**Purpose:** Validates environment variables are set correctly

**Usage:** Runs automatically via `predev` script in package.json

**What it checks:**

- Required Clerk keys present
- Required Convex keys present
- Keys have correct format

**Manual run:**

```bash
node scripts/dev/check-env.js
```

---

### `clean-dev.sh`

**Purpose:** Clean cache and kill port conflicts

**Usage:**

```bash
pnpm run dev:clean
```

**What it does:**

- Removes `.next` cache directory
- Kills any process on port 3000
- Restarts dev server fresh

**When to use:**

- "Internal Server Error" in browser
- Port conflict errors
- Hot reload stops working
- After pulling major code changes

---

### `validate-environment.sh`

**Purpose:** Comprehensive environment validation

**Usage:** Runs automatically before `dev` and `build`

**What it validates:**

- Node.js version compatibility
- pnpm installation
- Environment variables set
- Configuration files present

**Manual run:**

```bash
bash scripts/dev/validate-environment.sh
```

---

### `verify-setup.js`

**Purpose:** Interactive setup verification

**Usage:**

```bash
pnpm run verify-setup
```

**What it checks:**

- ✅ Environment variables
- ✅ Dependencies installed
- ✅ Convex connection
- ✅ Clerk configuration
- ✅ Build can complete

**Output:** Friendly checklist with actionable errors

---

## 🚀 CI/CD Scripts (`ci/`)

### `prebuild.js`

**Purpose:** Pre-build validation and setup

**Usage:** Runs automatically before `build` (via `prebuild` script)

**What it does:**

- Validates environment variables (skips gracefully if missing)
- Checks TypeScript configuration
- Prepares build environment

---

### `monitor-pr-build.js`

**Purpose:** Monitor pull request build status

**Usage:**

```bash
pnpm run monitor-pr
# Or with timeout:
node scripts/ci/monitor-pr-build.js --timeout=30
```

**What it does:**

- Watches GitHub Actions workflow for current PR
- Reports build status in real-time
- Exits with code 0 on success, 1 on failure

**Options:**

- `--timeout=N` - Wait up to N minutes (default: 10)

---

### `test-pages.mjs`

**Purpose:** Test all pages load successfully

**Usage:**

```bash
pnpm run test:pages         # Dev server
pnpm run test:pages:prod    # Production build
```

**What it tests:**

- All routes return 200 status
- Pages render without errors
- No missing dependencies

---

## 🔧 Maintenance Scripts (`maintenance/`)

### `generate-changelog.mjs`

**Purpose:** Generate changelog from git history using Claude AI

**Setup:**

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Usage:**

```bash
pnpm run generate:changelog
```

**What it does:**

1. Reads git commits from yesterday
2. Checks if already processed (runs once per day)
3. Sends commits to Claude Haiku
4. Extracts user-facing changes
5. Prepends to existing changelog
6. Outputs to `lib/changelog-data.ts`

**Claude filters:**

- ✅ Includes: New features, UX improvements, functionality additions
- ❌ Excludes: Backend changes, refactoring, docs, minor tweaks

**Cost:** < $0.01 per run

---

### `generate-icons.js`

**Purpose:** Generate app icons from source image

**Usage:**

```bash
node scripts/maintenance/generate-icons.js
```

**What it does:**

- Generates favicon sizes
- Creates PWA icons
- Outputs to `public/` directory

---

### `update-sw-version.sh`

**Purpose:** Update service worker version

**Usage:**

```bash
bash scripts/maintenance/update-sw-version.sh
```

**When to use:**

- After updating PWA configuration
- To force service worker update on clients

---

### `mobile-design-review.mjs`

**Purpose:** Screenshot mobile pages for design review

**Usage:**

```bash
node scripts/maintenance/mobile-design-review.mjs
```

**What it does:**

- Launches Playwright browser
- Screenshots all pages at mobile viewport
- Saves to `mobile-review-results/`

---

### `create-test-friend.ts`

**Purpose:** Create test user for development

**Usage:**

```bash
npx tsx scripts/maintenance/create-test-friend.ts
```

**What it does:**

- Creates test user in Convex
- Generates sample pomodoro sessions
- Useful for testing social features

---

## 🪝 Git Hooks

### `install-hooks.sh`

**Purpose:** Install git hooks for code quality

**Usage:**

```bash
bash scripts/install-hooks.sh
```

**Installed hooks:**

- **pre-commit** - Format code, lint, validate docs
- **pre-push** - Run build to catch errors before CI

---

### `pre-push.sh`

**Purpose:** Run build before pushing to GitHub

**Behavior:**

- Runs `pnpm run build`
- Catches build errors before CI
- Skips if build fails (with warning)

**Bypass:**

```bash
git push --no-verify
```

---

### `doc-check-pre-commit.sh`

**Purpose:** Validate documentation on commit

**Behavior:**

- Checks for outdated docs
- Validates file headers
- Warns about missing documentation

**Not blocking:** Commits proceed with warnings

---

## 🎯 Quick Reference

| Task                  | Command                         |
| --------------------- | ------------------------------- |
| Verify setup          | `pnpm run verify-setup`         |
| Clean dev environment | `pnpm run dev:clean`            |
| Test all pages        | `pnpm run test:pages`           |
| Generate changelog    | `pnpm run generate:changelog`   |
| Install git hooks     | `bash scripts/install-hooks.sh` |
| Monitor PR build      | `pnpm run monitor-pr`           |

---

## 🔍 Script Categories

### Run Automatically

These run automatically via package.json hooks:

- ✅ `dev/check-env.js` - Before `dev`
- ✅ `dev/validate-environment.sh` - Before `dev` and `build`
- ✅ `ci/prebuild.js` - Before `build`

### Run Manually

These are for manual/occasional use:

- 🖐️ `dev/clean-dev.sh` - When dev environment has issues
- 🖐️ `dev/verify-setup.js` - When checking configuration
- 🖐️ `maintenance/*` - For specific maintenance tasks

### Run by CI

These are primarily for CI/CD:

- 🤖 `ci/test-pages.mjs` - CI page load tests
- 🤖 `ci/monitor-pr-build.js` - PR status monitoring

---

## 🚨 Troubleshooting

### Script Permission Errors

```bash
chmod +x scripts/**/*.sh
```

### Node.js Version Issues

Ensure Node.js 20+ is installed:

```bash
node --version  # Should be v20.0.0+
```

### Missing Dependencies

```bash
pnpm install
```

### Environment Variables Not Found

Check `.env.local` exists and has required variables:

```bash
pnpm run verify-setup
```

---

## 📚 Related Documentation

- [Development Setup](../docs/setup/development.md) - Full setup guide
- [Testing Guide](../docs/testing/guide.md) - Testing documentation
- [Contributing](../CONTRIBUTING.md) - Contribution guidelines

---

## 💡 Adding New Scripts

When adding a new script:

1. **Choose the right directory:**
   - `dev/` - Development utilities
   - `ci/` - CI/CD and build scripts
   - `maintenance/` - Occasional tasks

2. **Add documentation:**
   - Update this README
   - Add JSDoc comment to script
   - Document in package.json (if exposed as npm script)

3. **Make executable (if shell script):**

   ```bash
   chmod +x scripts/category/your-script.sh
   ```

4. **Test thoroughly:**
   - Test on clean environment
   - Document any prerequisites
   - Handle errors gracefully

---

Need help with a specific script? Check the script's source code for detailed comments.
