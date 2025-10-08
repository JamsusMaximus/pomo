# Convex Backend Documentation

> **Last Updated:** [DATE]
> **Purpose:** Backend API reference, schema documentation, and conventions

> **🤖 UPDATE TRIGGERS:**
>
> - Add/remove/modify tables in `schema.ts` → Update "Schema Overview" section
> - Add/remove Convex functions → Update "API Reference" section
> - Change index strategy → Update "Index Strategy" section
> - Modify query/mutation patterns → Update "Conventions" section
> - Add scheduler usage → Update "Scheduler Usage" section
> - Change auth patterns → Update "Authentication" section

---

## Overview

[Brief description of the backend's role and capabilities]

---

## Schema Overview

### Tables

#### [Table Name]

**Purpose:** [What this table stores]

```typescript
{
  field1: v.string(),      // Description
  field2: v.number(),      // Description
  field3: v.optional(...)  // Description
}
```

**Indexes:**

- `index_name`: `["field1", "field2"]` - [Purpose of this index]

**Relationships:**

- Links to `other_table` via `fieldId`
- Referenced by `another_table`

[Repeat for each table]

### Table Relationships Diagram

```
[Visual representation of how tables relate]
```

---

## API Reference

### Queries

#### `functionName`

**Purpose:** [What this query does]

**Arguments:**

```typescript
{
  arg1: v.string(),        // Description
  arg2: v.optional(v.number())  // Description
}
```

**Returns:** `Promise<Type>` - [Description of return value]

**Example:**

```typescript
const data = useQuery(api.module.functionName, {
  arg1: "value",
  arg2: 42,
});
```

**Error cases:**

- [Error condition 1]
- [Error condition 2]

[Repeat for each query]

---

### Mutations

#### `functionName`

**Purpose:** [What this mutation does]

**Arguments:**

```typescript
{
  arg1: v.string(),        // Description
  arg2: v.number()         // Description
}
```

**Returns:** `Promise<Type>` - [Description of return value]

**Side effects:**

- [Side effect 1]
- [Side effect 2]

**Example:**

```typescript
const mutation = useMutation(api.module.functionName);
await mutation({
  arg1: "value",
  arg2: 42,
});
```

**Error cases:**

- [Error condition 1]
- [Error condition 2]

[Repeat for each mutation]

---

### Internal Mutations (Scheduler)

[Document any internal mutations used by the scheduler]

---

## Conventions

### Naming

- Queries: `getX`, `listX`, `findX`
- Mutations: `createX`, `updateX`, `deleteX`, `saveX`
- Internal: Prefix with `_` or in `internal` namespace

### Authentication

- All public functions check `ctx.auth.getUserIdentity()`
- Pattern:
  ```typescript
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  ```

### Error Handling

- Throw errors with descriptive messages
- Client catches and displays appropriately
- Common pattern: `throw new Error("User not found")`

### Validation

- Use Convex validators (`v.*`)
- Validate at function entry
- Return type-safe data

---

## Index Strategy

### Why These Indexes?

[Explain the overall indexing strategy]

### Common Query Patterns

- **Pattern 1:** `by_user` - [Used for...]
- **Pattern 2:** `by_user_and_date` - [Used for...]

### Adding New Indexes

[Guidelines for when and how to add indexes]

---

## Scheduler Usage

### Current Scheduled Tasks

- **Task 1:** [What it does and when it runs]
- **Task 2:** [What it does and when it runs]

### Scheduling Pattern

```typescript
await ctx.scheduler.runAfter(delay, internal.module.function, args);
```

---

## Testing

### Test Files

- `[file].test.ts` - [What it tests]

### Running Tests

```bash
npm run test
```

### Test Patterns

[Common testing patterns used in this project]

---

## Development Workflow

### Running Locally

```bash
npx convex dev
```

### Pushing Schema Changes

[Instructions for schema migrations]

### Debugging

[Tips for debugging Convex functions]

---

## Environment Variables

Set in Convex dashboard:

- `ENV_VAR_1` - [Purpose]
- `ENV_VAR_2` - [Purpose]

---

## Common Tasks

### Adding a New Table

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Adding a New Function

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Modifying Schema

1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## References

- [Convex Documentation](https://docs.convex.dev)
- [Project-specific resources]
