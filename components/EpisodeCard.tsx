"use client";

import { useRef } from "react";
import { formatDistanceToNow } from "date-fns";

interface Episode {
  _id: string;
  title: string;
  description?: string;
  audioUrl: string;
  durationSeconds?: number;
  publishedAt: number;
  podcastTitle?: string;
}

interface EpisodeCardProps {
  episode: Episode;
  onMarkListened?: (id: string) => void;
  onMarkUnlistened?: (id: string) => void;
  listened?: boolean;
  nextRef?: React.RefObject<HTMLElement>;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function EpisodeCard({
  episode,
  onMarkListened,
  onMarkUnlistened,
  listened = false,
  nextRef,
}: EpisodeCardProps) {
  const articleRef = useRef<HTMLElement>(null);

  const handleMarkListened = () => {
    onMarkListened?.(episode._id);
    // Move focus to next episode after marking as listened
    if (nextRef?.current) {
      nextRef.current.focus();
    }
  };

  const publishedDate = new Date(episode.publishedAt);
  const relativeTime = formatDistanceToNow(publishedDate, { addSuffix: true });
  const fullDate = publishedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article
      ref={articleRef as React.RefObject<HTMLElement>}
      tabIndex={-1}
      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
      aria-label={`Episode: ${episode.title}`}
    >
      <header>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {episode.title}
        </h3>
        {episode.podcastTitle && (
          <p className="text-sm text-gray-600 mb-1">
            <span className="sr-only">Podcast: </span>
            {episode.podcastTitle}
          </p>
        )}
        <p className="text-sm text-gray-500">
          <time dateTime={publishedDate.toISOString()} title={fullDate}>
            {relativeTime}
          </time>
          {episode.durationSeconds != null && (
            <span>
              <span aria-hidden="true"> · </span>
              <span className="sr-only"> Duration: </span>
              {formatDuration(episode.durationSeconds)}
            </span>
          )}
          {listened && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Listened
            </span>
          )}
        </p>
      </header>

      {episode.description && (
        <p className="text-sm text-gray-700 mt-2 line-clamp-3">
          {episode.description}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {/* Native audio player — inherently accessible */}
        <audio
          controls
          src={episode.audioUrl}
          className="w-full"
          aria-label={`Audio player for ${episode.title}`}
          preload="none"
        >
          Your browser does not support the audio element. You can{" "}
          <a href={episode.audioUrl} download>
            download the episode
          </a>
          .
        </audio>

        <div className="flex gap-2">
          {!listened && onMarkListened && (
            <button
              onClick={handleMarkListened}
              className="px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-800 focus-visible:outline-blue-700 transition-colors"
              aria-label={`Mark "${episode.title}" as listened`}
            >
              Mark as listened
            </button>
          )}
          {listened && onMarkUnlistened && (
            <button
              onClick={() => onMarkUnlistened(episode._id)}
              className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus-visible:outline-gray-600 transition-colors"
              aria-label={`Mark "${episode.title}" as unlistened`}
            >
              Mark as unlistened
            </button>
          )}
          <a
            href={episode.audioUrl}
            download
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus-visible:outline-gray-600 transition-colors"
            aria-label={`Download "${episode.title}"`}
          >
            Download
          </a>
        </div>
      </div>
    </article>
  );
}
