import type { Metadata } from "next";
import "./globals.css";
import { SkipLink } from "@/components/SkipLink";
import { Nav } from "@/components/Nav";
import { ConvexClientProvider } from "@/lib/convex";

export const metadata: Metadata = {
  title: {
    default: "Blindpod — Accessible Podcast Manager",
    template: "%s — Blindpod",
  },
  description:
    "Blindpod is an accessibility-first podcast manager designed for blind and visually impaired users. Keyboard-first, screen reader optimised, WCAG 2.1 AAA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <ConvexClientProvider>
          <SkipLink />
          <Nav />
          <main id="main-content" tabIndex={-1} className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
