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
    test("should create a new user when authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_123" });

      const userId = await asUser.mutation(api.users.ensureUser, {
        username: "testuser",
        avatarUrl: "https://example.com/avatar.jpg",
      });

      expect(userId).toBeDefined();

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

      const userId1 = await asUser.mutation(api.users.ensureUser, {
        username: "testuser",
      });

      const userId2 = await asUser.mutation(api.users.ensureUser, {
        username: "testuser",
      });

      expect(userId1).toBe(userId2);
    });

    test("should throw error if not authenticated", async () => {
      await expect(
        t.mutation(api.users.ensureUser, {
          username: "testuser",
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("should throw error if username is empty", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_789" });

      await expect(
        asUser.mutation(api.users.ensureUser, {
          username: "",
        })
      ).rejects.toThrow("Username cannot be empty");
    });

    test("should trim whitespace from username", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_101" });

      await asUser.mutation(api.users.ensureUser, {
        username: "  testuser  ",
      });

      const user = await asUser.query(api.users.me, {});
      expect(user?.username).toBe("testuser");
    });

    test("should work without avatarUrl (optional)", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_102" });

      const userId = await asUser.mutation(api.users.ensureUser, {
        username: "testuser",
      });

      expect(userId).toBeDefined();

      const user = await asUser.query(api.users.me, {});
      expect(user?.avatarUrl).toBeUndefined();
    });

    test("should prevent clerkId spoofing - different users get different records", async () => {
      const user1 = t.withIdentity({ subject: "clerk_user_alice" });
      const user2 = t.withIdentity({ subject: "clerk_user_bob" });

      const userId1 = await user1.mutation(api.users.ensureUser, {
        username: "alice",
      });

      const userId2 = await user2.mutation(api.users.ensureUser, {
        username: "bob",
      });

      // Different users should get different IDs
      expect(userId1).not.toBe(userId2);

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
        username: "currentuser",
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

      const userId = await asUser.mutation(api.users.ensureUser, {
        username: "targetuser",
      });

      const user = await asUser.query(api.users.getUser, { userId });

      expect(user).not.toBeNull();
      expect(user?.username).toBe("targetuser");
    });

    test("should throw error when not authenticated", async () => {
      const asUser = t.withIdentity({ subject: "clerk_user_get_2" });

      const userId = await asUser.mutation(api.users.ensureUser, {
        username: "someuser",
      });

      // Try to access without auth
      await expect(t.query(api.users.getUser, { userId })).rejects.toThrow("Not authenticated");
    });

    test("should allow one user to query another user's info", async () => {
      const user1 = t.withIdentity({ subject: "clerk_user_1" });
      const user2 = t.withIdentity({ subject: "clerk_user_2" });

      const user1Id = await user1.mutation(api.users.ensureUser, {
        username: "user1",
      });

      // User 2 can query user 1's info (useful for social features)
      const user1Info = await user2.query(api.users.getUser, {
        userId: user1Id,
      });

      expect(user1Info?.username).toBe("user1");
    });
  });
});
