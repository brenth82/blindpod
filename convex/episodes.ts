import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const unlistenedFeed = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get subscribed podcast IDs
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return [];

    const podcastIds = subs.map((s) => s.podcastId);

    // Get all listened episode IDs for this user
    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedEpisodeIds = new Set(
      listenedRecords.map((r) => r.episodeId.toString())
    );

    // Gather episodes from all subscribed podcasts
    const allEpisodes = (
      await Promise.all(
        podcastIds.map((podcastId) =>
          ctx.db
            .query("episodes")
            .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
            .collect()
        )
      )
    ).flat();

    // Filter out listened episodes and archived episodes, sort by publishedAt desc
    return allEpisodes
      .filter(
        (ep) =>
          !ep.isArchivedFromFeed &&
          !listenedEpisodeIds.has(ep._id.toString())
      )
      .sort((a, b) => b.publishedAt - a.publishedAt);
  },
});

export const archiveFeed = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return [];

    const podcastIds = subs.map((s) => s.podcastId);

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedEpisodeIds = new Set(
      listenedRecords.map((r) => r.episodeId.toString())
    );

    const allEpisodes = (
      await Promise.all(
        podcastIds.map((podcastId) =>
          ctx.db
            .query("episodes")
            .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
            .collect()
        )
      )
    ).flat();

    return allEpisodes
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((ep) => ({
        ...ep,
        listened: listenedEpisodeIds.has(ep._id.toString()),
      }));
  },
});

export const markListened = mutation({
  args: { episodeId: v.id("episodes"), userId: v.id("users") },
  handler: async (ctx, { episodeId, userId }) => {
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
  args: { episodeId: v.id("episodes"), userId: v.id("users") },
  handler: async (ctx, { episodeId, userId }) => {
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
