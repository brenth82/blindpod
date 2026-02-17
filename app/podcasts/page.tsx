"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PodcastCard } from "@/components/PodcastCard";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

function generateOpml(podcasts: { title: string; rssUrl: string; author?: string; description?: string }[]): string {
  const dateCreated = new Date().toISOString();
  const outlines = podcasts
    .map((p) => {
      const text = p.title.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const xmlUrl = p.rssUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      return `      <outline type="rss" text="${text}" xmlUrl="${xmlUrl}" />`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Blindpod Subscriptions</title>
    <dateCreated>${dateCreated}</dateCreated>
  </head>
  <body>
    <outline text="Podcasts">
${outlines}
    </outline>
  </body>
</opml>`;
}

export default function PodcastsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const [confirmUnsubscribeId, setConfirmUnsubscribeId] = useState<string | null>(null);
  const [confirmMarkAllId, setConfirmMarkAllId] = useState<string | null>(null);
  const [opmlAnnouncement, setOpmlAnnouncement] = useState("");

  const closeUnsubscribeDialog = () => setConfirmUnsubscribeId(null);
  const closeMarkAllDialog = () => setConfirmMarkAllId(null);

  const unsubscribeDialogRef = useFocusTrap(
    confirmUnsubscribeId !== null,
    closeUnsubscribeDialog
  );
  const markAllDialogRef = useFocusTrap(
    confirmMarkAllId !== null,
    closeMarkAllDialog
  );

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
  const markAllListenedForPodcast = useMutation(api.episodes.markAllListenedForPodcast);

  const handleUnsubscribeConfirm = async () => {
    if (!confirmUnsubscribeId) return;
    await unsubscribeMutation({ podcastId: confirmUnsubscribeId as Id<"podcasts"> });
    setConfirmUnsubscribeId(null);
  };

  const handleMarkAllConfirm = async () => {
    if (!confirmMarkAllId) return;
    await markAllListenedForPodcast({ podcastId: confirmMarkAllId as Id<"podcasts"> });
    setConfirmMarkAllId(null);
  };

  const handleExportOpml = () => {
    if (!podcasts || podcasts.length === 0) return;
    const validPodcasts = podcasts.filter(
      (p): p is NonNullable<typeof p> & { rssUrl: string } =>
        p != null && typeof p.rssUrl === "string"
    );
    const xml = generateOpml(validPodcasts);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `blindpod-subscriptions-${date}.opml`;
    a.click();
    URL.revokeObjectURL(url);
    setOpmlAnnouncement(`Downloading OPML file with ${validPodcasts.length} subscription${validPodcasts.length === 1 ? "" : "s"}`);
    setTimeout(() => setOpmlAnnouncement(""), 4000);
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  const confirmingPodcast =
    confirmUnsubscribeId && podcasts
      ? podcasts.find((p) => p?._id === confirmUnsubscribeId)
      : null;

  const markAllPodcast =
    confirmMarkAllId && podcasts
      ? podcasts.find((p) => p?._id === confirmMarkAllId)
      : null;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Your Podcasts</h1>

      {/* Live region for OPML announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {opmlAnnouncement}
      </div>

      {/* Inline unsubscribe confirmation */}
      {confirmingPodcast && (
        <div
          ref={unsubscribeDialogRef}
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
              onClick={closeUnsubscribeDialog}
              className="px-4 py-2 text-sm text-gray-700 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline mark-all-listened confirmation */}
      {markAllPodcast && (
        <div
          ref={markAllDialogRef}
          role="alertdialog"
          aria-labelledby="mark-all-confirm-heading"
          aria-describedby="mark-all-confirm-desc"
          className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded max-w-md"
        >
          <p id="mark-all-confirm-heading" className="font-semibold text-blue-900 mb-1">
            Mark all episodes as listened?
          </p>
          <p id="mark-all-confirm-desc" className="text-sm text-blue-800 mb-4">
            All unlistened episodes of {markAllPodcast.title} will be marked as listened and removed from your feed.
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
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <p className="text-gray-600" aria-live="polite">
              {podcasts.length} {podcasts.length === 1 ? "podcast" : "podcasts"}
            </p>
            <button
              type="button"
              onClick={handleExportOpml}
              aria-label="Export subscriptions as OPML file"
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            >
              Export subscriptions (OPML)
            </button>
          </div>
          <ol className="space-y-4 list-none p-0" aria-label="Podcast list">
            {podcasts.map((podcast) =>
              podcast ? (
                <li key={podcast._id}>
                  <PodcastCard
                    podcast={podcast}
                    onUnsubscribe={(id) => setConfirmUnsubscribeId(id)}
                    onMarkAllListened={(id) => setConfirmMarkAllId(id)}
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
