# Quick Reference Card

> Ultra-condensed cheat sheet for Pomo development

## 📁 File Structure (2 Levels Max)

```
app/              # Next.js pages (timer, profile, pacts, admin)
components/       # React components (ui/ = shadcn)
convex/           # Backend (schema.ts = database, *.ts = functions)
lib/              # Utilities (storage/ = offline sync)
hooks/            # Custom React hooks
docs/             # All documentation
.claude/          # AI agent config
scripts/          # Build & automation
```

## 🔑 Key Patterns

### Auth (Convex)

```typescript
const identity = await ctx.auth.getUserIdentity();
const user = await ctx.db
  .query("users")
  .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
  .first();
```

### Query with Index

```typescript
await ctx.db
  .query("pomodoros")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .collect();
```

### Offline-First Save

```typescript
saveToLocalStorage(session); // 1. Local first
syncToConvex(session); // 2. Cloud async
```

## 📍 Where Things Live

| Feature           | File(s)                            |
| ----------------- | ---------------------------------- |
| Timer logic       | `app/page.tsx`                     |
| Database schema   | `convex/schema.ts`                 |
| Offline sync      | `lib/storage/sessions.ts`          |
| Authentication    | `middleware.ts`, `convex/users.ts` |
| Challenges        | `convex/challenges.ts`             |
| Stats calculation | `convex/stats.ts`                  |

## ⚡ Common Commands

```bash
pnpm run dev              # Start everything
pnpm run verify-setup     # Check config
pnpm run lint:strict      # Zero-warning lint
npx convex dashboard      # Open Convex UI
npx convex logs           # Backend logs
```

## 🚨 Common Issues

| Problem                | Solution                         |
| ---------------------- | -------------------------------- |
| Port 3000 in use       | `pnpm run dev:clean`             |
| User not found         | Call `ensureUser` mutation       |
| Slow queries           | Add indexes in `schema.ts`       |
| Sync not working       | Check localStorage + network tab |
| Challenge not updating | Wait 100-500ms (async scheduler) |

## 📚 Essential Docs (By Priority)

1. **[PROJECT_CONTEXT.md](.claude/PROJECT_CONTEXT.md)** - Start here
2. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - System design
3. **[convex/QUICK_LOOKUP.md](../convex/QUICK_LOOKUP.md)** - API reference
4. **[AI_CONTEXT.md](../AI_CONTEXT.md)** - Documentation rules

## 🎯 Code References

Use `file:line` format when referencing code:

- Timer: `app/page.tsx:150-200`
- Sync logic: `app/page.tsx:296-416`
- Auth check: `convex/users.ts:15-50`
- Offline storage: `lib/storage/sessions.ts:20-80`

## 💡 Remember

- **Offline first** - localStorage before Convex
- **Always use indexes** - No full table scans
- **Update docs** - Documentation is mandatory
- **Test offline** - Chrome DevTools → Offline mode
