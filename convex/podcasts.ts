import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

// Internal mutation: upsert podcast + episodes and subscribe user
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
  },
  handler: async (ctx, args) => {
    // Upsert podcast
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

    // Upsert episodes
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

    // Subscribe user if not already subscribed
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

    return podcastId;
  },
});

// Action: fetch RSS, parse, store
export const addPodcast = action({
  args: { rssUrl: v.string(), userId: v.id("users") },
  handler: async (ctx, { rssUrl, userId }) => {
    // Dynamic import to avoid SSR issues
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();

    let feed;
    try {
      feed = await parser.parseURL(rssUrl);
    } catch (err) {
      throw new Error(
        `Failed to parse RSS feed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    const episodes = (feed.items ?? [])
      .filter((item) => item.enclosure?.url)
      .map((item) => ({
        guid: item.guid ?? item.link ?? item.title ?? String(Date.now()),
        title: item.title ?? "Untitled Episode",
        description: item.contentSnippet ?? item.content ?? undefined,
        audioUrl: item.enclosure!.url,
        durationSeconds: item.itunes?.duration
          ? parseDuration(item.itunes.duration)
          : undefined,
        publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
      }));

    await ctx.runMutation((internal as any).podcasts.upsertPodcastAndSubscribe, {
      rssUrl,
      title: feed.title ?? "Unknown Podcast",
      description: feed.description ?? undefined,
      imageUrl: feed.image?.url ?? (feed as any).itunes?.image ?? undefined,
      author: (feed as any).itunes?.author ?? undefined,
      episodes,
      userId,
    });
  },
});

function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(duration, 10) || 0;
}

export const subscribedPodcasts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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
  args: { podcastId: v.id("podcasts"), userId: v.id("users") },
  handler: async (ctx, { podcastId, userId }) => {
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
