import { SignInButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.062 14.615c-.16.265-.518.343-.783.183-2.14-1.303-4.834-1.598-8.006-.875-.306.07-.613-.119-.683-.425-.07-.306.119-.613.425-.683 3.46-.79 6.452-.449 8.822.998.265.16.343.518.183.783zm1.118-2.48c-.201.327-.63.43-.957.23-2.45-1.507-6.184-1.944-9.077-.964-.378.128-.777-.074-.905-.452-.128-.378.074-.777.452-.905 3.315-1.124 7.474-.615 10.256 1.133.327.201.43.63.23.957zm.096-2.582C14.626 9.892 9.712 9.65 6.665 10.79c-.443.165-.94-.06-1.105-.503-.165-.443.06-.94.503-1.105 3.506-1.313 9.064-1.063 12.677 1.226.394.25.513.784.263 1.178-.25.394-.784.513-1.178.263z" />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const FEATURES = [
  {
    title: "Auto-Sync",
    description:
      "Fresh tracks added on your schedule — daily, weekly, or monthly.",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  },
  {
    title: "Smart Discovery",
    description: "Find new music from the artists and playlists you love.",
    path: "M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z",
  },
  {
    title: "One Place",
    description: "Manage every subscription across both services in one place.",
    path: "M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
  },
];

export const HomePage = () => {
  return (
    <div className="relative grow min-h-0 w-full flex overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-orange-50/40 p-4">
      {/* Ambient glows — isolated & clipped so they never affect scroll or layout */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-[#CC5500]/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-[#A0522D]/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative m-auto w-full max-w-sm text-center space-y-5 [@media(max-height:760px)]:space-y-3">
        {/* Logo + Wordmark */}
        <div className="space-y-3 [@media(max-height:760px)]:space-y-2">
          <div className="w-full max-w-[72px] sm:max-w-[84px] [@media(max-height:760px)]:max-w-[56px] mx-auto">
            <Image
              src="/logo-no-bg.png"
              alt="PlaylistFox"
              width={140}
              height={140}
              className="w-full h-auto object-contain drop-shadow-sm"
              priority
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-gray-900 via-[#CC5500] to-[#A0522D] bg-clip-text text-transparent">
              Playlist
            </span>
            <span className="text-gray-900">Fox</span>
          </h1>

          <p className="text-base sm:text-lg font-semibold text-gray-900 leading-snug px-2">
            Subscribe once. Your playlists stay fresh forever.
          </p>

          <p className="text-sm text-gray-500 leading-relaxed px-4 [@media(max-height:640px)]:hidden">
            Follow the playlists you love and PlaylistFox adds new tracks
            automatically, on your schedule.
          </p>

          {/* Works-with badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/70 ring-1 ring-black/5 backdrop-blur px-3.5 py-1.5 text-xs font-medium shadow-sm">
            <span className="text-gray-400">Works with</span>
            <span className="inline-flex items-center gap-1 text-gray-700">
              <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
              Spotify
            </span>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 text-gray-700">
              <AppleIcon className="w-4 h-4 text-gray-900" />
              Apple Music
            </span>
          </div>
        </div>

        {/* Feature panel */}
        <div className="rounded-2xl bg-white/70 ring-1 ring-black/5 backdrop-blur shadow-sm divide-y divide-gray-100 text-left">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex items-center gap-3 p-3 sm:p-3.5 [@media(max-height:760px)]:p-2"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-[#CC5500] to-[#A0522D] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d={feature.path}
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 leading-snug mt-0.5 [@media(max-height:640px)]:hidden">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button — Clerk's sign-in already presents both Spotify and Apple,
            so one entry point is clearer than a button per provider. */}
        <div className="[@media(max-height:760px)]:space-y-2">
          <SignInButton>
            <button className="group w-full py-3 [@media(max-height:760px)]:py-2.5 px-6 bg-gradient-to-r from-[#CC5500] to-[#A0522D] hover:from-[#B04A00] hover:to-[#8B4513] text-white font-semibold text-base rounded-xl shadow-sm transition-all hover:shadow-md hover:cursor-pointer">
              <span className="flex items-center justify-center gap-2.5">
                Sign in
                <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SignInButton>
        </div>

        {/* Access notice */}
        <p className="text-xs text-gray-500">
          New here and using Spotify? Email{" "}
          <a
            href="mailto:anthonysfox1@gmail.com"
            className="font-semibold text-[#CC5500] underline-offset-2 hover:underline"
          >
            anthonysfox1@gmail.com
          </a>{" "}
          to request access.
        </p>
      </div>
    </div>
  );
};
