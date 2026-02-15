import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Internal mutation called from podcastActions.ts (Node runtime)
export const upsertPodcastAndSubscribe = mutation({
  args: {
    rssUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    episodes: v.array(
      v.object({
        guid: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        audioUrl: v.string(),
        durationSeconds: v.optional(v.number()),
        publishedAt: v.number(),
      })
    ),
    userId: v.id("users"),
    markAllListened: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let podcastId: string;
    const existing = await ctx.db
      .query("podcasts")
      .withIndex("by_rss_url", (q) => q.eq("rssUrl", args.rssUrl))
      .unique();

    if (existing) {
      podcastId = existing._id;
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        imageUrl: args.imageUrl,
        author: args.author,
        lastFetchedAt: Date.now(),
      });
    } else {
      podcastId = await ctx.db.insert("podcasts", {
        rssUrl: args.rssUrl,
        title: args.title,
        description: args.description,
        imageUrl: args.imageUrl,
        author: args.author,
        lastFetchedAt: Date.now(),
      });
    }

    for (const ep of args.episodes) {
      const existingEp = await ctx.db
        .query("episodes")
        .withIndex("by_podcast_guid", (q) =>
          q.eq("podcastId", podcastId as any).eq("guid", ep.guid)
        )
        .unique();

      if (!existingEp) {
        await ctx.db.insert("episodes", {
          podcastId: podcastId as any,
          guid: ep.guid,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          durationSeconds: ep.durationSeconds,
          publishedAt: ep.publishedAt,
          isArchivedFromFeed: false,
        });
      }
    }

    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_podcast", (q) =>
        q.eq("userId", args.userId).eq("podcastId", podcastId as any)
      )
      .unique();

    if (!existingSub) {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        podcastId: podcastId as any,
        notificationsEnabled: false,
        subscribedAt: Date.now(),
      });
    }

    // If the user wants all existing episodes marked as listened and archived,
    // bulk-insert listenedEpisodes records and archive every episode now.
    if (args.markAllListened) {
      const allEpisodes = await ctx.db
        .query("episodes")
        .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId as any))
        .collect();
      const now = Date.now();
      for (const ep of allEpisodes) {
        // Archive so these don't appear as new unlistened content
        await ctx.db.patch(ep._id, { isArchivedFromFeed: true });

        // Only insert a listened record if one doesn't already exist
        const alreadyListened = await ctx.db
          .query("listenedEpisodes")
          .withIndex("by_user_episode", (q) =>
            q.eq("userId", args.userId).eq("episodeId", ep._id)
          )
          .unique();
        if (!alreadyListened) {
          await ctx.db.insert("listenedEpisodes", {
            userId: args.userId,
            episodeId: ep._id,
            listenedAt: now,
            positionSeconds: 0,
          });
        }
      }
    }

    return podcastId;
  },
});

export const subscribedPodcasts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const podcasts = await Promise.all(
      subs.map((sub) => ctx.db.get(sub.podcastId))
    );

    return podcasts.filter(Boolean);
  },
});

export const unsubscribe = mutation({
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

    if (sub) {
      await ctx.db.delete(sub._id);
    }
  },
});

// --- Internal functions for cron-based feed refresh ---

export const getAllPodcasts = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("podcasts").collect();
  },
});

export const refreshPodcastFeed = internalMutation({
  args: {
    podcastId: v.id("podcasts"),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    episodes: v.array(
      v.object({
        guid: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        audioUrl: v.string(),
        durationSeconds: v.optional(v.number()),
        publishedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Update podcast metadata
    await ctx.db.patch(args.podcastId, {
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      author: args.author,
      lastFetchedAt: Date.now(),
    });

    const feedGuids = new Set(args.episodes.map((e) => e.guid));

    // Insert new episodes (skip existing)
    for (const ep of args.episodes) {
      const existing = await ctx.db
        .query("episodes")
        .withIndex("by_podcast_guid", (q) =>
          q.eq("podcastId", args.podcastId).eq("guid", ep.guid)
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("episodes", {
          podcastId: args.podcastId,
          guid: ep.guid,
          title: ep.title,
          description: ep.description,
          audioUrl: ep.audioUrl,
          durationSeconds: ep.durationSeconds,
          publishedAt: ep.publishedAt,
          isArchivedFromFeed: false,
        });
      }
    }

    // Archive episodes that are no longer in the RSS feed
    const allEpisodes = await ctx.db
      .query("episodes")
      .withIndex("by_podcast", (q) => q.eq("podcastId", args.podcastId))
      .collect();

    for (const ep of allEpisodes) {
      if (!feedGuids.has(ep.guid) && !ep.isArchivedFromFeed) {
        await ctx.db.patch(ep._id, { isArchivedFromFeed: true });
      }
    }
  },
});
