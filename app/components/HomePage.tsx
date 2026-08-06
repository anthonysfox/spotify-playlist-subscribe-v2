import { SignInButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import { RotatingFeatures } from "./RotatingFeatures";

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

export const HomePage = () => {
  return (
    <div className="relative w-full overflow-hidden bg-white">
      {/* Aurora glow — expressive brand color, blurred behind the content */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-15%] h-[520px] w-[820px] max-w-[140vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#CC5500]/25 via-orange-300/20 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[380px] w-[380px] rounded-full bg-gradient-to-tr from-[#A0522D]/15 to-transparent blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-amber-300/10 to-transparent blur-[100px]" />
      </div>

      {/* Hero — fills the viewport under the (4rem) navbar, no forced overflow */}
      <section className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
        {/* Brand lockup */}
        <div className="mb-8 flex items-center gap-2.5">
          <Image
            src="/logo-no-bg.png"
            alt="PlaylistFox"
            width={140}
            height={140}
            className="h-11 w-11 object-contain drop-shadow-sm"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            PlaylistFox
          </span>
        </div>

        {/* Trust badge */}
        <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-black/5 bg-white/70 px-4 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
          <span className="text-gray-400">Works with</span>
          <span className="inline-flex items-center gap-1 text-gray-700">
            <SpotifyIcon className="h-4 w-4 text-[#1DB954]" />
            Spotify
          </span>
          <span className="text-gray-300">·</span>
          <span className="inline-flex items-center gap-1 text-gray-700">
            <AppleIcon className="h-4 w-4 text-gray-900" />
            Apple Music
          </span>
        </div>

        {/* Oversized headline — the value prop, impossible to miss */}
        <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-gray-900 sm:text-6xl md:text-7xl">
          Your playlists,
          <br />
          <span className="bg-gradient-to-r from-[#CC5500] via-[#B8481A] to-[#A0522D] bg-clip-text text-transparent">
            always fresh.
          </span>
        </h1>

        <p className="mt-6 max-w-md text-base leading-relaxed text-gray-500 sm:text-lg">
          Subscribe to the playlists you love, and PlaylistFox keeps them
          updated automatically — on Spotify and Apple Music.
        </p>

        {/* Motion: the auto-rotating feature reel */}
        <div className="mt-10 w-full max-w-md">
          <RotatingFeatures />
        </div>

        {/* Single, confident CTA */}
        <div className="mt-9 w-full max-w-xs">
          <SignInButton>
            <button className="group w-full rounded-2xl bg-gradient-to-r from-[#CC5500] to-[#A0522D] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-900/20 transition-all hover:shadow-xl hover:shadow-orange-900/25 hover:cursor-pointer">
              <span className="flex items-center justify-center gap-2.5">
                Sign in
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SignInButton>
        </div>

        {/* Access notice */}
        <p className="mt-6 text-sm text-gray-400">
          New here and using Spotify? Email{" "}
          <a
            href="mailto:anthonysfox1@gmail.com"
            className="font-semibold text-[#CC5500] underline-offset-2 hover:underline"
          >
            anthonysfox1@gmail.com
          </a>{" "}
          to request access.
        </p>
      </section>
    </div>
  );
};
