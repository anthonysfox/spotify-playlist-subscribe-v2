// These styles apply to every route in the application
import "@/styles/globals.css";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavBar from "@/components/Navigation/NavBar";
import { Suspense } from "react";

import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Metadata, Viewport } from "next";
import InstallPrompt from "./components/InstallPrompt";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import StoreResetOnSignOut from "./components/StoreResetOnSignOut";

// Redesign type system (README "Design tokens" > Type): Space Grotesk for
// display, IBM Plex Sans for body/UI, IBM Plex Mono for eyebrow labels and
// numeric stats. The CSS variables are consumed by the @theme block in
// styles/globals.css (--font-display / --font-sans / --font-mono).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  // 500 + 600 only — nothing uses `font-bold` with the display face.
  weight: ["500", "600"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
    icon: [{ url: "/logo-64.png", sizes: "64x64", type: "image/png" }],
    apple: "/logo-192.png",
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
      <html lang="en" className="scroll-smooth">
        <body
          className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased bg-ground text-ink-70 ${
            isApp ? "flex flex-col h-screen overflow-hidden" : "min-h-screen"
          }`}
        >
          {/* Signed-in chrome is the rail/tab-bar in AppShell (rendered per
              route via AppFrame); NavBar is now only the signed-out marketing
              header. */}
          {!isApp && <NavBar />}
          <StoreResetOnSignOut />
          {isApp ? (
            <main className="grow flex min-h-0 overflow-hidden">{children}</main>
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
