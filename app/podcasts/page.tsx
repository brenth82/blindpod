"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PodcastCard } from "@/components/PodcastCard";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function PodcastsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const podcasts = useQuery(
    api.podcasts.subscribedPodcasts,
    isAuthenticated ? {} : "skip"
  );

  const unsubscribeMutation = useMutation(api.podcasts.unsubscribe);

  const handleUnsubscribe = async (podcastId: string) => {
    if (!window.confirm("Are you sure you want to unsubscribe from this podcast?")) return;
    await unsubscribeMutation({ podcastId: podcastId as Id<"podcasts"> });
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Your Podcasts</h1>
        <Link
          href="/podcasts/add"
          className="px-4 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 transition-colors text-sm"
        >
          Add podcast
        </Link>
      </div>

      {podcasts === undefined ? (
        <p role="status" aria-live="polite">Loading podcasts…</p>
      ) : podcasts.length === 0 ? (
        <section aria-label="No subscriptions">
          <p className="text-gray-600 text-lg mb-4">
            You haven&rsquo;t subscribed to any podcasts yet.
          </p>
          <Link
            href="/podcasts/add"
            className="inline-block px-4 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 transition-colors"
          >
            Add your first podcast
          </Link>
        </section>
      ) : (
        <section aria-label="Subscribed podcasts">
          <p className="text-gray-600 mb-4" aria-live="polite">
            {podcasts.length} {podcasts.length === 1 ? "podcast" : "podcasts"}
          </p>
          <ol className="space-y-4 list-none p-0" aria-label="Podcast list">
            {podcasts.map((podcast) =>
              podcast ? (
                <li key={podcast._id}>
                  <PodcastCard podcast={podcast} onUnsubscribe={handleUnsubscribe} />
                </li>
              ) : null
            )}
          </ol>
        </section>
      )}
    </>
  );
}
