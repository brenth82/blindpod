"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

const authLinks = [
  { href: "/", label: "Feed" },
  { href: "/podcasts", label: "Podcasts" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  return (
    <nav aria-label="Main navigation" className="bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-white select-none" aria-hidden="true">
          Blindpod
        </span>

        <ul className="flex gap-4 list-none m-0 p-0" role="list">
          {(isAuthenticated ? authLinks : []).map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors hover:bg-gray-700 focus-visible:outline-white ${
                  pathname === href ? "bg-blue-700 text-white" : "text-gray-200"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}

          <li>
            {isAuthenticated ? (
              <button
                onClick={() => void signOut()}
                className="px-3 py-1 rounded text-sm font-medium text-gray-200 hover:bg-gray-700 focus-visible:outline-white transition-colors"
              >
                Log out
              </button>
            ) : (
              <Link
                href="/login"
                aria-current={pathname === "/login" ? "page" : undefined}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors hover:bg-gray-700 focus-visible:outline-white ${
                  pathname === "/login" ? "bg-blue-700 text-white" : "text-gray-200"
                }`}
              >
                Log in
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
