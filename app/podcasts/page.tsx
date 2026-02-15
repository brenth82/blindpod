"use client";

import { useState, useEffect } from "react";
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

  const [confirmUnsubscribeId, setConfirmUnsubscribeId] = useState<string | null>(null);

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

  const handleUnsubscribeConfirm = async () => {
    if (!confirmUnsubscribeId) return;
    await unsubscribeMutation({ podcastId: confirmUnsubscribeId as Id<"podcasts"> });
    setConfirmUnsubscribeId(null);
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  const confirmingPodcast =
    confirmUnsubscribeId && podcasts
      ? podcasts.find((p) => p?._id === confirmUnsubscribeId)
      : null;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Your Podcasts</h1>

      {/* Inline unsubscribe confirmation */}
      {confirmingPodcast && (
        <div
          role="alertdialog"
          aria-labelledby="unsub-confirm-heading"
          aria-describedby="unsub-confirm-desc"
          className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded max-w-md"
        >
          <p id="unsub-confirm-heading" className="font-semibold text-yellow-900 mb-1">
            Unsubscribe from {confirmingPodcast.title}?
          </p>
          <p id="unsub-confirm-desc" className="text-sm text-yellow-800 mb-4">
            This will remove the podcast and all its episodes from your account.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleUnsubscribeConfirm}
              className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 transition-colors"
            >
              Yes, unsubscribe
            </button>
            <button
              type="button"
              onClick={() => setConfirmUnsubscribeId(null)}
              className="px-4 py-2 text-sm text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
                  <PodcastCard
                    podcast={podcast}
                    onUnsubscribe={(id) => setConfirmUnsubscribeId(id)}
                  />
                </li>
              ) : null
            )}
          </ol>
          <p className="mt-6">
            <Link
              href="/podcasts/add"
              className="text-blue-700 underline text-sm"
            >
              Add another podcast
            </Link>
          </p>
        </section>
      )}
    </>
  );
}
