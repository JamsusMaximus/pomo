# Convex Auto-Deploy Setup for Vercel

This project is configured to automatically deploy Convex functions when deploying to Vercel.

## How It Works

- The `prebuild` script in `package.json` runs `npx convex deploy` before the Next.js build
- This ensures Convex functions are always deployed before the frontend

## One-Time Setup Required

To enable automatic Convex deployment in Vercel, you need to set up a deploy key:

### 1. Get Your Production Deploy Key

1. Go to https://dashboard.convex.dev
2. Select your project: `pomo`
3. Go to Settings → Deploy Keys
4. Click "Generate Production Deploy Key"
5. Copy the generated key (starts with `prod:`)

### 2. Add to Vercel Environment Variables

1. Go to your Vercel project settings: https://vercel.com/[your-username]/pomo/settings/environment-variables
2. Add a new environment variable:
   - **Name**: `CONVEX_DEPLOY_KEY`
   - **Value**: The deploy key you copied (e.g., `prod:key_...`)
   - **Environment**: Production, Preview (check both)
3. Click "Save"

### 3. Redeploy

After adding the environment variable, trigger a redeploy:

- Push a new commit, or
- Go to Deployments → Click "..." → Redeploy

## Verification

After setup, every Vercel deployment will:

1. Run `npx convex deploy` (deploys Convex functions to production)
2. Run `next build` (builds Next.js app)

You can verify this worked by:

- Checking Vercel build logs for "Deployed Convex functions to..."
- Visiting your production site and checking the profile page works

## Troubleshooting

**Build fails with "CONVEX_DEPLOY_KEY not set"**

- Make sure you added the deploy key to Vercel environment variables
- Ensure it's enabled for both Production and Preview environments

**Functions still not deployed**

- Check that the deploy key hasn't expired
- Regenerate the key if needed and update in Vercel
