import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    // Return defaults if no profile row exists yet
    return profile ?? { notifyOnNewEpisodes: false };
  },
});

export const updateNotificationPreference = mutation({
  args: { notifyOnNewEpisodes: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        notifyOnNewEpisodes: args.notifyOnNewEpisodes,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        notifyOnNewEpisodes: args.notifyOnNewEpisodes,
      });
    }
  },
});

/**
 * Deletes the currently authenticated user and all data associated with them:
 * - userProfile
 * - listenedEpisodes
 * - subscriptions
 * - podcasts (and their episodes) that have no remaining subscribers
 * - auth records: authAccounts, authVerificationCodes, authSessions, authRefreshTokens
 * - the user record itself
 */
export const deleteCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // --- App data ---

    // Delete user profile
    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of profiles) await ctx.db.delete(p._id);

    // Delete listened episode records
    const listened = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const l of listened) await ctx.db.delete(l._id);

    // Collect subscribed podcast IDs before deleting subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const podcastIds = subscriptions.map((s) => s.podcastId);

    // Delete subscriptions
    for (const s of subscriptions) await ctx.db.delete(s._id);

    // For each podcast this user was subscribed to, delete it if no one else is subscribed
    for (const podcastId of podcastIds) {
      const remainingSubscriber = await ctx.db
        .query("subscriptions")
        .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
        .first();
      if (!remainingSubscriber) {
        const episodes = await ctx.db
          .query("episodes")
          .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
          .collect();
        for (const ep of episodes) await ctx.db.delete(ep._id);
        await ctx.db.delete(podcastId);
      }
    }

    // --- Auth data ---

    // Delete auth accounts and their verification codes
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    // Delete sessions and their refresh tokens
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionIdAndParentRefreshTokenId", (q) =>
          q.eq("sessionId", session._id)
        )
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    // Finally, delete the user record itself
    await ctx.db.delete(userId);
  },
});
