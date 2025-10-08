# Development Setup Guide

Quick reference for setting up and running the development environment.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in your credentials in .env.local
# (Get keys from Clerk and Convex dashboards)

# 4. Verify everything is set up correctly
npm run verify-setup

# 5. Start development servers (Next.js + Convex)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✨ What Happens When You Run `npm run dev`

The dev script automatically:

1. ✅ **Validates environment variables** - Checks all required env vars are set
2. 🚀 **Starts Next.js dev server** - With Turbopack for fast refresh
3. 🔄 **Starts Convex dev server** - Real-time backend sync
4. 🎨 **Enables hot reload** - Changes reflect instantly
5. 🛡️ **Monitors for failures** - Kills all processes if one fails
6. 🔁 **Auto-restarts on crashes** - Up to 3 retry attempts

Both servers run in parallel with color-coded logs:

- **Cyan** = Next.js output
- **Magenta** = Convex output

---

## 📋 Available Scripts

### Development

```bash
npm run dev              # Start both Next.js and Convex dev servers
npm run dev:next         # Start only Next.js
npm run dev:convex       # Start only Convex
npm run verify-setup     # Check if environment is properly configured
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run lint:strict      # Lint with zero warnings allowed
npm run format           # Auto-format code with Prettier
npm run format:check     # Check formatting without changing files
npm run typecheck        # Run TypeScript type checking
```

### Testing

```bash
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
```

### Build

```bash
npm run build            # Build production bundle
```

### Other

```bash
npm run generate:changelog  # Generate changelog from git history (requires ANTHROPIC_API_KEY)
npm run tauri:dev           # Run Tauri desktop app (if building desktop version)
```

---

## 🪝 Git Hooks

The project includes automated git hooks to catch issues before pushing.

### Install Hooks

```bash
bash scripts/install-hooks.sh
```

### Pre-commit Hook

Runs automatically before each commit:

1. ✨ **Auto-formats** code with Prettier
2. 🔧 **Auto-fixes** ESLint errors
3. 📝 **Checks** for documentation updates needed
4. ➕ **Auto-adds** fixed files to your commit

### Pre-push Hook (NEW!)

Runs automatically before each push:

1. 🔨 **Builds** the project with `npm run build`
2. ❌ **Aborts** push if build fails
3. ✅ **Prevents** broken code from reaching Vercel

**Bypass if needed:**

```bash
git push --no-verify  # Skip pre-push build check
```

This hook catches TypeScript errors, build failures, and type issues before they reach Vercel, saving you from failed deployments.

---

## 🔧 Git Hooks Setup (Optional but Recommended)

Install git hooks for automatic code quality checks on commit:

```bash
bash scripts/install-hooks.sh
```

**What it does:**

- Auto-formats code with Prettier before commit
- Auto-fixes ESLint errors
- Generates changelog (if `ANTHROPIC_API_KEY` is set)
- Ensures all commits pass CI checks

---

## 🔍 Environment Variables

### Required

| Variable                            | Description           | Where to Get                                       |
| ----------------------------------- | --------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`            | Convex deployment URL | `npx convex dev` (printed in console)              |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key      | [dashboard.clerk.com](https://dashboard.clerk.com) |
| `CLERK_SECRET_KEY`                  | Clerk secret key      | [dashboard.clerk.com](https://dashboard.clerk.com) |

### Optional

| Variable            | Description            | Required For            |
| ------------------- | ---------------------- | ----------------------- |
| `ANTHROPIC_API_KEY` | Claude API key         | AI changelog generation |
| `CONVEX_DEPLOYMENT` | Convex deployment name | Production deployments  |

---

## 🆘 Troubleshooting

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:** Kill the existing process:

```bash
# Find the process
lsof -i :3000

# Kill it
kill -9 <PID>
```

Or change Next.js port:

```bash
# In package.json, change dev:next to:
"dev:next": "next dev --turbopack -p 3001"
```

### Environment Variables Not Found

**Error:** `Missing required environment variables`

**Solution:**

1. Make sure `.env.local` exists
2. Run `npm run verify-setup` to see what's missing
3. Copy values from `.env.example`

### Convex Connection Failed

**Error:** `Failed to connect to Convex`

**Solutions:**

- Make sure `npx convex dev` is running
- Check `NEXT_PUBLIC_CONVEX_URL` in `.env.local` is correct
- Try running `npx convex dev` manually to see the error

### Git Hooks Not Working

**Error:** Hooks not running on commit

**Solution:**

```bash
# Reinstall hooks
bash scripts/install-hooks.sh

# Verify hook exists
cat .git/hooks/pre-commit
```

---

## 🎯 VS Code Setup (Recommended)

The project includes VS Code configurations for the best development experience.

### Recommended Extensions

When you open the project in VS Code, you'll be prompted to install recommended extensions:

- **Prettier** - Code formatting
- **ESLint** - Linting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **Convex** - Convex integration
- **Error Lens** - Inline error highlighting
- **Path IntelliSense** - Path autocomplete

### Debugging

Press `F5` or use the Debug panel to start debugging:

- **Next.js: debug server-side** - Debug API routes and server components
- **Next.js: debug client-side** - Debug in browser with breakpoints
- **Next.js: debug full stack** - Debug both server and client

### Tasks

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and type "Run Task":

- **Start Dev Server** - Run `npm run dev` in terminal
- **Verify Setup** - Check environment configuration
- **Run Tests (Watch)** - Start test watcher
- **Lint & Format** - Format all code

---

## 🔐 Security Notes

- **Never commit `.env.local`** - It contains secrets
- **Use test keys locally** - Production keys only in production
- **`.env.example` is tracked** - Template for required vars
- **Rotate keys regularly** - Especially if exposed

---

## 📚 Next Steps

1. ✅ Verify setup: `npm run verify-setup`
2. 🚀 Start dev server: `npm run dev`
3. 🔧 Install git hooks: `bash scripts/install-hooks.sh`
4. 📖 Read the main [README.md](./README.md) for features and architecture
5. 🚢 When ready for production, see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)

---

## 💡 Tips

- **Auto-save in VS Code** - Enable for instant hot reload
- **Run verify-setup after pull** - Catches environment issues early
- **Use `dev:next` or `dev:convex` separately** - Useful for debugging specific server
- **Check the logs** - Color-coded output helps identify which server logged what
- **Git hooks save time** - No more "fix lint errors" commits

---

Need more help? Check:

- [README.md](./README.md) - Full project documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and patterns
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Production deployment guide
