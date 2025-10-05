# Production Setup Guide

## Issue: Development Keys in Production

You're seeing this warning:
```
Clerk has been loaded with development keys. Development instances have strict usage limits...
```

And these errors:
- CORS errors from `ethical-lamprey-64.accounts.dev`
- Convex authentication failures

## Solution: Use Production Clerk Keys

### Step 1: Create Production Instance in Clerk

1. Go to https://dashboard.clerk.com/
2. Click on your app dropdown (top-left)
3. Click **"Create application"** or use existing production instance
4. Select **Production** mode
5. Name it: "Pomo Production"

### Step 2: Get Production Keys

From your **Production** instance dashboard:

1. Go to **API Keys** in the sidebar
2. Copy these values:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)
   - `CLERK_JWT_ISSUER_DOMAIN` (something like `https://your-app.clerk.accounts.com`)

### Step 3: Update Vercel Environment Variables

1. Go to https://vercel.com/jamsusmaximus/pomo/settings/environment-variables
2. Update/add these variables for **Production**:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_JWT_ISSUER_DOMAIN=https://your-production-app.clerk.accounts.com
```

3. Also ensure you have:
```
NEXT_PUBLIC_CONVEX_URL=https://next-dachshund-902.convex.cloud
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 4: Update Clerk JWT Template

In your **Production** Clerk dashboard:

1. Go to **JWT Templates** (in sidebar)
2. Create or edit template named `convex`
3. Use the same configuration as your development instance
4. **Important:** Copy the "Issuer" URL (this is your `CLERK_JWT_ISSUER_DOMAIN`)

### Step 5: Update Convex Auth Config

If your production Clerk domain is different:

1. Go to https://dashboard.convex.dev/
2. Select your **production** deployment
3. Go to **Settings** → **Environment Variables**
4. Update `CLERK_JWT_ISSUER_DOMAIN` to match your production Clerk instance

### Step 6: Redeploy

After updating environment variables in Vercel:

1. Go to Vercel → Deployments
2. Find your latest deployment
3. Click "..." → **Redeploy**
4. This will pick up the new production keys

## Verification

After redeploying, check:

1. ✅ No "development keys" warning in console
2. ✅ No CORS errors
3. ✅ Sign-in works correctly
4. ✅ Convex queries work (stats, profile data)

## Development vs Production

**Development:**
- Use `.env.local` with development keys
- Domain: `ethical-lamprey-64.accounts.dev`
- Limited to testing

**Production:**
- Use Vercel environment variables with production keys
- Domain: `your-app.clerk.accounts.com` (custom domain)
- No rate limits

## Common Issues

### Issue: CORS Errors Persist
**Solution:** Ensure you're using production Clerk instance, not dev instance

### Issue: Convex Authentication Fails
**Solution:** Make sure `CLERK_JWT_ISSUER_DOMAIN` matches between Clerk and Convex

### Issue: Users Can't Sign In
**Solution:** Check that production keys are set in Vercel for **Production** environment (not just Preview)

## Need Help?

- Clerk Docs: https://clerk.com/docs/deployments/overview
- Convex + Clerk: https://docs.convex.dev/auth/clerk
- Vercel Env Vars: https://vercel.com/docs/environment-variables
