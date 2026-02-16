"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
      <p className="text-gray-600 mb-6">
        An unexpected error occurred. You can try again, or return to the home
        page if the problem persists.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
        >
          Try again
        </button>
        <a
          href="/"
          className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 transition-colors"
        >
          Go to home
        </a>
      </div>
    </>
  );
}
