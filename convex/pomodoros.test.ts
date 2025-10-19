import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

describe("pomodoros", () => {
  let t: ReturnType<typeof convexTest>;

  beforeEach(() => {
    t = convexTest(schema);
  });

  describe("saveSession", () => {
    test("should save a focus session and count it", async () => {
      const asUser = t.withIdentity({ subject: "user_save_1" });

      // Ensure user exists first
      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
        lastName: "User",
      });

      // Save a focus session
      const now = Date.now();
      const sessionId = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: now,
      });

      expect(sessionId).toBeDefined();

      // Verify session was saved
      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].mode).toBe("focus");
      expect(sessions[0].duration).toBe(25 * 60);

      // Verify today's count is 1
      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(1);
    });

    test("should save multiple sessions and count them correctly", async () => {
      const asUser = t.withIdentity({ subject: "user_save_2" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const now = Date.now();

      // Save first focus session
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: now - 3600000, // 1 hour ago
      });

      // Save second focus session
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: now, // now
      });

      // Verify today's count is 2
      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(2);

      // Verify all sessions are saved
      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });
      expect(sessions).toHaveLength(2);
      expect(sessions.filter((s) => s.mode === "focus")).toHaveLength(2);
    });

    test("should save session with tag", async () => {
      const asUser = t.withIdentity({ subject: "user_tag_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const sessionId = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        tag: "Deep Work",
        tagPrivate: false,
        completedAt: Date.now(),
      });

      expect(sessionId).toBeDefined();

      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });

      expect(sessions).toHaveLength(1);
      expect(sessions[0].tag).toBe("Deep Work");
      expect(sessions[0].tagPrivate).toBe(false);
    });

    test("should save break session", async () => {
      const asUser = t.withIdentity({ subject: "user_break_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const sessionId = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "break",
        duration: 5 * 60,
        completedAt: Date.now(),
      });

      expect(sessionId).toBeDefined();

      // Break sessions should NOT count toward getTodayCount
      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(0);

      // But should appear in session history
      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].mode).toBe("break");
    });

    test("should detect and prevent duplicate sessions", async () => {
      const asUser = t.withIdentity({ subject: "user_dup_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const completedAt = Date.now();

      // Save the same session twice
      const sessionId1 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt,
      });

      const sessionId2 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt, // Same timestamp
      });

      // Should return the same session ID
      expect(sessionId1).toBe(sessionId2);

      // Should only have 1 session in the database
      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });
      expect(sessions).toHaveLength(1);

      // Today's count should still be 1
      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(1);
    });

    test("should handle rapid successive sessions (within 1 second)", async () => {
      const asUser = t.withIdentity({ subject: "user_rapid_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const completedAt = Date.now();

      // Save sessions within 1 second window
      const sessionId1 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: completedAt,
      });

      const sessionId2 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: completedAt + 500, // 500ms later (within duplicate window)
      });

      // Should return the same session (duplicate detection)
      expect(sessionId1).toBe(sessionId2);

      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(1);
    });

    test("should save separate sessions when outside duplicate window", async () => {
      const asUser = t.withIdentity({ subject: "user_separate_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const completedAt = Date.now();

      // First session
      const sessionId1 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: completedAt,
      });

      // Second session 2 seconds later (outside duplicate window)
      const sessionId2 = await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: completedAt + 2000, // 2 seconds later
      });

      // Should be different session IDs
      expect(sessionId1).not.toBe(sessionId2);

      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(2);

      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });
      expect(sessions).toHaveLength(2);
    });

    test("should throw error when not authenticated", async () => {
      await expect(
        t.mutation(api.pomodoros.saveSession, {
          mode: "focus",
          duration: 25 * 60,
          completedAt: Date.now(),
        })
      ).rejects.toThrow("Not authenticated");
    });

    test("should throw error if user not found", async () => {
      const asUser = t.withIdentity({ subject: "user_not_exists" });

      // Try to save session without calling ensureUser first
      await expect(
        asUser.mutation(api.pomodoros.saveSession, {
          mode: "focus",
          duration: 25 * 60,
          completedAt: Date.now(),
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("getTodayCount", () => {
    test("should return 0 when no sessions exist", async () => {
      const asUser = t.withIdentity({ subject: "user_count_empty" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(0);
    });

    test("should only count focus sessions from today", async () => {
      const asUser = t.withIdentity({ subject: "user_count_today" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();

      const yesterday = todayStart - 24 * 60 * 60 * 1000;

      // Save a session from yesterday
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: yesterday,
      });

      // Save 2 sessions from today
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: todayStart + 3600000, // 1 hour after midnight
      });

      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: Date.now(), // now
      });

      // Save a break session today (should not count)
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "break",
        duration: 5 * 60,
        completedAt: Date.now(),
      });

      const count = await asUser.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(2); // Only today's focus sessions
    });

    test("should return 0 when not authenticated", async () => {
      const count = await t.query(api.pomodoros.getTodayCount, {});
      expect(count).toBe(0);
    });
  });

  describe("getMyPomodoros", () => {
    test("should return empty array when not authenticated", async () => {
      const sessions = await t.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });
      expect(sessions).toEqual([]);
    });

    test("should return user's sessions in descending order", async () => {
      const asUser = t.withIdentity({ subject: "user_list_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      // Save 3 sessions
      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: Date.now() - 7200000, // 2 hours ago
      });

      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: Date.now() - 3600000, // 1 hour ago
      });

      await asUser.mutation(api.pomodoros.saveSession, {
        mode: "focus",
        duration: 25 * 60,
        completedAt: Date.now(), // now
      });

      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 10,
      });

      expect(sessions).toHaveLength(3);
      // Should be in descending order (most recent first)
      expect(sessions[0].completedAt).toBeGreaterThan(sessions[1].completedAt);
      expect(sessions[1].completedAt).toBeGreaterThan(sessions[2].completedAt);
    });

    test("should respect limit parameter", async () => {
      const asUser = t.withIdentity({ subject: "user_limit_1" });

      await asUser.mutation(api.users.ensureUser, {
        firstName: "Test",
      });

      // Save 5 sessions
      for (let i = 0; i < 5; i++) {
        await asUser.mutation(api.pomodoros.saveSession, {
          mode: "focus",
          duration: 25 * 60,
          completedAt: Date.now() - i * 1000,
        });
      }

      const sessions = await asUser.query(api.pomodoros.getMyPomodoros, {
        limit: 3,
      });

      expect(sessions).toHaveLength(3);
    });
  });
});
