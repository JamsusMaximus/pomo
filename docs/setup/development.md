# Development Setup Guide

Complete guide for setting up your local development environment.

## 🎯 Prerequisites

- Node.js 20+ and pnpm
- Git
- A code editor (VS Code recommended)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/pomo.git
cd pomo
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Verify Setup

```bash
pnpm run verify-setup
```

This checks:

- ✅ Environment variables are set
- ✅ Dependencies are installed correctly
- ✅ Configuration files are valid

### 4. Start Development Servers

```bash
pnpm run dev
```

This automatically starts:

- Next.js dev server → http://localhost:3000
- Convex dev backend → Syncing in real-time

### 5. Install Git Hooks (Recommended)

```bash
bash scripts/install-hooks.sh
```

**Installed hooks:**

- **Pre-commit** - Auto-formats code, fixes ESLint errors, validates documentation
- **Pre-push** - Runs build to catch errors before CI

---

## 🔑 Service Configuration

### Clerk (Authentication)

1. Go to https://dashboard.clerk.com/
2. Create or select your application
3. Navigate to **API Keys**
4. Copy your development keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Add these to `.env.local`**

### Convex (Backend)

1. Go to https://dashboard.convex.dev/
2. Create a new project or select existing
3. Run in your terminal:

```bash
npx convex dev
```

4. Follow prompts to link to your project
5. Copy the URL provided:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-name
```

**Add these to `.env.local`**

### Anthropic (Optional - Changelog Generation)

1. Go to https://console.anthropic.com/
2. Create an API key
3. Add to `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📁 Project Structure

```
pomo/
├── app/              # Next.js app router pages
│   ├── page.tsx      # Home - Timer
│   ├── profile/      # User profile
│   ├── pacts/        # Accountability pacts
│   └── admin/        # Admin panel
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Feature components
├── convex/          # Backend functions & schema
├── lib/             # Utilities & helpers
├── hooks/           # Custom React hooks
├── scripts/         # Build & automation scripts
├── tests/           # E2E tests
└── docs/            # Documentation
```

---

## 🛠️ Development Workflow

### Available Commands

```bash
# Development
pnpm run dev           # Start Next.js + Convex (recommended)
pnpm run dev:next      # Start only Next.js
pnpm run dev:convex    # Start only Convex
pnpm run dev:clean     # Clean ports and start fresh

# Building
pnpm run build         # Production build
pnpm run start         # Start production server

# Code Quality
pnpm run lint          # Run ESLint
pnpm run lint:strict   # Lint with zero warnings
pnpm run format        # Format with Prettier
pnpm run format:check  # Check formatting without changes
pnpm run typecheck     # TypeScript type checking

# Testing
pnpm run test          # Run Vitest tests
pnpm run test:watch    # Watch mode
pnpm run test:e2e      # Run Playwright E2E tests
pnpm run test:e2e:ui   # E2E tests with UI

# Utilities
pnpm run verify-setup  # Verify environment configuration
pnpm run generate:changelog  # Generate changelog (requires Anthropic API key)
```

### Typical Development Flow

1. **Start dev servers:**

   ```bash
   pnpm run dev
   ```

2. **Make changes** to code

3. **View changes** at http://localhost:3000

4. **Check for errors:**
   - Browser console
   - Terminal output
   - Convex dashboard logs

5. **Before committing:**

   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm run test
   ```

6. **Commit changes** (hooks run automatically)

7. **Push to GitHub** (pre-push hook runs build)

---

## 🎨 VS Code Setup (Recommended)

### Install Extensions

The project includes recommended extensions in `.vscode/extensions.json`:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - CSS autocomplete
- **TypeScript** - Type checking

VS Code will prompt you to install these when you open the project.

### Settings

The project includes workspace settings in `.vscode/settings.json`:

- Auto-format on save
- ESLint auto-fix on save
- Tailwind CSS class sorting
- TypeScript import organization

---

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**

```bash
pnpm run dev:clean  # Automatically kills processes and restarts
```

Or manually:

```bash
lsof -ti:3000 | xargs kill -9
pnpm run dev
```

### Convex Authentication Errors

**Error:** `User not found - call ensureUser first`

**Solution:** Sign out and sign back in. This triggers `ensureUser` mutation.

### Environment Variables Not Loaded

**Error:** `Missing publishableKey` or similar

**Solution:**

1. Check `.env.local` exists and has all required variables
2. Restart dev server (`pnpm run dev`)
3. Run `pnpm run verify-setup` to diagnose

### Build Errors After Git Pull

**Solution:**

```bash
pnpm install        # Update dependencies
pnpm run verify-setup  # Check configuration
pnpm run dev:clean  # Fresh start
```

### Git Hooks Not Running

**Solution:**

```bash
bash scripts/install-hooks.sh
chmod +x scripts/install-hooks.sh
```

---

## 📚 Related Documentation

- [Production Setup](./production.md) - Deploy to production
- [Testing Guide](../testing/guide.md) - Testing strategies
- [Architecture](../../ARCHITECTURE.md) - System design
- [Convex Backend](../../convex/README.md) - Backend API reference

---

## 💡 Pro Tips

- **Use `pnpm run dev`** - Starts both Next.js and Convex automatically
- **Check Convex dashboard** - See real-time function logs and database
- **Use React DevTools** - Inspect component state and props
- **Enable Vercel Analytics locally** - Set `NODE_ENV=production` temporarily
- **Test offline mode** - Use Chrome DevTools → Network → Offline
- **Hot reload works** - No need to restart server for most changes

---

## 🎓 Learning Resources

### Next.js

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)

### Convex

- [Convex Documentation](https://docs.convex.dev)
- [Convex + Clerk Auth](https://docs.convex.dev/auth/clerk)

### Clerk

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)

### Tailwind CSS

- [Tailwind Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

Need help? Check the [troubleshooting section](#-troubleshooting) or reach out via GitHub issues.
