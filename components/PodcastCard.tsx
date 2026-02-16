"use client";

import { memo } from "react";
import Image from "next/image";

interface Podcast {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  author?: string;
}

interface PodcastCardProps {
  podcast: Podcast;
  episodeCount?: number;
  onUnsubscribe?: (id: string) => void;
}

export const PodcastCard = memo(function PodcastCard({
  podcast,
  episodeCount,
  onUnsubscribe,
}: PodcastCardProps) {
  return (
    <article
      className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex gap-4"
      aria-label={`Podcast: ${podcast.title}`}
    >
      {podcast.imageUrl ? (
        <div className="flex-shrink-0 w-20 h-20 relative">
          <Image
            src={podcast.imageUrl}
            alt={`Cover art for ${podcast.title}`}
            fill
            className="rounded object-cover"
            sizes="80px"
          />
        </div>
      ) : (
        <div
          className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-3xl">🎙️</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 truncate">
          {podcast.title}
        </h3>
        {podcast.author && (
          <p className="text-sm text-gray-600">
            <span className="sr-only">Author: </span>
            {podcast.author}
          </p>
        )}
        {episodeCount !== undefined && (
          <p className="text-sm text-gray-500">
            {episodeCount} {episodeCount === 1 ? "episode" : "episodes"}
          </p>
        )}
        {podcast.description && (
          <p className="text-sm text-gray-700 mt-1 line-clamp-2">
            {podcast.description}
          </p>
        )}

        {onUnsubscribe && (
          <button
            onClick={() => onUnsubscribe(podcast._id)}
            className="mt-2 px-3 py-1.5 text-sm font-medium border border-red-300 text-red-700 rounded hover:bg-red-50 focus-visible:outline-red-600 transition-colors"
            aria-label={`Unsubscribe from ${podcast.title}`}
          >
            Unsubscribe
          </button>
        )}
      </div>
    </article>
  );
});
