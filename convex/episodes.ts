import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const FEED_LIMIT = 50;

export const unlistenedFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { episodes: [], hasMore: false };

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return { episodes: [], hasMore: false };

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

    const filtered = allEpisodes
      .filter((ep) => !ep.isArchivedFromFeed && !listenedIds.has(ep._id.toString()))
      .sort((a, b) => b.publishedAt - a.publishedAt);

    return {
      episodes: filtered.slice(0, FEED_LIMIT),
      hasMore: filtered.length > FEED_LIMIT,
    };
  },
});

export const archiveFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { episodes: [], hasMore: false };

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return { episodes: [], hasMore: false };

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

    const sorted = allEpisodes
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((ep) => ({ ...ep, listened: listenedIds.has(ep._id.toString()) }));

    return {
      episodes: sorted.slice(0, limit),
      hasMore: sorted.length > limit,
    };
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

export const unlistenedEpisodesForPodcast = query({
  args: { podcastId: v.id("podcasts") },
  handler: async (ctx, { podcastId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_podcast", (q) =>
        q.eq("userId", userId).eq("podcastId", podcastId)
      )
      .unique();
    if (!sub) return null;

    const podcast = await ctx.db.get(podcastId);
    if (!podcast) return null;

    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
      .collect();

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedIds = new Set(listenedRecords.map((r) => r.episodeId.toString()));

    const unlistened = episodes
      .filter((ep) => !ep.isArchivedFromFeed && !listenedIds.has(ep._id.toString()))
      .sort((a, b) => b.publishedAt - a.publishedAt);

    return { podcast, episodes: unlistened };
  },
});

export const markManyListened = mutation({
  args: { episodeIds: v.array(v.id("episodes")) },
  handler: async (ctx, { episodeIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedIds = new Set(listenedRecords.map((r) => r.episodeId.toString()));

    const now = Date.now();
    await Promise.all(
      episodeIds
        .filter((id) => !listenedIds.has(id.toString()))
        .map((episodeId) =>
          ctx.db.insert("listenedEpisodes", {
            userId,
            episodeId,
            listenedAt: now,
            positionSeconds: 0,
          })
        )
    );
  },
});

export const markAllListenedForPodcast = mutation({
  args: { podcastId: v.id("podcasts") },
  handler: async (ctx, { podcastId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_podcast", (q) =>
        q.eq("userId", userId).eq("podcastId", podcastId)
      )
      .unique();
    if (!sub) throw new Error("Not subscribed to this podcast");

    const episodes = await ctx.db
      .query("episodes")
      .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
      .collect();

    const listenedRecords = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const listenedIds = new Set(listenedRecords.map((r) => r.episodeId.toString()));

    const now = Date.now();
    await Promise.all(
      episodes
        .filter((ep) => !ep.isArchivedFromFeed && !listenedIds.has(ep._id.toString()))
        .map((ep) =>
          ctx.db.insert("listenedEpisodes", {
            userId,
            episodeId: ep._id,
            listenedAt: now,
            positionSeconds: 0,
          })
        )
    );
  },
});

export const markAllListenedForFeed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subs.length === 0) return;

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

    const now = Date.now();
    await Promise.all(
      allEpisodes
        .filter((ep) => !ep.isArchivedFromFeed && !listenedIds.has(ep._id.toString()))
        .map((ep) =>
          ctx.db.insert("listenedEpisodes", {
            userId,
            episodeId: ep._id,
            listenedAt: now,
            positionSeconds: 0,
          })
        )
    );
  },
});
