# Development & Production Setup Guide

This guide walks you through setting up your development environment and deploying to production.

## 🎯 Overview

You need to configure:

1. **Clerk** - Authentication provider
2. **Convex** - Backend/Database
3. **Vercel** - Frontend hosting
4. **GitHub Secrets** - For CI builds (optional but recommended)

---

## 1️⃣ Clerk Setup

### Get Your Keys

1. Go to https://dashboard.clerk.com/
2. Select your app: **"ethical-lamprey-64"**
3. Navigate to **"API Keys"** in the left sidebar
4. Copy these keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)

### Current Dev Keys (already in .env.local)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXRoaWNhbC1sYW1wcmV5LTY0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_ah28K5nnWHNdrIhrnibRQ4qKsc6S2hNOarfGd7j2sx
```

### For Production

You'll need to create **production** keys in Clerk:

1. In Clerk Dashboard, switch to **"Production"** mode
2. Get production keys (starts with `pk_live_` and `sk_live_`)
3. Add these to Vercel (see Vercel section below)

---

## 2️⃣ Convex Setup

### Current Dev Deployment

Already configured in `.env.local`:

```
CONVEX_DEPLOYMENT=dev:next-dachshund-902
NEXT_PUBLIC_CONVEX_URL=https://next-dachshund-902.convex.cloud
```

### Create Production Deployment

Run this command in your terminal:

```bash
npx convex deploy
```

**What happens:**

- Creates a production Convex deployment
- Asks if you want to push to production (answer **Yes**)
- Prints a production URL like: `https://honorable-mockingbird-754.convex.cloud`

**Copy the production URL** - you'll need it for Vercel!

---

## 3️⃣ GitHub Secrets (Optional - for CI)

This allows CI to build your app and catch more bugs.

### Add Secrets to GitHub

1. Go to: https://github.com/JamsusMaximus/pomo/settings/secrets/actions
2. Click **"New repository secret"**
3. Add these **three** secrets:

| Name                                | Value                                     |
| ----------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (test or prod) |
| `CLERK_SECRET_KEY`                  | Your Clerk secret key (test or prod)      |
| `NEXT_PUBLIC_CONVEX_URL`            | Your Convex URL (dev or prod)             |

**Tip:** Use your **test** keys for GitHub - no need to expose prod keys in CI.

### What This Does

- ✅ CI will run full build (catches more errors)
- ✅ Tests authentication flow
- ⚠️ If you skip this, CI will skip the build step (still validates code via TypeScript/tests)

---

## 4️⃣ Vercel Setup

### Add Environment Variables

1. Go to: https://vercel.com/your-username/pomo/settings/environment-variables
2. Add these variables for **Production**:

| Name                                | Value                                            | Notes                        |
| ----------------------------------- | ------------------------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...`                                    | Use **production** Clerk key |
| `CLERK_SECRET_KEY`                  | `sk_live_...`                                    | Use **production** Clerk key |
| `NEXT_PUBLIC_CONVEX_URL`            | `https://honorable-mockingbird-754.convex.cloud` | From `npx convex deploy`     |

### For Preview Deployments (Optional)

You can also add the **same test keys** from `.env.local` for preview deployments:

- Select **"Preview"** environment
- Use your `pk_test_` and `sk_test_` keys

---

## ✅ Verification Checklist

### Local Development

- [ ] `npm run dev` works
- [ ] Can authenticate with Clerk
- [ ] Convex queries/mutations work
- [ ] Timer functions work

### GitHub CI

- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] Prettier/ESLint pass
- [ ] Build step runs (if secrets configured) or skips gracefully

### Production (Vercel)

- [ ] Deployment succeeds
- [ ] Authentication works
- [ ] Convex backend connected
- [ ] No console errors

---

## 🚨 Troubleshooting

### CI Build Failing

**Error:** "Missing publishableKey"

- **Cause:** GitHub secrets not configured
- **Fix:** Either add secrets (see section 3) or ignore - CI will skip build step

### Vercel Deployment Failing

**Error:** "Missing publishableKey" or "Invalid Convex URL"

- **Cause:** Environment variables not set in Vercel
- **Fix:** Add all three variables in Vercel settings (section 4)

### Convex Connection Error

**Error:** "Failed to connect to Convex"

- **Cause:** Wrong Convex URL or deployment doesn't exist
- **Fix:** Run `npx convex deploy` and update URL in Vercel

### Clerk Auth Not Working in Production

**Error:** Users can't sign in

- **Cause:** Using test keys in production, or domain not authorized
- **Fix:**
  1. Use production Clerk keys (`pk_live_`, `sk_live_`)
  2. Add your Vercel domain to Clerk's allowed domains

---

## 📚 Quick Reference

### Current Keys (Development)

```bash
# Clerk (Test)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXRoaWNhbC1sYW1wcmV5LTY0LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_ah28K5nnWHNdrIhrnibRQ4qKsc6S2hNOarfGd7j2sx

# Convex (Dev)
CONVEX_DEPLOYMENT=dev:next-dachshund-902
NEXT_PUBLIC_CONVEX_URL=https://next-dachshund-902.convex.cloud
```

### Commands

```bash
# Development
npm run dev              # Start dev server
npx convex dev           # Start Convex dev (already running)

# Production
npx convex deploy        # Deploy Convex to production
vercel --prod            # Deploy to Vercel production

# CI
git push                 # Triggers CI workflow
```

### Important URLs

- **Clerk Dashboard:** https://dashboard.clerk.com/
- **Convex Dashboard:** https://dashboard.convex.dev/
- **Vercel Dashboard:** https://vercel.com/
- **GitHub Repo:** https://github.com/JamsusMaximus/pomo
- **GitHub Secrets:** https://github.com/JamsusMaximus/pomo/settings/secrets/actions

---

## 🎓 What Each Service Does

### Clerk

- Handles user authentication (sign up, sign in, sign out)
- Manages user sessions and JWT tokens
- Provides user profile management

### Convex

- Database for storing pomodoro sessions
- Backend functions (queries, mutations)
- Real-time data synchronization
- Integrates with Clerk for auth

### Vercel

- Hosts your Next.js frontend
- Runs on every git push
- Handles preview deployments for PRs
- Serverless functions (API routes)

### GitHub Actions (CI)

- Runs tests on every push/PR
- Checks code formatting and linting
- Validates TypeScript types
- Builds app to catch errors early

---

## 🎯 Next Steps

1. **Now:** Finish Convex production deployment

   ```bash
   npx convex deploy
   ```

2. **Then:** Add environment variables to Vercel (section 4)

3. **Optional:** Add GitHub secrets for better CI (section 3)

4. **Finally:** Push to main and deploy!

---

## 💡 Tips

- **Test keys in GitHub Secrets** - Safer than exposing production keys
- **Production keys in Vercel only** - Keep them secret
- **Two Convex deployments** - Dev for testing, prod for real users
- **Clerk domains** - Add your Vercel domain in Clerk settings

---

Need help? Check the troubleshooting section or review the [Convex](https://docs.convex.dev) and [Clerk](https://clerk.com/docs) docs.
