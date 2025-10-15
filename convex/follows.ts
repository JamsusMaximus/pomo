/**
 * @fileoverview Social following system - follow/unfollow users and get follower counts
 * @module convex/follows
 *
 * Key responsibilities:
 * - Follow and unfollow users
 * - Get followers and following lists
 * - Check if current user follows another user
 * - Get follower/following counts
 *
 * Dependencies: Convex server runtime
 * Used by: app/profile/[username]/page.tsx, components/FollowButton.tsx
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Follow a user
 */
export const followUser = mutation({
  args: {
    usernameToFollow: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    const userToFollow = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.usernameToFollow))
      .first();

    if (!userToFollow) throw new Error("User to follow not found");

    // Can't follow yourself
    if (currentUser._id === userToFollow._id) {
      throw new Error("Cannot follow yourself");
    }

    // Check if already following
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", userToFollow._id)
      )
      .first();

    if (existing) {
      throw new Error("Already following this user");
    }

    // Create follow relationship
    await ctx.db.insert("follows", {
      followerId: currentUser._id,
      followingId: userToFollow._id,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Unfollow a user
 */
export const unfollowUser = mutation({
  args: {
    usernameToUnfollow: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    const userToUnfollow = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.usernameToUnfollow))
      .first();

    if (!userToUnfollow) throw new Error("User to unfollow not found");

    // Find the follow relationship
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", userToUnfollow._id)
      )
      .first();

    if (!existingFollow) {
      throw new Error("Not following this user");
    }

    // Delete the follow relationship
    await ctx.db.delete(existingFollow._id);

    return { success: true };
  },
});

/**
 * Check if current user follows a specific user
 */
export const isFollowing = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return false;

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!targetUser) return false;

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_following", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", targetUser._id)
      )
      .first();

    return !!follow;
  },
});

/**
 * Get follower and following counts for a user
 */
export const getFollowCounts = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return { followers: 0, following: 0 };
    }

    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    return {
      followers: followers.length,
      following: following.length,
    };
  },
});

/**
 * Get list of followers for a user
 */
export const getFollowers = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", user._id))
      .collect();

    const followerUsers = await Promise.all(follows.map((follow) => ctx.db.get(follow.followerId)));

    return followerUsers
      .filter((u) => u !== null)
      .map((u) => ({
        _id: u!._id,
        username: u!.username,
        avatarUrl: u!.avatarUrl,
      }));
  },
});

/**
 * Get list of users that a user is following
 */
export const getFollowing = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();

    const followingUsers = await Promise.all(
      follows.map((follow) => ctx.db.get(follow.followingId))
    );

    return followingUsers
      .filter((u) => u !== null)
      .map((u) => ({
        _id: u!._id,
        username: u!.username,
        avatarUrl: u!.avatarUrl,
      }));
  },
});

/**
 * Get enriched activity data for all users that the current user follows
 * Returns friend cards with stats and recent sessions
 */
export const getFriendsActivity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Get all users current user is following
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUser._id))
      .collect();

    if (follows.length === 0) return [];

    // Fetch enriched data for each friend in parallel
    const friendsData = await Promise.all(
      follows.map(async (follow) => {
        const friend = await ctx.db.get(follow.followingId);
        if (!friend) return null;

        // Get all friend's focus sessions for streak calculation
        const allSessions = await ctx.db
          .query("pomodoros")
          .withIndex("by_user", (q) => q.eq("userId", friend._id))
          .filter((q) => q.eq(q.field("mode"), "focus"))
          .collect();

        // Calculate current daily streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sortedSessions = [...allSessions].sort((a, b) => b.completedAt - a.completedAt);

        let dailyStreak = 0;
        const currentDate = new Date(today);
        let checkingDate = true;

        while (checkingDate) {
          currentDate.setHours(0, 0, 0, 0);
          const dateStart = currentDate.getTime();
          const dateEnd = dateStart + 24 * 60 * 60 * 1000;

          const hasSession = sortedSessions.some(
            (s) => s.completedAt >= dateStart && s.completedAt < dateEnd
          );

          if (hasSession) {
            dailyStreak++;
            currentDate.setDate(currentDate.getDate() - 1);
          } else if (currentDate.getTime() === today.getTime()) {
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            checkingDate = false;
          }
        }

        // Get 3 most recent focus sessions
        const recentSessions = sortedSessions.slice(0, 3).map((session) => ({
          tag: session.tag,
          duration: session.duration,
          completedAt: session.completedAt,
        }));

        // Get latest completed challenge
        const latestChallenge = await ctx.db
          .query("userChallenges")
          .withIndex("by_user_completed", (q) => q.eq("userId", friend._id).eq("completed", true))
          .order("desc")
          .first();

        let latestChallengeData = null;
        if (latestChallenge) {
          const challenge = await ctx.db.get(latestChallenge.challengeId);
          if (challenge) {
            latestChallengeData = {
              name: challenge.name,
              description: challenge.description,
              badge: challenge.badge,
              completedAt: latestChallenge.completedAt,
            };
          }
        }

        // Calculate level (using same logic as profile page)
        const levelConfigs = await ctx.db.query("levelConfig").withIndex("by_level").collect();
        const totalPomos = friend.totalPomos ?? 0;

        let currentLevel = 1;
        let levelTitle = "Beginner";

        if (levelConfigs.length > 0) {
          // Sort by threshold to ensure correct order
          const sortedConfigs = [...levelConfigs].sort((a, b) => a.threshold - b.threshold);

          // Find the highest level the user has reached
          for (const level of sortedConfigs) {
            if (totalPomos >= level.threshold) {
              currentLevel = level.level;
              levelTitle = level.title;
            } else {
              break;
            }
          }
        } else {
          // Fallback to default levels
          const defaultLevels = [
            { level: 1, title: "Beginner", threshold: 0 },
            { level: 2, title: "Novice", threshold: 2 },
            { level: 3, title: "Apprentice", threshold: 4 },
            { level: 4, title: "Adept", threshold: 8 },
            { level: 5, title: "Expert", threshold: 16 },
            { level: 6, title: "Master", threshold: 31 },
            { level: 7, title: "Grandmaster", threshold: 51 },
            { level: 8, title: "Legend", threshold: 76 },
            { level: 9, title: "Mythic", threshold: 106 },
            { level: 10, title: "Immortal", threshold: 141 },
          ];
          for (const level of defaultLevels) {
            if (totalPomos >= level.threshold) {
              currentLevel = level.level;
              levelTitle = level.title;
            }
          }
        }

        return {
          _id: friend._id,
          username: friend.username,
          avatarUrl: friend.avatarUrl,
          totalPomos: totalPomos,
          todayPomos: friend.todayPomos ?? 0,
          currentStreak: dailyStreak,
          level: currentLevel,
          levelTitle: levelTitle,
          recentSessions: recentSessions,
          latestChallenge: latestChallengeData,
        };
      })
    );

    // Filter out nulls and sort by most active today (pomos today desc, then total desc)
    return friendsData
      .filter((f) => f !== null)
      .sort((a, b) => {
        if (b!.todayPomos !== a!.todayPomos) {
          return b!.todayPomos - a!.todayPomos;
        }
        return b!.totalPomos - a!.totalPomos;
      });
  },
});
