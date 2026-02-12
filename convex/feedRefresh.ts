"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const refreshAllFeeds = internalAction({
  args: {},
  handler: async (ctx) => {
    const podcasts = await ctx.runQuery(
      (internal as any).podcasts.getAllPodcasts
    );

    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();

    let refreshed = 0;
    let failed = 0;

    for (const podcast of podcasts) {
      try {
        const feed = await parser.parseURL(podcast.rssUrl);

        const episodes = (feed.items ?? [])
          .filter((item: any) => item.enclosure?.url)
          .map((item: any) => ({
            guid: item.guid ?? item.link ?? item.title ?? String(Date.now()),
            title: item.title ?? "Untitled Episode",
            description: item.contentSnippet ?? item.content ?? undefined,
            audioUrl: item.enclosure.url as string,
            durationSeconds: item.itunes?.duration
              ? parseDuration(item.itunes.duration)
              : undefined,
            publishedAt: item.pubDate
              ? new Date(item.pubDate).getTime()
              : Date.now(),
          }));

        await ctx.runMutation((internal as any).podcasts.refreshPodcastFeed, {
          podcastId: podcast._id,
          title: (feed.title ?? podcast.title) as string,
          description: (feed.description ?? undefined) as string | undefined,
          imageUrl: (feed.image?.url ??
            (feed as any).itunes?.image ??
            undefined) as string | undefined,
          author: ((feed as any).itunes?.author ?? undefined) as
            | string
            | undefined,
          episodes,
        });

        refreshed++;
      } catch (err) {
        console.error(
          `Failed to refresh podcast ${podcast._id} (${podcast.rssUrl}):`,
          err
        );
        failed++;
      }
    }

    console.log(
      `Feed refresh complete: ${refreshed} refreshed, ${failed} failed`
    );
  },
});

function parseDuration(duration: string): number {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(duration, 10) || 0;
}
