# Feature Addition Decision Tree

> Guide for adding new features to Pomo

---

## 🎯 Step 1: Understand Requirements

### Questions to Ask:

- [ ] What problem does this feature solve?
- [ ] Who is the user? (authenticated user, guest, admin)
- [ ] Is this a user-facing feature?
- [ ] Does it require authentication?
- [ ] Should it work offline?
- [ ] Does it involve real-time updates?

---

## 📍 Step 2: Identify Scope

### Frontend Only?

**Examples:** UI polish, animations, component styling

**Files to modify:**

- `components/` - New or existing component
- `app/` - Page-level changes
- `app/globals.css` - Styling

**Next steps:** Skip to Step 5 (Implementation)

---

### Backend Only?

**Examples:** New query, mutation, scheduled task

**Files to modify:**

- `convex/*.ts` - New functions
- `convex/schema.ts` - If data model changes

**Next steps:** Continue to Step 3 (Database)

---

### Full-Stack Feature?

**Examples:** New page with data, user settings, social features

**Files to modify:**

- Frontend: `app/`, `components/`, `hooks/`
- Backend: `convex/*.ts`
- Schema: `convex/schema.ts` (if needed)
- Types: `types/*.ts` (if needed)

**Next steps:** Continue to Step 3 (Database)

---

## 🗄️ Step 3: Database Changes Needed?

### No Database Changes

**Skip to Step 4**

### New Table Required

1. Add table to `convex/schema.ts`
2. Add indexes for common queries
3. Consider relationships (foreign keys)
4. Plan migration strategy
5. Update `convex/SCHEMA.md`
6. Update `ARCHITECTURE.md` → Data Model section

**Example:**

```typescript
notifications: defineTable({
  userId: v.id("users"),
  message: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
}).index("by_user", ["userId"]),
```

### New Fields in Existing Table

1. Add as **optional** field first: `v.optional(v.string())`
2. Consider default values
3. Plan backfill if needed
4. Update `convex/SCHEMA.md`

---

## 🔧 Step 4: Backend Implementation

### Creating a Query

```typescript
export const myQuery = query({
  args: {
    /* validators */
  },
  handler: async (ctx, args) => {
    // 1. Auth check (if required)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 2. Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    // 3. Query data WITH INDEX
    const data = await ctx.db
      .query("table")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return data;
  },
});
```

**Checklist:**

- [ ] Authentication checked (if required)
- [ ] Query uses index (no full table scan)
- [ ] Validators for all arguments
- [ ] Error handling with descriptive messages
- [ ] Return type is clear

### Creating a Mutation

```typescript
export const myMutation = mutation({
  args: {
    /* validators */
  },
  handler: async (ctx, args) => {
    // 1. Auth check
    // 2. Validate business logic
    // 3. Perform database operation
    // 4. Schedule side effects (if needed)

    if (needsSideEffect) {
      await ctx.scheduler.runAfter(0, internal.module.function, {
        userId: user._id,
      });
    }

    return result;
  },
});
```

**Checklist:**

- [ ] Authentication checked
- [ ] Input validation (beyond validators)
- [ ] Side effects use scheduler (async)
- [ ] Idempotent where possible
- [ ] Duplicate prevention (if applicable)

---

## 💻 Step 5: Frontend Implementation

### Creating a Component

1. **Location:**
   - Feature-specific: `components/FeatureName.tsx`
   - UI primitive: `components/ui/FeatureName.tsx`

2. **Pattern:**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function MyComponent() {
  const data = useQuery(api.module.myQuery);
  const mutate = useMutation(api.module.myMutation);

  if (data === undefined) return <Loading />;

  return (
    // Component JSX
  );
}
```

**Checklist:**

- [ ] "use client" directive (if uses hooks)
- [ ] Loading state handled
- [ ] Error state handled
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Mobile-responsive

### Creating a Page

**Location:** `app/feature-name/page.tsx`

**Pattern:**

```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feature Name | Pomo",
};

export default function FeaturePage() {
  return (
    <div className="container mx-auto">
      {/* Page content */}
    </div>
  );
}
```

---

## 📝 Step 6: Documentation

### Always Update:

- [ ] **File headers** - Add @fileoverview to new files
- [ ] **API docs** - `convex/API.md` (if new functions)
- [ ] **Schema docs** - `convex/SCHEMA.md` (if schema changed)

### Update if Applicable:

- [ ] **Architecture** - `ARCHITECTURE.md` (if pattern changed)
- [ ] **README** - `README.md` (if user-facing feature)
- [ ] **Setup guide** - `docs/setup/development.md` (if new dependency)

---

## 🧪 Step 7: Testing

### Manual Testing:

- [ ] Feature works in dev environment
- [ ] Works when signed in
- [ ] Works when signed out (if applicable)
- [ ] Works offline (if applicable)
- [ ] Mobile responsive
- [ ] No console errors

### Automated Testing:

**Add tests if:**

- Complex business logic
- Critical user path
- Bug-prone area
- Edge cases exist

**Test locations:**

- Backend: `convex/*.test.ts`
- E2E: `tests/e2e/*.spec.ts`

---

## ✅ Final Checklist

Before considering feature complete:

- [ ] Code implemented and working
- [ ] Documentation updated
- [ ] Tests added (if applicable)
- [ ] TypeScript compiles (`pnpm run typecheck`)
- [ ] Linting passes (`pnpm run lint:strict`)
- [ ] Manual testing completed
- [ ] Offline behavior considered
- [ ] Error handling complete
- [ ] No console warnings

---

## 🚀 Deployment Considerations

**Before deploying:**

- [ ] Schema changes are safe (additive only)
- [ ] Migration plan for breaking changes
- [ ] Environment variables set (if new ones)
- [ ] Feature flag if needed (for gradual rollout)

---

## 💡 Common Patterns

### Adding Offline Support

1. Save to localStorage first
2. Show in UI immediately
3. Sync to Convex in background
4. Handle sync failures gracefully
5. Retry with exponential backoff

### Adding Real-Time Updates

1. Use Convex query (auto-updates)
2. No manual polling needed
3. Consider optimistic updates for mutations

### Adding Authentication-Required Feature

1. Check auth on backend (always)
2. Show loading state while checking auth
3. Redirect to sign-in if not authenticated
4. Handle sign-in/sign-out transitions

---

**Remember:** Always follow existing patterns in the codebase. When in doubt, check similar features!
