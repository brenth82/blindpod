import type { Metadata } from "next";
import "./globals.css";
import { SkipLink } from "@/components/SkipLink";
import { Nav } from "@/components/Nav";
import { ConvexClientProvider } from "@/lib/convex";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const DESCRIPTION =
  "Blindpod is an accessibility-first podcast manager designed for blind and visually impaired users. Keyboard-first, screen reader optimised, WCAG 2.1 AAA.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Blindpod — Accessible Podcast Manager",
    template: "%s — Blindpod",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Blindpod",
    title: "Blindpod — Accessible Podcast Manager",
    description: DESCRIPTION,
    url: APP_URL,
  },
  twitter: {
    card: "summary",
    title: "Blindpod — Accessible Podcast Manager",
    description: DESCRIPTION,
  },
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
