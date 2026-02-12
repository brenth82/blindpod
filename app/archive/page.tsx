"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EpisodeCard } from "@/components/EpisodeCard";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function ArchivePage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const episodes = useQuery(
    api.episodes.archiveFeed,
    isAuthenticated ? {} : "skip"
  );

  const markListened = useMutation(api.episodes.markListened);
  const markUnlistened = useMutation(api.episodes.markUnlistened);

  const handleMarkListened = async (episodeId: string) => {
    await markListened({ episodeId: episodeId as Id<"episodes"> });
  };

  const handleMarkUnlistened = async (episodeId: string) => {
    await markUnlistened({ episodeId: episodeId as Id<"episodes"> });
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Archive</h1>
      <p className="text-gray-600 mb-6">
        All episodes from your subscribed podcasts, including those you&rsquo;ve already listened to.
      </p>

      {episodes === undefined ? (
        <p role="status" aria-live="polite">Loading episodes…</p>
      ) : episodes.length === 0 ? (
        <section aria-label="Empty archive">
          <p className="text-gray-600 text-lg mb-4">
            No episodes yet.{" "}
            <Link href="/podcasts/add" className="underline text-blue-700">Add a podcast</Link>{" "}
            to get started.
          </p>
        </section>
      ) : (
        <section aria-label="All episodes">
          <p className="text-gray-600 mb-6" aria-live="polite">
            {episodes.length} {episodes.length === 1 ? "episode" : "episodes"} total
          </p>
          <ol className="space-y-4 list-none p-0" aria-label="Episode list">
            {episodes.map((episode) => (
              <li key={episode._id}>
                <EpisodeCard
                  episode={episode}
                  listened={episode.listened}
                  onMarkListened={!episode.listened ? handleMarkListened : undefined}
                  onMarkUnlistened={episode.listened ? handleMarkUnlistened : undefined}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
