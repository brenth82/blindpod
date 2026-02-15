"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

type ItunesResult = {
  collectionId?: number;
  trackId?: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  primaryGenreName?: string;
  trackCount?: number;
  feedUrl?: string;
};

export type PodcastSearchResult = {
  itunesId: number;
  title: string;
  author: string;
  artworkUrl: string;
  genre: string;
  episodeCount: number;
  feedUrl: string;
};

/**
 * Searches the iTunes Podcast directory. No API key required.
 * Only returns results that include a public RSS feedUrl.
 */
export const searchPodcasts = action({
  args: { query: v.string() },
  handler: async (_ctx, { query: q }): Promise<PodcastSearchResult[]> => {
    const url = new URL("https://itunes.apple.com/search");
    url.searchParams.set("term", q);
    url.searchParams.set("media", "podcast");
    url.searchParams.set("entity", "podcast");
    url.searchParams.set("limit", "20");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`iTunes search failed (${res.status})`);

    const data = (await res.json()) as { results?: ItunesResult[] };

    return (data.results ?? [])
      .filter((r): r is ItunesResult & { feedUrl: string } =>
        typeof r.feedUrl === "string" && r.feedUrl.length > 0
      )
      .map((r) => ({
        itunesId: r.collectionId ?? r.trackId ?? 0,
        title: r.collectionName ?? r.trackName ?? "Unknown podcast",
        author: r.artistName ?? "",
        artworkUrl: r.artworkUrl100 ?? "",
        genre: r.primaryGenreName ?? "",
        episodeCount: r.trackCount ?? 0,
        feedUrl: r.feedUrl,
      }));
  },
});

export const addPodcast = action({
  args: { rssUrl: v.string(), markAllListened: v.optional(v.boolean()) },
  handler: async (ctx, { rssUrl, markAllListened }) => {
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

    await ctx.runMutation((internal as any).podcasts.upsertPodcastAndSubscribe, {
      rssUrl,
      title: feed.title ?? "Unknown Podcast",
      description: feed.description ?? undefined,
      imageUrl: feed.image?.url ?? (feed as any).itunes?.image ?? undefined,
      author: (feed as any).itunes?.author ?? undefined,
      episodes: extractEpisodes(feed),
      userId,
      markAllListened: markAllListened ?? false,
    });
  },
});

/**
 * Imports a batch of RSS feeds server-side. The client passes the list of
 * { url, title } pairs (already parsed from the OPML file client-side) and
 * this action fetches + stores them all — keeping the browser free.
 *
 * Feeds are processed in batches of 10 concurrent requests so we don't
 * overwhelm RSS servers or hit Convex concurrency limits.
 */
export const importOpmlFeeds = action({
  args: {
    feeds: v.array(v.object({ url: v.string(), title: v.string() })),
    markAllListened: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { feeds, markAllListened }
  ): Promise<{ succeeded: number; failedTitles: string[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();

    let succeeded = 0;
    const failedTitles: string[] = [];

    const BATCH = 10;
    for (let i = 0; i < feeds.length; i += BATCH) {
      const batch = feeds.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async ({ url: rssUrl }) => {
          const feed = await parser.parseURL(rssUrl);
          await ctx.runMutation(
            (internal as any).podcasts.upsertPodcastAndSubscribe,
            {
              rssUrl,
              title: feed.title ?? "Unknown Podcast",
              description: feed.description ?? undefined,
              imageUrl:
                feed.image?.url ?? (feed as any).itunes?.image ?? undefined,
              author: (feed as any).itunes?.author ?? undefined,
              episodes: extractEpisodes(feed),
              userId,
              markAllListened: markAllListened ?? false,
            }
          );
        })
      );

      for (let j = 0; j < results.length; j++) {
        if (results[j].status === "fulfilled") {
          succeeded++;
        } else {
          failedTitles.push(batch[j].title);
        }
      }
    }

    return { succeeded, failedTitles };
  },
});

// ── Shared helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEpisodes(feed: any) {
  return (feed.items ?? [])
    .filter((item: any) => item.enclosure?.url)
    .map((item: any) => ({
      guid: item.guid ?? item.link ?? item.title ?? String(Date.now()),
      title: item.title ?? "Untitled Episode",
      description: item.contentSnippet ?? item.content ?? undefined,
      audioUrl: item.enclosure.url as string,
      durationSeconds: item.itunes?.duration
        ? parseDuration(item.itunes.duration)
        : undefined,
      publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
    }));
}

function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(duration, 10) || 0;
}
