import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("users", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe("ensureUser", () => {
    test("should create a new user with auto-generated username when authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_123" });

      const result = await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
        lastName: "User",
        avatarUrl: "https://example.com/avatar.jpg",
      });

      expect(result.userId).toBeDefined();
      expect(result.username).toBe("testuser");
      expect(result.isNew).toBe(true);

      // Verify user was created
      const user = await asUser.query(api.users.me, {});
      expect(user).not.toBeNull();
      expect(user?.username).toBe("testuser");
      expect(user?.clerkId).toBe("clerk_user_123");
      expect(user?.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(user?.createdAt).toBeGreaterThan(0);
    });

    test("should return existing user ID if user already exists (idempotent)", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_456" });

      const result1 = await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
        lastName: "User",
      });

      const result2 = await asUser.mutation(api.users.ensureUser, {
        firstName: "Different",
        lastName: "Name",
      });

      expect(result1.userId).toBe(result2.userId);
      expect(result1.isNew).toBe(true);
      expect(result2.isNew).toBe(false); // Second call returns existing user
    });

    test("should throw error if not authenticated", async () => {
      await expect(
        t.mutation(api.users.ensureUser, {
          firstName: "Test",
          lastName: "User",
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("should generate username with numbers if duplicate exists", async () => {
      const user1 = t.withIdentity({ subject: "clerk_user_789" });
      const user2 = t.withIdentity({ subject: "clerk_user_790" });

      const result1 = await user1.mutation(api.users.ensureUser, {
        firstName: "James",
        lastName: "McAulay",
      });

      const result2 = await user2.mutation(api.users.ensureUser, {
        firstName: "James",
        lastName: "McAulay",
      });

      expect(result1.username).toBe("jamesmcaulay");
      expect(result2.username).toBe("jamesmcaulay1");

      const user1Data = await user1.query(api.users.me, {});
      const user2Data = await user2.query(api.users.me, {});

      expect(user1Data?.username).toBe("jamesmcaulay");
      expect(user2Data?.username).toBe("jamesmcaulay1");
    });

    test("should sanitize username (remove non-alphanumeric)", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_101" });

      const result = await asUser.mutation(api.users.ensureUser, {
        firstName: "John-Paul",
        lastName: "O'Connor",
      });

      expect(result.username).toBe("johnpauloconnor");

      const user = await asUser.query(api.users.me, {});
      expect(user?.username).toBe("johnpauloconnor");
    });

    test("should work without avatarUrl (optional)", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_102" });

      const result = await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      expect(result.userId).toBeDefined();
      expect(result.username).toBe("test");

      const user = await asUser.query(api.users.me, {});
      expect(user?.avatarUrl).toBeUndefined();
      expect(user?.username).toBe("test");
    });

    test("should prevent clerkId spoofing - different users get different records", async () => {
      const user1 = t.withIdentity({ subject: "clerk_user_alice" });
      const user2 = t.withIdentity({ subject: "clerk_user_bob" });

      const result1 = await user1.mutation(api.users.ensureUser, {
        firstName: "Alice",
      });

      const result2 = await user2.mutation(api.users.ensureUser, {
        firstName: "Bob",
      });

      // Different users should get different IDs
      expect(result1.userId).not.toBe(result2.userId);

      // Each user should only see their own data
      const aliceUser = await user1.query(api.users.me, {});
      const bobUser = await user2.query(api.users.me, {});

      expect(aliceUser?.username).toBe("alice");
      expect(bobUser?.username).toBe("bob");
      expect(aliceUser?.clerkId).toBe("clerk_user_alice");
      expect(bobUser?.clerkId).toBe("clerk_user_bob");
    });
  });

  describe("me", () => {
    test("should return current user when authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_me_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Current",
        lastName: "User",
        avatarUrl: "https://example.com/me.jpg",
      });

      const me = await asUser.query(api.users.me, {});

      expect(me).not.toBeNull();
      expect(me?.username).toBe("currentuser");
      expect(me?.clerkId).toBe("clerk_user_me_1");
    });

    test("should return null when not authenticated", async () => {
      const me = await t.query(api.users.me, {});
      expect(me).toBeNull();
    });

    test("should return null for user that doesn't exist yet", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_new" });
      const me = await asUser.query(api.users.me, {});
      expect(me).toBeNull();
    });
  });

  describe("getUser", () => {
    test("should return user by ID when authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_get_1" });

      const result = await asUser.mutation(api.users.ensureUser, {
        firstName: "Target",
        lastName: "User",
      });

      const user = await asUser.query(api.users.getUser, { userId: result.userId });

      expect(user).not.toBeNull();
      expect(user?.username).toBe("targetuser");
    });

    test("should throw error when not authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_get_2" });

      const result = await asUser.mutation(api.users.ensureUser, {
        firstName: "Some",
        lastName: "User",
      });

      // Try to access without auth
      await expect(t.query(api.users.getUser, { userId: result.userId })).rejects.toThrow(
        "Not authenticated"
      );
    });

    test("should allow one user to query another user's info", async () => {
      const user1 = t.withIdentity({ subject: "clerk_user_1" });
      const user2 = t.withIdentity({ subject: "clerk_user_2" });

      const result = await user1.mutation(api.users.ensureUser, {
        firstName: "User",
        lastName: "One",
      });

      // User 2 can query user 1's info (useful for social features)
      const user1Info = await user2.query(api.users.getUser, {
        userId: result.userId,
      });

      expect(user1Info?.username).toBe("userone");
    });
  });
});
