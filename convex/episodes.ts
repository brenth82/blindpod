import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const unlistenedFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return [];

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedIds = new Set(listenedRecords.map((r) => r.episodeId.toString()));

    const allEpisodes = (
      await Promise.all(
        subs.map((sub) =>
          ctx.db
            .query("episodes")
            .withIndex("by_podcast", (q) => q.eq("podcastId", sub.podcastId))
            .collect()
        )
      )
    ).flat();

    return allEpisodes
      .filter((ep) => !ep.isArchivedFromFeed && !listenedIds.has(ep._id.toString()))
      .sort((a, b) => b.publishedAt - a.publishedAt);
  },
});

export const archiveFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return [];

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedIds = new Set(listenedRecords.map((r) => r.episodeId.toString()));

    const allEpisodes = (
      await Promise.all(
        subs.map((sub) =>
          ctx.db
            .query("episodes")
            .withIndex("by_podcast", (q) => q.eq("podcastId", sub.podcastId))
            .collect()
        )
      )
    ).flat();

    return allEpisodes
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((ep) => ({ ...ep, listened: listenedIds.has(ep._id.toString()) }));
  },
});

export const markListened = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, { episodeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user_episode", (q) =>
        q.eq("userId", userId).eq("episodeId", episodeId)
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("listenedEpisodes", {
        userId,
        episodeId,
        listenedAt: Date.now(),
        positionSeconds: 0,
      });
    }
  },
});

export const markUnlistened = mutation({
  args: { episodeId: v.id("episodes") },
  handler: async (ctx, { episodeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user_episode", (q) =>
        q.eq("userId", userId).eq("episodeId", episodeId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
