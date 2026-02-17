"use client";

import { useState, useEffect, useId } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PodcastDetailPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const params = useParams();
  const podcastId = params.id as string;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const selectAllId = useId();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const result = useQuery(
    api.episodes.unlistenedEpisodesForPodcast,
    isAuthenticated ? { podcastId: podcastId as Id<"podcasts"> } : "skip"
  );

  const markManyListened = useMutation(api.episodes.markManyListened);

  // Clear selection when episodes change (e.g. after marking listened)
  const episodeIds = result?.episodes.map((e) => e._id).join(",") ?? "";
  useEffect(() => {
    setSelected(new Set());
  }, [episodeIds]);

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!result) return;
    setSelected(checked ? new Set(result.episodes.map((e) => e._id)) : new Set());
  };

  const handleMarkSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected) as Id<"episodes">[];
    await markManyListened({ episodeIds: ids });
    setAnnouncement(
      `${ids.length} ${ids.length === 1 ? "episode" : "episodes"} marked as listened`
    );
    setTimeout(() => setAnnouncement(""), 4000);
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  if (result === undefined) {
    return <p role="status" aria-live="polite">Loading podcast…</p>;
  }

  if (result === null) {
    return (
      <>
        <p className="text-gray-600 mb-4">Podcast not found or you are not subscribed.</p>
        <Link href="/podcasts" className="text-blue-700 underline">Back to Podcasts</Link>
      </>
    );
  }

  const { podcast, episodes } = result;
  const allSelected = episodes.length > 0 && selected.size === episodes.length;
  const someSelected = selected.size > 0 && selected.size < episodes.length;

  return (
    <>
      {/* Live region for action announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Back link */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/podcasts" className="text-blue-700 underline text-sm">
          ← Your Podcasts
        </Link>
      </nav>

      {/* Podcast header */}
      <header className="flex gap-4 mb-8">
        {podcast.imageUrl ? (
          <div className="flex-shrink-0 w-24 h-24 relative">
            <Image
              src={podcast.imageUrl}
              alt={`Cover art for ${podcast.title}`}
              fill
              className="rounded object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div
            className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-4xl">🎙️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{podcast.title}</h1>
          {podcast.author && (
            <p className="text-sm text-gray-600 mb-1">
              <span className="sr-only">Author: </span>
              {podcast.author}
            </p>
          )}
          {podcast.description && (
            <p className="text-sm text-gray-700 line-clamp-3">{podcast.description}</p>
          )}
        </div>
      </header>

      {episodes.length === 0 ? (
        <section aria-label="No unlistened episodes">
          <p className="text-gray-600 text-lg">
            No unlistened episodes — you&rsquo;re all caught up for this podcast!
          </p>
        </section>
      ) : (
        <section aria-label="Unlistened episodes">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Unlistened episodes
              <span className="ml-2 text-base font-normal text-gray-500">
                ({episodes.length})
              </span>
            </h2>
            <button
              type="button"
              onClick={handleMarkSelected}
              disabled={selected.size === 0}
              aria-label={
                selected.size === 0
                  ? "No episodes selected"
                  : `Mark ${selected.size} selected ${selected.size === 1 ? "episode" : "episodes"} as listened`
              }
              className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selected.size === 0
                ? "Mark selected as listened"
                : `Mark ${selected.size} selected as listened`}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" aria-label={`Episodes of ${podcast.title}`}>
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th scope="col" className="py-3 pr-4 w-10">
                    <label htmlFor={selectAllId} className="sr-only">
                      {allSelected ? "Deselect all episodes" : "Select all episodes"}
                    </label>
                    <input
                      id={selectAllId}
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-400 text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
                      aria-label={allSelected ? "Deselect all episodes" : "Select all episodes"}
                    />
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold">Title</th>
                  <th scope="col" className="py-3 pr-4 font-semibold whitespace-nowrap">Published</th>
                  <th scope="col" className="py-3 font-semibold whitespace-nowrap">Duration</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((episode) => {
                  const isChecked = selected.has(episode._id);
                  const publishedDate = new Date(episode.publishedAt);
                  const relativeTime = formatDistanceToNow(publishedDate, { addSuffix: true });
                  const fullDate = publishedDate.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                  return (
                    <tr
                      key={episode._id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isChecked ? "bg-blue-50" : ""}`}
                    >
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(episode._id)}
                          className="w-4 h-4 rounded border-gray-400 text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 cursor-pointer"
                          aria-label={`Select "${episode.title}"`}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900">{episode.title}</span>
                        {episode.description && (
                          <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                            {episode.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                        <time dateTime={publishedDate.toISOString()} title={fullDate}>
                          {relativeTime}
                        </time>
                      </td>
                      <td className="py-3 text-gray-600 whitespace-nowrap">
                        {episode.durationSeconds != null
                          ? formatDuration(episode.durationSeconds)
                          : <span aria-label="Duration unknown">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
