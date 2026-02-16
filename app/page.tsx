"use client";

import { useEffect, useRef, createRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EpisodeCard } from "@/components/EpisodeCard";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const feedResult = useQuery(
    api.episodes.unlistenedFeed,
    isAuthenticated ? {} : "skip"
  );
  const episodes = feedResult?.episodes;
  const feedHasMore = feedResult?.hasMore ?? false;

  const markListened = useMutation(api.episodes.markListened);
  // Stable refs so EpisodeCard can focus the next article after marking listened
  const episodeRefs = useRef<Map<string, React.RefObject<HTMLElement | null>>>(new Map());

  const handleMarkListened = async (episodeId: string) => {
    await markListened({ episodeId: episodeId as Id<"episodes"> });
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Your Feed</h1>
      {episodes === undefined ? (
        <p role="status" aria-live="polite">Loading episodes…</p>
      ) : episodes.length === 0 ? (
        <section aria-label="Empty feed">
          <p className="text-gray-600 text-lg mb-4">
            No unlistened episodes. You&rsquo;re all caught up!
          </p>
          <p>
            Browse your{" "}
            <Link href="/podcasts" className="underline text-blue-700">Podcasts</Link>{" "}
            or{" "}
            <Link href="/podcasts/add" className="underline text-blue-700">add a new podcast</Link>.
          </p>
        </section>
      ) : (
        <section aria-label="Unlistened episodes">
          <p className="text-gray-600 mb-6" aria-live="polite">
            {feedHasMore
              ? <>Showing {episodes.length} most recent unlistened episodes — <Link href="/archive" className="underline text-blue-700">view all in Archive</Link></>
              : <>{episodes.length} unlistened {episodes.length === 1 ? "episode" : "episodes"}</>
            }
          </p>
          <ol className="space-y-4 list-none p-0" aria-label="Episode list">
            {episodes.map((episode, index) => {
              // createRef once per episode ID; stable across re-renders via the Map
              if (!episodeRefs.current.has(episode._id)) {
                episodeRefs.current.set(episode._id, createRef<HTMLElement>());
              }
              const thisRef = episodeRefs.current.get(episode._id)!;
              const nextEpisode = episodes[index + 1];
              const nextRef = nextEpisode
                ? episodeRefs.current.get(nextEpisode._id)
                : undefined;
              return (
                <li key={episode._id}>
                  <EpisodeCard
                    ref={thisRef}
                    episode={episode}
                    onMarkListened={handleMarkListened}
                    nextRef={nextRef}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
