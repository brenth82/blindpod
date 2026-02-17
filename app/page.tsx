"use client";

import { useState, useEffect, useRef, createRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EpisodeCard } from "@/components/EpisodeCard";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const [confirmMarkAll, setConfirmMarkAll] = useState(false);
  const closeMarkAllDialog = () => setConfirmMarkAll(false);
  const markAllDialogRef = useFocusTrap(confirmMarkAll, closeMarkAllDialog);

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
  const markAllListenedForFeed = useMutation(api.episodes.markAllListenedForFeed);
  // Stable refs so EpisodeCard can focus the next article after marking listened
  const episodeRefs = useRef<Map<string, React.RefObject<HTMLElement | null>>>(new Map());

  const handleMarkListened = async (episodeId: string) => {
    await markListened({ episodeId: episodeId as Id<"episodes"> });
  };

  const handleMarkAllConfirm = async () => {
    await markAllListenedForFeed({});
    setConfirmMarkAll(false);
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Your Feed</h1>

      {/* Mark-all confirmation dialog */}
      {confirmMarkAll && (
        <div
          ref={markAllDialogRef}
          role="alertdialog"
          aria-labelledby="feed-mark-all-heading"
          aria-describedby="feed-mark-all-desc"
          className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded max-w-md"
        >
          <p id="feed-mark-all-heading" className="font-semibold text-blue-900 mb-1">
            Mark all episodes as listened?
          </p>
          <p id="feed-mark-all-desc" className="text-sm text-blue-800 mb-4">
            All unlistened episodes across all your podcasts will be marked as listened and removed from your feed.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleMarkAllConfirm}
              className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
            >
              Yes, mark all as listened
            </button>
            <button
              type="button"
              onClick={closeMarkAllDialog}
              className="px-4 py-2 text-sm text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <p className="text-gray-600" aria-live="polite">
              {feedHasMore
                ? <>Showing {episodes.length} most recent unlistened episodes — <Link href="/archive" className="underline text-blue-700">view all in Archive</Link></>
                : <>{episodes.length} unlistened {episodes.length === 1 ? "episode" : "episodes"}</>
              }
            </p>
            <button
              type="button"
              onClick={() => setConfirmMarkAll(true)}
              aria-label="Mark all episodes in feed as listened"
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Mark all as listened
            </button>
          </div>
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
