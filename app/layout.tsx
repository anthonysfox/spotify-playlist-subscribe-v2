// These styles apply to every route in the application
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavBar from "@/components/Navigation/NavBar";
import { Suspense } from "react";

import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Metadata, Viewport } from "next";
import InstallPrompt from "./components/InstallPrompt";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlaylistFox - Automatic Playlist Updates",
  description:
    "Keep your Spotify and Apple Music playlists fresh with automatic track updates from your favorite sources",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlaylistFox",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#CC5500",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The signed-in dashboard is a fixed-height app (inner panes scroll). The
  // signed-out marketing pages should flow and scroll like a normal website —
  // so the shell adapts instead of trapping everything in one scroll container.
  const { userId } = await auth();
  const isApp = Boolean(userId);

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} bg-gray-100 text-gray-800 ${
            isApp ? "flex flex-col h-screen overflow-hidden" : "min-h-screen"
          }`}
        >
          <NavBar />
          {isApp ? (
            <main className="grow flex flex-col overflow-hidden p-4">
              <div className="max-w-6xl mx-auto w-full flex flex-col h-full items-center">
                {children}
              </div>
            </main>
          ) : (
            <main>{children}</main>
          )}
          <Toaster position="bottom-center" />
          <ServiceWorkerRegistration />
          <InstallPrompt />
        </body>
      </html>
    </ClerkProvider>
  );
}
