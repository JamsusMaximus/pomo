# Schema Change Decision Tree

> Safe database schema modifications for Convex

---

## 🎯 Step 1: Identify Change Type

### What are you changing?

- **[Adding new table](#adding-new-table)** → Safe, zero downtime
- **[Adding optional field](#adding-optional-field)** → Safe, zero downtime
- **[Adding required field](#adding-required-field)** → ⚠️ Requires migration
- **[Adding index](#adding-index)** → Safe, auto-built
- **[Removing field](#removing-field)** → ⚠️ Breaking change
- **[Changing field type](#changing-field-type)** → ⚠️ Breaking change
- **[Renaming table/field](#renaming-tablefield)** → ⚠️ Breaking change

---

## ✅ Safe Changes (Zero Downtime)

### Adding New Table

**Steps:**

1. **Add to `convex/schema.ts`:**

```typescript
notifications: defineTable({
  userId: v.id("users"),
  message: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_read", ["userId", "read"]),
```

2. **Consider relationships:**
   - What tables does this relate to?
   - What indexes are needed for common queries?

3. **Schema auto-pushes:**
   - If `npx convex dev` is running
   - Check for "Schema pushed" message

4. **Update documentation:**

```bash
# Files to update:
- convex/SCHEMA.md          # Add table documentation
- ARCHITECTURE.md           # Update Data Model section
- convex/API.md             # When you add functions for this table
```

5. **Add functions:**

```typescript
// convex/notifications.ts
export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});
```

---

### Adding Optional Field

**Steps:**

1. **Add to schema:**

```typescript
users: defineTable({
  // ... existing fields
  phoneNumber: v.optional(v.string()),  // ← New optional field
}),
```

2. **Existing records are fine:**
   - They'll have `undefined` for new field
   - No migration needed

3. **Handle in code:**

```typescript
// Always check if field exists
if (user.phoneNumber) {
  // Use phone number
}
```

4. **Update documentation:**
   - `convex/SCHEMA.md` - Add field to table documentation

---

### Adding Index

**When to add:**

- Query doing full table scan (check Convex dashboard)
- Frequent filter on field
- Performance degrading with data growth

**Steps:**

1. **Add to schema:**

```typescript
pomodoros: defineTable({
  // ... fields
})
  .index("by_user", ["userId"])
  .index("by_tag", ["userId", "tag"]),  // ← New index
```

2. **Convex auto-builds:**
   - No downtime
   - May take time for large tables
   - Check dashboard for progress

3. **Use in queries:**

```typescript
// Before (slow)
await ctx.db
  .query("pomodoros")
  .filter((p) => p.userId === user._id && p.tag === "coding")
  .collect();

// After (fast)
await ctx.db
  .query("pomodoros")
  .withIndex("by_tag", (q) => q.eq("userId", user._id).eq("tag", "coding"))
  .collect();
```

---

## ⚠️ Changes Requiring Migration

### Adding Required Field

**Problem:** Existing records don't have this field

**Solution:** Two-phase deployment

**Phase 1: Add as optional**

```typescript
// schema.ts
users: defineTable({
  // ... existing
  displayName: v.optional(v.string()),  // ← Optional first
}),
```

**Phase 2: Backfill data**

```typescript
// Create migration script
export const backfillDisplayNames = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (!user.displayName) {
        await ctx.db.patch(user._id, {
          displayName: generateDisplayName(user),
        });
      }
    }

    console.log(`Backfilled ${users.length} users`);
  },
});
```

**Run migration:**

```bash
# In Convex dashboard → Functions → Run
# Select: backfillDisplayNames
# Click: Run
```

**Phase 3: Make required (future deployment)**

```typescript
// After all records have the field
users: defineTable({
  displayName: v.string(),  // ← Now required
}),
```

---

### Removing Field

**Problem:** Code may still reference old field

**Solution:** Three-phase removal

**Phase 1: Stop writing**

- Remove all code that writes to field
- Deploy and verify
- Wait for code rollout

**Phase 2: Make optional**

```typescript
// schema.ts - mark as optional
oldField: v.optional(v.string()),
```

**Phase 3: Remove from schema**

```typescript
// Remove field entirely
// Only after Phase 1 & 2 complete
```

---

### Changing Field Type

**Problem:** Existing data has wrong type

**Solution:** Add new field, migrate, remove old

**Phase 1: Add new field**

```typescript
// schema.ts
users: defineTable({
  createdAt_old: v.number(),           // Old field
  createdAt: v.optional(v.string()),   // New field (different type)
}),
```

**Phase 2: Backfill**

```typescript
export const migrateCreatedAt = internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      await ctx.db.patch(user._id, {
        createdAt: new Date(user.createdAt_old).toISOString(),
      });
    }
  },
});
```

**Phase 3: Update code**

- Change all references from `createdAt_old` to `createdAt`
- Deploy and verify

**Phase 4: Remove old field**

```typescript
// schema.ts - remove old field
users: defineTable({
  createdAt: v.string(),  // Only new field remains
}),
```

---

### Renaming Table/Field

**Problem:** Breaking change for all code

**Solution:** Similar to type change

**For tables:**

1. Create new table
2. Dual-write to both tables
3. Backfill old → new
4. Switch reads to new table
5. Stop writing to old table
6. Remove old table

**For fields:**

1. Add new field
2. Write to both fields
3. Backfill old → new
4. Read from new field
5. Stop writing old field
6. Remove old field

**⚠️ Complex - consider if rename is worth it!**

---

## 📋 Schema Change Checklist

### Before Making Changes:

- [ ] Identify change type (safe vs. breaking)
- [ ] Plan migration strategy (if breaking)
- [ ] Consider existing data
- [ ] Check what code will be affected

### During Changes:

- [ ] Update `convex/schema.ts`
- [ ] Verify schema pushes successfully
- [ ] Test affected queries/mutations
- [ ] Run migration (if needed)
- [ ] Verify data integrity

### After Changes:

- [ ] Update `convex/SCHEMA.md`
- [ ] Update `ARCHITECTURE.md` (Data Model section)
- [ ] Update `convex/API.md` (if functions changed)
- [ ] Update types in `types/` (if needed)
- [ ] Test all affected features
- [ ] Monitor Convex dashboard for errors

---

## 🎯 Best Practices

### Always Additive First

- Add fields as optional
- Add tables without removing old ones
- Add indexes (never breaks queries)

### Use Type-Safe Validators

```typescript
// Good - explicit types
userId: v.id("users"),
mode: v.union(v.literal("focus"), v.literal("break")),

// Bad - too permissive
userId: v.string(),
mode: v.string(),
```

### Index All User-Scoped Queries

```typescript
// Always index foreign keys
.index("by_user", ["userId"])

// Index common query patterns
.index("by_user_and_date", ["userId", "completedAt"])
```

### Document Relationships

```typescript
// In SCHEMA.md, document:
// - One user → Many pomodoros
// - One user → Many userChallenges
// - userChallenges → One challenge
```

---

## 🚨 Emergency Rollback

### If Schema Change Breaks Production:

1. **Revert schema change:**

```bash
git revert <commit-hash>
npx convex deploy
```

2. **Check data integrity:**
   - Open Convex dashboard
   - Verify no data loss
   - Check recent function logs

3. **Fix forward:**
   - Identify issue
   - Create proper migration
   - Test in dev first
   - Deploy with caution

---

## 💡 Common Scenarios

### Scenario: Add user preferences

**Safe approach:**

```typescript
// Phase 1: Add optional
preferences: v.optional(v.object({
  theme: v.string(),
  notifications: v.boolean(),
})),

// Phase 2: Set defaults
// Happens organically as users update settings
```

### Scenario: Change streak from number to object

**Migration required:**

```typescript
// Phase 1: Add new optional field
streakData: (v.optional(
  v.object({
    current: v.number(),
    best: v.number(),
    lastUpdated: v.number(),
  })
),
  // Phase 2: Backfill
  await ctx.db.patch(user._id, {
    streakData: {
      current: user.dailyStreak || 0,
      best: user.bestDailyStreak || 0,
      lastUpdated: Date.now(),
    },
  }));

// Phase 3: Remove old fields (future deployment)
```

---

**Remember:** When in doubt, go additive! You can always remove later.
