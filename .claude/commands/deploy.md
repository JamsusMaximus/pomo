---
description: Production deployment checklist
---

Pre-deployment checklist for production:

**Code Quality:**

- [ ] All tests pass (`pnpm run test` and `pnpm run test:e2e`)
- [ ] TypeScript compiles (`pnpm run typecheck`)
- [ ] Linting passes (`pnpm run lint:strict`)
- [ ] Build succeeds (`pnpm run build`)

**Documentation:**

- [ ] ARCHITECTURE.md updated (if architecture changed)
- [ ] convex/ docs updated (if schema/API changed)
- [ ] README.md reflects current features
- [ ] Changelog generated (if applicable)

**Environment:**

- [ ] Convex production deployment ready (`npx convex deploy`)
- [ ] Vercel environment variables set (Clerk prod keys, Convex URL)
- [ ] `ADMIN_EMAILS` configured in Convex dashboard

**Testing:**

- [ ] Manual smoke test in dev
- [ ] Offline mode works
- [ ] Authentication flow works
- [ ] Critical user paths tested

**Deploy:**

1. Deploy Convex: `npx convex deploy`
2. Deploy Vercel: `git push origin main` or `vercel --prod`
3. Verify deployment works
4. Monitor logs for errors

Walk me through any failed items and help fix them before deploying.
