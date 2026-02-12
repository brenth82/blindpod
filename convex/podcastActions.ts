"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const addPodcast = action({
  args: { rssUrl: v.string() },
  handler: async (ctx, { rssUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

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
