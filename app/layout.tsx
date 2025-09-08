// These styles apply to every route in the application
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavBar from "@/components/Navigation/NavBar";
import { Suspense } from "react";

import { ClerkProvider } from "@clerk/nextjs";
import { Metadata, Viewport } from "next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlaylistFox - Automatic Spotify Playlist Updates",
  description: "Keep your Spotify playlists fresh with automatic track updates from your favorite sources",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlaylistFox",
  },
  icons: {
    icon: "/logo.png",
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
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} flex flex-col h-screen bg-gray-100 text-gray-800`}
        >
          <NavBar />
          <main className="grow flex flex-col overflow-hidden p-4">
            <div className="max-w-6xl mx-auto w-full flex flex-col h-full items-center">
              {children}
              <Toaster position="bottom-center" />
            </div>
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
