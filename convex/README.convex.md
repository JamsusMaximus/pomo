# Convex Backend Documentation

## Security Architecture

### Authentication Flow

All Convex functions use Clerk-provided authentication context:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");
const clerkId = identity.subject; // Securely obtained from Clerk JWT
```

**Why this is secure:**

- ✅ `clerkId` comes from Clerk's verified JWT token
- ✅ Cannot be spoofed by malicious clients
- ✅ Middleware validates tokens before reaching Convex
- ✅ Each request is authenticated independently

### Anti-Spoofing Protections

1. **No client-provided clerkId** - All identity comes from `ctx.auth`
2. **User isolation** - Each user can only access their own data via `me` query
3. **Idempotent operations** - Safe to call multiple times without side effects
4. **Input validation** - All inputs are validated before database operations

## Schema

### Users Table

```typescript
users: {
  clerkId: string,        // Unique Clerk user ID
  username: string,       // Display name
  avatarUrl?: string,     // Optional profile picture
  createdAt: number,      // Unix timestamp
}
```

**Indexes:**

- `by_clerk` - Fast lookups by Clerk ID

### Pomodoros Table

```typescript
pomodoros: {
  userId: Id<"users">,    // Foreign key to users
  tag?: string,           // Optional session tag
  duration: number,       // Session length in seconds
  mode: "focus" | "break",
  completedAt: number,    // Unix timestamp
}
```

**Indexes:**

- `by_user` - All sessions for a user
- `by_user_and_date` - Time-range queries

## API Functions

### `ensureUser`

**Purpose:** Creates or returns existing user record

**Security:**

- ✅ Uses `ctx.auth.getUserIdentity()` - cannot be spoofed
- ✅ Validates username is non-empty
- ✅ Trims whitespace from username
- ✅ Idempotent - safe to call multiple times

**Usage:**

```typescript
const userId = await ensureUser({
  username: "alice",
  avatarUrl: "https://example.com/avatar.jpg", // optional
});
```

**Tests:**

- ✅ Creates new user when authenticated
- ✅ Returns existing user ID (idempotency)
- ✅ Throws when not authenticated
- ✅ Validates empty usernames
- ✅ Trims whitespace
- ✅ Works without avatarUrl
- ✅ Prevents clerkId spoofing

### `me`

**Purpose:** Gets current authenticated user

**Security:**

- ✅ Uses `ctx.auth.getUserIdentity()`
- ✅ Returns `null` if not authenticated
- ✅ Users can only see their own data

**Usage:**

```typescript
const user = await me({});
if (!user) {
  // Not authenticated or user doesn't exist yet
}
```

**Tests:**

- ✅ Returns current user when authenticated
- ✅ Returns null when not authenticated
- ✅ Returns null for non-existent user

### `getUser`

**Purpose:** Gets any user by ID (for social features)

**Security:**

- ✅ Requires authentication
- ✅ Allows looking up other users (public info)

**Usage:**

```typescript
const user = await getUser({ userId: "j1..." });
```

**Tests:**

- ✅ Returns user by ID when authenticated
- ✅ Throws when not authenticated
- ✅ Allows cross-user lookups

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
```

### Test Coverage

All functions have comprehensive test coverage including:

- ✅ Happy path scenarios
- ✅ Error cases (unauthenticated, invalid input)
- ✅ Edge cases (empty strings, missing optional fields)
- ✅ Security scenarios (spoofing prevention)
- ✅ Idempotency verification

### Security Test Scenarios

**Spoofing Prevention:**

```typescript
test("should prevent clerkId spoofing - different users get different records");
```

- Creates two users with different Clerk identities
- Verifies each user only sees their own data
- Ensures user IDs are different

**Authentication Bypass Prevention:**

```typescript
test("should throw error if not authenticated");
```

- Attempts operations without authentication
- Verifies all protected operations fail gracefully

## Best Practices

### When to Use `ensureUser`

Call `ensureUser` on:

- ✅ First app load after Clerk authentication
- ✅ Sign-in/sign-up completion
- ✅ Before creating user-owned resources

It's safe to call multiple times - it's idempotent.

### Error Handling

All functions throw descriptive errors:

```typescript
try {
  await ensureUser({ username: "" });
} catch (error) {
  // Error: "Username cannot be empty"
}
```

### Type Safety

Convex generates TypeScript types automatically:

```typescript
import { api } from "@/convex/_generated/api";

// Fully typed!
const user = await client.query(api.users.me, {});
//    ^? { _id: Id<"users">, clerkId: string, ... } | null
```

## Deployment

### Development

```bash
npx convex dev
```

### Production

```bash
npx convex deploy
```

Environment variables are managed automatically by Convex CLI.

## Adding New Functions

1. **Add function to appropriate file** (e.g., `users.ts`)
2. **Use `ctx.auth.getUserIdentity()`** for authentication
3. **Validate all inputs** before database operations
4. **Write comprehensive tests** in `.test.ts` file
5. **Run `npm test`** to verify

## Common Pitfalls

❌ **Don't:** Accept `clerkId` as an argument

```typescript
// BAD - client can spoof this
args: {
  clerkId: v.string();
}
```

✅ **Do:** Get identity from context

```typescript
// GOOD - verified by Clerk
const identity = await ctx.auth.getUserIdentity();
const clerkId = identity.subject;
```

❌ **Don't:** Trust client-provided user IDs without verification
✅ **Do:** Verify ownership before operations

## Monitoring

All Convex functions are automatically monitored in the Convex dashboard:

- Request counts
- Error rates
- Execution times
- Database queries

Access at: https://dashboard.convex.dev/
