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
 * Dependencies: Convex server runtime, streak-helpers.ts, time-helpers.ts
 * Used by: app/profile/[username]/page.tsx, components/FollowButton.tsx
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { calculateStreaks } from "./streak-helpers";
import { getStartOfDay } from "./time-helpers";

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
 * Get default level configuration
 * Used as fallback if database has no level configs
 */
function getDefaultLevelConfig() {
  return [
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
}

/**
 * Calculate level from total pomodoros
 * Optimized to accept pre-fetched level configs (avoids N+1 query)
 */
function calculateLevel(
  totalPomos: number,
  levelConfigs: Array<{ level: number; title: string; threshold: number }>
): { currentLevel: number; levelTitle: string } {
  let currentLevel = 1;
  let levelTitle = "Beginner";

  if (levelConfigs.length > 0) {
    // Already sorted by threshold
    for (const level of levelConfigs) {
      if (totalPomos >= level.threshold) {
        currentLevel = level.level;
        levelTitle = level.title;
      } else {
        break;
      }
    }
  } else {
    // Fallback to default levels
    const defaultLevels = getDefaultLevelConfig();
    for (const level of defaultLevels) {
      if (totalPomos >= level.threshold) {
        currentLevel = level.level;
        levelTitle = level.title;
      }
    }
  }

  return { currentLevel, levelTitle };
}

/**
 * Helper function to get enriched user data
 * Optimized to accept pre-fetched level configs and challenge map to avoid N+1 queries
 *
 * @param ctx - Query context
 * @param friend - User document
 * @param levelConfigs - Pre-fetched level configurations (shared across all friends)
 * @param challengeMap - Pre-fetched challenge definitions (shared across all friends)
 */
async function getEnrichedUserData(
  ctx: QueryCtx,
  friend: Doc<"users">,
  levelConfigs: Array<{ level: number; title: string; threshold: number }>,
  challengeMap: Map<Id<"challenges">, Doc<"challenges">>
) {
  // Get all friend's focus sessions for stats
  const allSessions = await ctx.db
    .query("pomodoros")
    .withIndex("by_user", (q) => q.eq("userId", friend._id))
    .filter((q) => q.eq(q.field("mode"), "focus"))
    .collect();

  // Calculate today's pomos using optimized time helper
  const todayStart = getStartOfDay();
  const todayPomos = allSessions.filter((s) => s.completedAt >= todayStart).length;

  // Calculate total pomos
  const totalPomos = allSessions.length;

  // Calculate current daily streak using optimized helper
  const { daily: dailyStreak } = calculateStreaks(allSessions);

  // Get 3 most recent focus sessions (already sorted by completedAt desc from index)
  const sortedSessions = [...allSessions].sort((a, b) => b.completedAt - a.completedAt);
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
  if (latestChallenge && challengeMap.has(latestChallenge.challengeId)) {
    const challenge = challengeMap.get(latestChallenge.challengeId)!;
    latestChallengeData = {
      name: challenge.name,
      description: challenge.description,
      badge: challenge.badge,
      completedAt: latestChallenge.completedAt,
    };
  }

  // Calculate level using pre-fetched configs (no query!)
  const { currentLevel, levelTitle } = calculateLevel(totalPomos, levelConfigs);

  return {
    _id: friend._id,
    username: friend.username,
    avatarUrl: friend.avatarUrl,
    totalPomos,
    todayPomos,
    currentStreak: dailyStreak,
    level: currentLevel,
    levelTitle,
    recentSessions,
    latestChallenge: latestChallengeData,
  };
}

/**
 * Get enriched activity data for all users that the current user follows
 * Returns friend cards with stats and recent sessions
 *
 * OPTIMIZED: Pre-fetches level configs and challenges once instead of per-friend (N+1 fix)
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

    // OPTIMIZATION: Fetch level configs once (shared across all friends)
    const levelConfigDocs = await ctx.db.query("levelConfig").withIndex("by_level").collect();
    const levelConfigs = levelConfigDocs
      .sort((a, b) => a.threshold - b.threshold)
      .map((l) => ({ level: l.level, title: l.title, threshold: l.threshold }));

    // OPTIMIZATION: Fetch all challenges once (shared across all friends)
    const allChallenges = await ctx.db.query("challenges").collect();
    const challengeMap = new Map(allChallenges.map((c) => [c._id, c]));

    // Fetch enriched data for each friend in parallel
    const friendsData = await Promise.all(
      follows.map(async (follow) => {
        const friend = await ctx.db.get(follow.followingId);
        if (!friend) return null;
        return await getEnrichedUserData(ctx, friend, levelConfigs, challengeMap);
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

/**
 * Get all users on the platform as suggested friends
 * Excludes current user and users already being followed
 *
 * OPTIMIZED: Pre-fetches level configs and challenges once instead of per-user (N+1 fix)
 */
export const getSuggestedFriends = query({
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

    const followingIds = new Set(follows.map((f) => f.followingId));

    // Get all users on the platform
    const allUsers = await ctx.db.query("users").collect();

    // Filter out current user and already followed users
    const suggestedUsers = allUsers.filter(
      (user) => user._id !== currentUser._id && !followingIds.has(user._id)
    );

    // OPTIMIZATION: Fetch level configs once (shared across all users)
    const levelConfigDocs = await ctx.db.query("levelConfig").withIndex("by_level").collect();
    const levelConfigs = levelConfigDocs
      .sort((a, b) => a.threshold - b.threshold)
      .map((l) => ({ level: l.level, title: l.title, threshold: l.threshold }));

    // OPTIMIZATION: Fetch all challenges once (shared across all users)
    const allChallenges = await ctx.db.query("challenges").collect();
    const challengeMap = new Map(allChallenges.map((c) => [c._id, c]));

    // Fetch enriched data for each suggested friend in parallel
    const suggestedFriendsData = await Promise.all(
      suggestedUsers.map(async (user) => {
        return await getEnrichedUserData(ctx, user, levelConfigs, challengeMap);
      })
    );

    // Sort by most active today (pomos today desc, then total desc)
    return suggestedFriendsData
      .filter((f) => f !== null)
      .sort((a, b) => {
        if (b!.todayPomos !== a!.todayPomos) {
          return b!.todayPomos - a!.todayPomos;
        }
        return b!.totalPomos - a!.totalPomos;
      });
  },
});
