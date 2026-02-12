import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Page not found</h1>
      <p className="text-gray-600 mb-4">
        The page you&rsquo;re looking for doesn&rsquo;t exist.
      </p>
      <Link
        href="/"
        className="inline-block px-4 py-2 bg-blue-700 text-white font-semibold rounded hover:bg-blue-800 focus-visible:outline-blue-700 transition-colors"
      >
        Go to home
      </Link>
    </>
  );
}
