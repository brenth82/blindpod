"use client";

import { useState, useId, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { PodcastSearchResult } from "@/convex/podcastActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Tab = "search" | "url" | "opml";

const TAB_ORDER: Tab[] = ["search", "url", "opml"];

type OpmlFeed = { url: string; title: string };

function parseOpml(content: string): OpmlFeed[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid OPML file — could not parse XML.");
  }
  const seen = new Set<string>();
  return Array.from(doc.querySelectorAll("outline[xmlUrl]"))
    .map((el) => ({
      url: el.getAttribute("xmlUrl") ?? "",
      title:
        el.getAttribute("title") ||
        el.getAttribute("text") ||
        el.getAttribute("xmlUrl") ||
        "Untitled",
    }))
    .filter(({ url }) => {
      if (!url.startsWith("http") || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

export default function AddPodcastPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // ── Tab state ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const tabRefs = {
    search: useRef<HTMLButtonElement>(null),
    url: useRef<HTMLButtonElement>(null),
    opml: useRef<HTMLButtonElement>(null),
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, current: Tab) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const idx = TAB_ORDER.indexOf(current);
    const next =
      TAB_ORDER[
        (idx + (e.key === "ArrowRight" ? 1 : -1) + TAB_ORDER.length) %
          TAB_ORDER.length
      ];
    setActiveTab(next);
    tabRefs[next].current?.focus();
  };

  // ── Shared actions / queries ────────────────────────────────────────────
  const searchPodcasts = useAction(api.podcastActions.searchPodcasts);
  const addPodcast = useAction(api.podcastActions.addPodcast);
  const importOpmlFeeds = useAction(api.podcastActions.importOpmlFeeds);
  const subscribedPodcasts = useQuery(
    api.podcasts.subscribedPodcasts,
    isAuthenticated ? {} : "skip"
  );
  const subscribedUrls = new Set(
    (subscribedPodcasts ?? []).map((p) => p?.rssUrl).filter(Boolean)
  );

  // ── Shared "mark all listened" toggle ──────────────────────────────────
  const [markAllListened, setMarkAllListened] = useState(false);

  // ── Search tab state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addingFeedUrl, setAddingFeedUrl] = useState<string | null>(null);
  const [addedFeedUrls, setAddedFeedUrls] = useState<Set<string>>(new Set());
  const [addError, setAddError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");

  // ── URL tab state ───────────────────────────────────────────────────────
  const [rssUrl, setRssUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSuccess, setUrlSuccess] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // ── OPML tab state ──────────────────────────────────────────────────────
  type OpmlStep = "idle" | "preview" | "importing" | "done";
  const [opmlStep, setOpmlStep] = useState<OpmlStep>("idle");
  const [opmlFeeds, setOpmlFeeds] = useState<OpmlFeed[]>([]);
  const [opmlParseError, setOpmlParseError] = useState("");
  const [importResult, setImportResult] = useState<{
    succeeded: number;
    failedTitles: string[];
    total: number;
  } | null>(null);
  const opmlFileRef = useRef<HTMLInputElement>(null);

  // ── ARIA IDs ────────────────────────────────────────────────────────────
  const searchTabId = useId();
  const urlTabId = useId();
  const opmlTabId = useId();
  const searchPanelId = useId();
  const urlPanelId = useId();
  const opmlPanelId = useId();
  const searchQueryId = useId();
  const searchErrorId = useId();
  const addErrorId = useId();
  const liveId = useId();
  const rssUrlId = useId();
  const urlErrorId = useId();
  const urlStatusId = useId();
  const opmlFileId = useId();
  const opmlErrorId = useId();
  const opmlProgressId = useId();
  const markAllListenedId = useId();

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchError("");
    setAddError("");
    setSearchResults(null);
    setSearching(true);
    setLiveMessage("");
    try {
      const results = await searchPodcasts({ query: q });
      setSearchResults(results);
      setLiveMessage(
        results.length === 0
          ? "No podcasts found."
          : `${results.length} podcast${results.length === 1 ? "" : "s"} found.`
      );
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleAddFromSearch = async (result: PodcastSearchResult) => {
    setAddError("");
    setAddingFeedUrl(result.feedUrl);
    try {
      await addPodcast({ rssUrl: result.feedUrl, markAllListened });
      setAddedFeedUrls((prev) => new Set(prev).add(result.feedUrl));
      setLiveMessage(`${result.title} added to Blindpod.`);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add podcast. Please try again."
      );
    } finally {
      setAddingFeedUrl(null);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError("");
    setUrlSuccess("");
    const url = rssUrl.trim();
    if (!url) {
      setUrlError("Please enter an RSS feed URL.");
      return;
    }
    try {
      new URL(url);
    } catch {
      setUrlError("Please enter a valid URL (e.g. https://feeds.example.com/podcast).");
      return;
    }
    setIsFetching(true);
    try {
      await addPodcast({ rssUrl: url, markAllListened });
      setUrlSuccess("Podcast added! Redirecting to your podcasts…");
      setRssUrl("");
      setTimeout(() => router.push("/podcasts"), 1500);
    } catch (err) {
      setUrlError(
        err instanceof Error
          ? err.message
          : "Failed to add podcast. Please check the URL and try again."
      );
    } finally {
      setIsFetching(false);
    }
  };

  const handleOpmlFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOpmlParseError("");
      setOpmlStep("idle");
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const feeds = parseOpml(reader.result as string);
          if (feeds.length === 0) {
            setOpmlParseError(
              "No podcast feeds found in this file. Make sure it is a valid podcast OPML export."
            );
            return;
          }
          setOpmlFeeds(feeds);
          setOpmlStep("preview");
        } catch (err) {
          setOpmlParseError(
            err instanceof Error ? err.message : "Failed to read OPML file."
          );
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const handleImport = async () => {
    const newFeeds = opmlFeeds.filter((f) => !subscribedUrls.has(f.url));
    if (newFeeds.length === 0) {
      setImportResult({ succeeded: 0, failedTitles: [], total: 0 });
      setOpmlStep("done");
      return;
    }
    setOpmlStep("importing");
    try {
      // All RSS fetching happens server-side — the browser just waits for one response
      const result = await importOpmlFeeds({ feeds: newFeeds, markAllListened });
      setImportResult({ ...result, total: newFeeds.length });
    } catch {
      setOpmlParseError("Import failed. Please try again.");
      setOpmlStep("preview");
      return;
    }
    setOpmlStep("done");
  };

  const resetOpml = () => {
    setOpmlStep("idle");
    setOpmlFeeds([]);
    setOpmlParseError("");
    setImportResult(null);
    if (opmlFileRef.current) opmlFileRef.current.value = "";
  };

  if (isLoading || !isAuthenticated) {
    return <p role="status" aria-live="polite">Loading…</p>;
  }

  // Derived OPML counts
  const newFeeds = opmlFeeds.filter((f) => !subscribedUrls.has(f.url));
  const alreadySubCount = opmlFeeds.length - newFeeds.length;

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

      <h1 className="text-3xl font-bold mb-4">Add a podcast</h1>

      {/* ── Mark all listened toggle — shared across all add methods ── */}
      <div className="flex items-start gap-3 mb-6 p-3 bg-gray-100 rounded max-w-xl">
        <input
          id={markAllListenedId}
          type="checkbox"
          checked={markAllListened}
          onChange={(e) => setMarkAllListened(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-400 text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 cursor-pointer"
        />
        <label htmlFor={markAllListenedId} className="text-sm text-gray-800 cursor-pointer select-none">
          <span className="font-medium">I&rsquo;m already caught up</span> — mark all
          existing episodes as listened and archive them. Only new episodes will appear
          in your feed.
        </label>
      </div>

      {/* ── Tab list ── */}
      <div
        role="tablist"
        aria-label="How to add a podcast"
        className="flex gap-0 border-b border-gray-300 mb-6"
      >
        {(
          [
            { id: "search", label: "Search for Podcasts" },
            { id: "url", label: "Add by URL" },
            { id: "opml", label: "Import OPML" },
          ] as { id: Tab; label: string }[]
        ).map(({ id, label }) => (
          <button
            key={id}
            ref={tabRefs[id]}
            role="tab"
            id={id === "search" ? searchTabId : id === "url" ? urlTabId : opmlTabId}
            aria-selected={activeTab === id}
            aria-controls={
              id === "search" ? searchPanelId : id === "url" ? urlPanelId : opmlPanelId
            }
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(e) => handleTabKeyDown(e, id)}
            className={`px-5 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 ${
              activeTab === id
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search tab panel ── */}
      <div
        role="tabpanel"
        id={searchPanelId}
        aria-labelledby={searchTabId}
        hidden={activeTab !== "search"}
      >
        <p
          id={liveId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveMessage}
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 max-w-lg mb-6" noValidate>
          <div className="flex-1">
            <label htmlFor={searchQueryId} className="sr-only">
              Search podcasts
            </label>
            <input
              id={searchQueryId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Hardcore History, Serial, 99% Invisible…"
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-describedby={searchError ? searchErrorId : undefined}
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-5 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchError && (
          <div
            id={searchErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
          >
            {searchError}
          </div>
        )}
        {addError && (
          <div
            id={addErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
          >
            {addError}
          </div>
        )}

        {searchResults !== null && searchResults.length === 0 && (
          <p className="text-gray-600">
            No podcasts found for that search. Try different keywords, or if you have
            the RSS address use the{" "}
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className="underline text-blue-700"
            >
              Add by URL
            </button>{" "}
            tab.
          </p>
        )}

        {searchResults !== null && searchResults.length > 0 && (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm border-collapse"
              aria-label={`Search results: ${searchResults.length} podcast${searchResults.length === 1 ? "" : "s"}`}
            >
              <caption className="sr-only">
                Podcast search results. Use the Add to Blindpod button in the last
                column to subscribe.
              </caption>
              <thead>
                <tr className="border-b-2 border-gray-300 text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-700">
                    Podcast
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-gray-700">
                    Genre
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-4 font-semibold text-gray-700 text-right"
                  >
                    Episodes
                  </th>
                  <th scope="col" className="py-2 font-semibold text-gray-700">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((result) => {
                  const alreadySubscribed =
                    subscribedUrls.has(result.feedUrl) ||
                    addedFeedUrls.has(result.feedUrl);
                  const isAdding = addingFeedUrl === result.feedUrl;
                  return (
                    <tr
                      key={result.itunesId}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex gap-3 items-center">
                          {result.artworkUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={result.artworkUrl}
                              alt=""
                              aria-hidden="true"
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{result.title}</p>
                            {result.author && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {result.author}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-600 align-top pt-4">
                        {result.genre || "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-right align-top pt-4">
                        {result.episodeCount > 0
                          ? result.episodeCount.toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 align-top pt-4">
                        {alreadySubscribed ? (
                          <span
                            className="text-green-700 text-sm font-medium"
                            aria-label={`${result.title} is already in Blindpod`}
                          >
                            Already subscribed
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddFromSearch(result)}
                            disabled={isAdding || addingFeedUrl !== null}
                            aria-label={`Add ${result.title} to Blindpod`}
                            className="px-3 py-1.5 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isAdding ? "Adding…" : "Add to Blindpod"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add by URL tab panel ── */}
      <div
        role="tabpanel"
        id={urlPanelId}
        aria-labelledby={urlTabId}
        hidden={activeTab !== "url"}
      >
        <p className="text-gray-600 mb-6">
          Paste the RSS feed URL of the podcast you want to subscribe to. The URL is
          sent directly to your Blindpod account — it is never shared with Apple or any
          search directory.
        </p>

        {urlError && (
          <div
            id={urlErrorId}
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded"
          >
            {urlError}
          </div>
        )}
        {urlSuccess && (
          <div
            id={urlStatusId}
            role="status"
            aria-live="polite"
            className="mb-4 p-3 bg-green-50 border border-green-300 text-green-800 rounded"
          >
            {urlSuccess}
          </div>
        )}

        <form
          onSubmit={handleUrlSubmit}
          className="space-y-5 max-w-lg"
          noValidate
          aria-describedby={urlError ? urlErrorId : urlSuccess ? urlStatusId : undefined}
        >
          <div>
            <label
              htmlFor={rssUrlId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              RSS feed URL
            </label>
            <input
              id={rssUrlId}
              type="url"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              required
              placeholder="https://feeds.example.com/podcast"
              autoComplete="off"
              className="w-full px-3 py-2 border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              aria-required="true"
              disabled={isFetching}
            />
          </div>
          <button
            type="submit"
            disabled={isFetching}
            className="px-6 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-blue-700 disabled:opacity-50 transition-colors"
            aria-disabled={isFetching}
          >
            {isFetching ? "Fetching podcast…" : "Add podcast"}
          </button>
          {isFetching && (
            <p role="status" aria-live="polite" className="text-sm text-gray-600">
              Fetching and parsing the RSS feed. This may take a moment…
            </p>
          )}
        </form>
      </div>

      {/* ── Import OPML tab panel ── */}
      <div
        role="tabpanel"
        id={opmlPanelId}
        aria-labelledby={opmlTabId}
        hidden={activeTab !== "opml"}
      >
        <p className="text-gray-600 mb-6">
          Import an OPML file exported from another podcast app to subscribe to all
          your podcasts at once. Feeds you already follow will be skipped automatically.
        </p>

        {/* File picker — only shown before preview */}
        {opmlStep === "idle" && (
          <div className="max-w-lg">
            {opmlParseError && (
              <div
                id={opmlErrorId}
                role="alert"
                aria-live="assertive"
                className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded text-sm"
              >
                {opmlParseError}
              </div>
            )}
            <label
              htmlFor={opmlFileId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              OPML file
              <span className="ml-1 text-gray-500 font-normal">(.opml or .xml)</span>
            </label>
            <input
              id={opmlFileId}
              ref={opmlFileRef}
              type="file"
              accept=".opml,.xml,application/xml,text/xml,text/x-opml"
              onChange={handleOpmlFile}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
              aria-describedby={opmlParseError ? opmlErrorId : undefined}
            />
          </div>
        )}

        {/* Preview */}
        {opmlStep === "preview" && (
          <div className="max-w-lg">
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p>
                Found{" "}
                <strong>{opmlFeeds.length}</strong>{" "}
                podcast{opmlFeeds.length === 1 ? "" : "s"} in the file.
                {alreadySubCount > 0 && (
                  <>
                    {" "}
                    <strong>{alreadySubCount}</strong>{" "}
                    {alreadySubCount === 1 ? "is" : "are"} already in your library and
                    will be skipped.
                  </>
                )}
              </p>
              {newFeeds.length > 0 ? (
                <p className="mt-1">
                  <strong>{newFeeds.length}</strong> new{" "}
                  {newFeeds.length === 1 ? "podcast" : "podcasts"} will be imported.
                </p>
              ) : (
                <p className="mt-1">All podcasts in this file are already in your library.</p>
              )}
            </div>

            {newFeeds.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">
                  Podcasts to import
                </h2>
                <ul className="border border-gray-200 rounded divide-y divide-gray-100 max-h-64 overflow-y-auto text-sm">
                  {newFeeds.map((f) => (
                    <li key={f.url} className="px-3 py-2 text-gray-800">
                      {f.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              {newFeeds.length > 0 && (
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
                >
                  Import {newFeeds.length}{" "}
                  {newFeeds.length === 1 ? "podcast" : "podcasts"}
                </button>
              )}
              <button
                type="button"
                onClick={resetOpml}
                className="px-5 py-2 text-sm text-gray-600 underline"
              >
                Choose a different file
              </button>
            </div>
          </div>
        )}

        {/* Importing — all RSS fetching happens server-side; browser just waits */}
        {opmlStep === "importing" && (
          <div className="max-w-lg">
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-sm text-gray-700 mb-3"
            >
              Importing {newFeeds.length}{" "}
              {newFeeds.length === 1 ? "podcast" : "podcasts"} — fetching feeds on
              the server. This may take a moment for large libraries.
            </p>
            <div
              role="progressbar"
              aria-label="Importing feeds"
              aria-busy="true"
              className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
            >
              <div className="bg-blue-700 h-2 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Done */}
        {opmlStep === "done" && importResult !== null && (
          <div className="max-w-lg">
            <div
              role="status"
              aria-live="polite"
              className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-sm text-green-900"
            >
              {importResult.total === 0 ? (
                <p>All podcasts in this file were already in your library. Nothing to import.</p>
              ) : (
                <p>
                  Imported <strong>{importResult.succeeded}</strong> of{" "}
                  <strong>{importResult.total}</strong>{" "}
                  {importResult.total === 1 ? "podcast" : "podcasts"} successfully.
                  {importResult.failedTitles.length > 0 && (
                    <>
                      {" "}
                      {importResult.failedTitles.length}{" "}
                      {importResult.failedTitles.length === 1 ? "feed" : "feeds"} could
                      not be fetched and were skipped.
                    </>
                  )}
                </p>
              )}
            </div>

            {importResult.failedTitles.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-1">
                  Feeds that could not be imported
                </h2>
                <ul className="border border-red-100 rounded divide-y divide-red-50 text-sm">
                  {importResult.failedTitles.map((title) => (
                    <li key={title} className="px-3 py-2 text-red-800">
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/podcasts"
                className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
              >
                Go to my podcasts
              </Link>
              <button
                type="button"
                onClick={resetOpml}
                className="px-5 py-2 text-sm text-gray-600 underline"
              >
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
