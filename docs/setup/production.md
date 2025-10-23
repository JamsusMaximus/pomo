# Production Setup Guide

Guide for deploying Pomo to production on Vercel with Convex and Clerk.

## 🎯 Overview

Production deployment requires:

1. **Clerk Production Instance** - Production authentication keys
2. **Convex Production Deployment** - Separate from development
3. **Vercel Production Environment** - Hosting with environment variables
4. **GitHub Secrets** (Optional) - For CI/CD builds

---

## Step 1: Create Clerk Production Instance

### Get Production Keys

1. Go to https://dashboard.clerk.com/
2. Click application dropdown (top-left)
3. Select or create **Production** instance
4. Navigate to **API Keys**
5. Copy these keys:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

⚠️ **Important:** Production keys start with `pk_live_` and `sk_live_` (not `pk_test_`)

### Configure JWT Template

1. In Clerk dashboard, go to **JWT Templates**
2. Create or edit template named `convex`
3. Copy the **Issuer URL** (format: `https://your-app.clerk.accounts.com`)

---

## Step 2: Deploy Convex to Production

### Create Production Deployment

```bash
npx convex deploy
```

**What happens:**

- Creates new production Convex deployment
- Pushes schema and functions
- Returns production URL

**Example output:**

```
✓ Production deployment created
URL: https://honorable-mockingbird-754.convex.cloud
```

**Copy this URL** - you'll need it for Vercel!

### Set Convex Environment Variables

1. Go to https://dashboard.convex.dev/
2. Select your **production** deployment
3. Navigate to **Settings → Environment Variables**
4. Add:

```
ADMIN_EMAILS=your-admin-email@example.com
```

(Optional: Add other production-specific variables)

---

## Step 3: Configure Vercel

### Add Environment Variables

1. Go to https://vercel.com/your-username/pomo/settings/environment-variables
2. Add these variables for **Production** environment:

| Variable Name                       | Value                                            | Notes                 |
| ----------------------------------- | ------------------------------------------------ | --------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...`                                    | From Step 1           |
| `CLERK_SECRET_KEY`                  | `sk_live_...`                                    | From Step 1           |
| `NEXT_PUBLIC_CONVEX_URL`            | `https://honorable-mockingbird-754.convex.cloud` | From Step 2           |
| `CONVEX_DEPLOYMENT`                 | `prod:your-deployment-name`                      | Optional, for clarity |

### Deploy to Production

#### Option A: Deploy via Git

```bash
git push origin main
```

Vercel auto-deploys commits to `main` branch.

#### Option B: Manual Deploy

```bash
npx vercel --prod
```

### Verify Deployment

After deployment completes:

1. ✅ Visit your production URL
2. ✅ Sign in with Clerk (should work without warnings)
3. ✅ Complete a pomodoro session
4. ✅ Check profile page loads stats correctly
5. ✅ Open browser console - no errors about "development keys"

---

## Step 4: GitHub Secrets (Optional - for CI)

### Why Add GitHub Secrets?

- Enables full build in CI/CD pipeline
- Catches build errors before deployment
- Tests authentication integration

### Add Secrets

1. Go to: https://github.com/your-username/pomo/settings/secrets/actions
2. Click **New repository secret**
3. Add these secrets:

| Secret Name                         | Value                           | Recommendation                |
| ----------------------------------- | ------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...`                   | Use **test** keys for CI      |
| `CLERK_SECRET_KEY`                  | `sk_test_...`                   | Use **test** keys for CI      |
| `NEXT_PUBLIC_CONVEX_URL`            | `https://your-dev.convex.cloud` | Use **dev** deployment for CI |

**💡 Pro Tip:** Use development keys for CI to avoid exposing production credentials.

---

## ✅ Verification Checklist

### Before Deployment

- [ ] Clerk production instance created
- [ ] Production JWT template configured
- [ ] Convex production deployment created
- [ ] All environment variables prepared

### After Deployment

- [ ] No "development keys" warning in browser console
- [ ] Sign in/sign out works correctly
- [ ] Pomodoro sessions save and sync
- [ ] Profile page displays stats
- [ ] Challenges unlock correctly
- [ ] No CORS errors in network tab

### Performance Checks

- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] No console errors or warnings
- [ ] Convex queries respond quickly

---

## 🚨 Troubleshooting

### "Development Keys" Warning in Production

**Issue:** Console shows "Clerk has been loaded with development keys"

**Solution:**

- Verify you're using `pk_live_` keys (not `pk_test_`)
- Check Vercel environment variables are set for **Production** (not just Preview)
- Redeploy after updating environment variables

### CORS Errors from Clerk

**Issue:** Network requests blocked by CORS policy

**Solution:**

- Ensure production Clerk instance is configured
- Add your production domain to Clerk's **Allowed Origins**
- Check you're not mixing test/production keys

### Convex Authentication Fails

**Issue:** "Authentication failed" or "Unauthorized" errors

**Solution:**

- Verify `CLERK_JWT_ISSUER_DOMAIN` matches in both Clerk and Convex
- Check JWT template is named `convex` in Clerk dashboard
- Ensure Convex deployment has correct environment variables

### Users Can't Sign In

**Issue:** Sign-in modal doesn't appear or fails

**Solution:**

1. Check Clerk production keys are correct
2. Verify domain is added to Clerk's **Allowed Domains**
3. Check browser console for detailed error messages
4. Ensure cookies are enabled

### Data Not Syncing

**Issue:** Pomodoro sessions don't save to Convex

**Solution:**

- Check `NEXT_PUBLIC_CONVEX_URL` is correct in Vercel
- Verify Convex production deployment is running (check dashboard)
- Check browser network tab for failed Convex mutations
- Review Convex logs: `npx convex logs --prod`

---

## 📊 Production Monitoring

### Vercel Analytics

Automatically enabled for production deployments:

- Page views and unique visitors
- Web Vitals (LCP, FID, CLS)
- Top pages and referrers

View at: https://vercel.com/your-username/pomo/analytics

### Convex Logs

Monitor backend in real-time:

```bash
npx convex logs --prod
```

Watch for:

- Mutation errors
- Query performance issues
- Authentication failures

### Clerk Dashboard

Monitor authentication:

- Active users
- Sign-in attempts
- Failed authentications

View at: https://dashboard.clerk.com/

---

## 🔄 Environment Comparison

| Aspect               | Development       | Production               |
| -------------------- | ----------------- | ------------------------ |
| **Clerk Keys**       | `pk_test_...`     | `pk_live_...`            |
| **Clerk Domain**     | `.accounts.dev`   | `.accounts.com`          |
| **Convex URL**       | `dev:your-name`   | `prod:your-name`         |
| **Environment File** | `.env.local`      | Vercel dashboard         |
| **Rate Limits**      | Strict (dev tier) | Higher (production tier) |
| **Analytics**        | Disabled          | Enabled                  |

---

## 🔐 Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to Git
- ✅ Use test keys for CI/GitHub
- ✅ Rotate production keys periodically
- ❌ Don't expose production keys in client code

### Clerk Configuration

- ✅ Enable MFA for admin accounts
- ✅ Configure allowed domains
- ✅ Set up webhooks for user events
- ✅ Review session settings

### Convex Security

- ✅ Limit `ADMIN_EMAILS` to trusted users
- ✅ Review function permissions regularly
- ✅ Monitor logs for suspicious activity
- ✅ Use row-level security in queries

---

## 📚 Related Documentation

- [Development Setup](./development.md) - Local development guide
- [Architecture](../../ARCHITECTURE.md) - System design
- [Convex Backend](../../convex/README.md) - Backend API reference

---

## 📞 Support Resources

- **Clerk Deployment Guide:** https://clerk.com/docs/deployments/overview
- **Convex Production Docs:** https://docs.convex.dev/production
- **Vercel Environment Variables:** https://vercel.com/docs/environment-variables
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## 💡 Pro Tips

- **Test in Preview first** - Vercel creates preview deployments for PRs
- **Use Vercel's environment promotion** - Copy Preview vars to Production
- **Monitor first 24 hours closely** - Watch for unexpected errors
- **Set up Vercel notifications** - Get alerts for deployment failures
- **Keep development/production databases separate** - Don't mix test data with real users

---

Need help? Check the [troubleshooting section](#-troubleshooting) or open a GitHub issue.
