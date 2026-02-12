"use client";

import { useState, useId, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

export default function AddPodcastPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  const [rssUrl, setRssUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const urlId = useId();
  const errorId = useId();
  const statusId = useId();

  const convexUser = useQuery(
    api.users.getUserByEmail,
    session?.user?.email ? { email: session.user.email } : "skip"
  );
  const userId = convexUser?._id as Id<"users"> | undefined;

  const addPodcast = useAction(api.podcasts.addPodcast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!userId) {
      setError("You must be logged in to add a podcast.");
      return;
    }

    const url = rssUrl.trim();
    if (!url) {
      setError("Please enter an RSS feed URL.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (e.g. https://feeds.example.com/podcast).");
      return;
    }

    setIsLoading(true);
    try {
      await addPodcast({ rssUrl: url, userId });
      setSuccess("Podcast added successfully! Redirecting to your podcasts…");
      setRssUrl("");
      setTimeout(() => router.push("/podcasts"), 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add podcast. Please check the URL and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending || !session) {
    return (
      <p role="status" aria-live="polite">
        Loading…
      </p>
    );
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex gap-2 text-sm text-gray-600 list-none p-0">
          <li>
            <Link href="/podcasts" className="underline text-blue-700">
              Podcasts
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Add podcast</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-bold mb-2">Add a podcast</h1>
      <p className="text-gray-600 mb-6">
        Paste the RSS feed URL of the podcast you want to subscribe to.
      </p>

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          id={statusId}
          role="status"
          aria-live="polite"
          className="mb-4 p-3 bg-green-50 border border-green-300 text-green-800 rounded"
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 max-w-lg"
        noValidate
        aria-describedby={error ? errorId : success ? statusId : undefined}
      >
        <div>
          <label
            htmlFor={urlId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            RSS feed URL
          </label>
          <input
            id={urlId}
            type="url"
            value={rssUrl}
            onChange={(e) => setRssUrl(e.target.value)}
            required
            placeholder="https://feeds.example.com/podcast"
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            aria-required="true"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
          aria-disabled={isLoading}
        >
          {isLoading ? "Fetching podcast…" : "Add podcast"}
        </button>

        {isLoading && (
          <p role="status" aria-live="polite" className="text-sm text-gray-600">
            Fetching and parsing the RSS feed. This may take a moment…
          </p>
        )}
      </form>
    </>
  );
}
