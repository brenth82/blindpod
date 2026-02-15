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

    // Lazily initialise Resend only when at least one notification needs sending
    let resend: InstanceType<typeof import("resend").Resend> | null = null;
    const getResend = async () => {
      if (!resend) {
        const { Resend } = await import("resend");
        resend = new Resend(process.env.AUTH_RESEND_KEY);
      }
      return resend;
    };

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

        const newEpisodes: { title: string; publishedAt: number }[] =
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

        // ── Notifications ───────────────────────────────────────────────
        // Only notify subscribers who:
        //   1. Have global notifications enabled (checked inside the query)
        //   2. Subscribed BEFORE the episode was published — this prevents
        //      bulk-imported backlog episodes from ever triggering emails.
        if (newEpisodes.length > 0) {
          const subscribers: { email: string; subscribedAt: number }[] =
            await ctx.runQuery(
              (internal as any).podcasts.getSubscribersForNotification,
              { podcastId: podcast._id }
            );

          if (subscribers.length > 0) {
            const client = await getResend();

            for (const ep of newEpisodes) {
              const eligible = subscribers.filter(
                (s) => s.subscribedAt < ep.publishedAt
              );
              if (eligible.length === 0) continue;

              await Promise.allSettled(
                eligible.map((s) =>
                  client.emails.send({
                    from: "Blindpod <noreply@validhit.com>",
                    to: [s.email],
                    subject: `New episode of ${podcast.title}: ${ep.title}`,
                    text: [
                      `A new episode of "${podcast.title}" is now available:`,
                      ``,
                      ep.title,
                      ``,
                      `Log in to Blindpod to listen.`,
                      ``,
                      `---`,
                      `To manage notification preferences, visit your Blindpod settings.`,
                    ].join("\n"),
                  })
                )
              );
            }
          }
        }

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
