import { SignInButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { LandingPreview } from "./LandingPreview";

const FEATURES = [
  {
    title: "Auto-Sync",
    description: "Fresh tracks on your schedule — daily, weekly, or monthly.",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z",
  },
  {
    title: "Smart Discovery",
    description: "New music from the artists and playlists you love.",
    path: "M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z",
  },
  {
    title: "One Place",
    description: "Every subscription, both services, one dashboard.",
    path: "M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z",
  },
];

const STEPS = [
  {
    title: "Pick your sources",
    description: "Subscribe to any playlist you already follow — yours or public.",
  },
  {
    title: "Point at a managed playlist",
    description: "A playlist PlaylistFox owns on your behalf, brand new or existing.",
  },
  {
    title: "It stays fresh on its own",
    description: "New tracks land automatically, on whatever schedule you set.",
  },
];

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

        {/* Three static cards — a visitor scanning for a few seconds used to
            see one third of this at a time, with no indication there was
            more. */}
        <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 p-4 text-center ring-1 ring-black/5 backdrop-blur shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#CC5500] to-[#A0522D] shadow-sm">
                <svg
                  className="h-5 w-5 text-white"
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
                <h3 className="text-sm font-semibold leading-tight text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-0.5 text-xs leading-snug text-gray-500">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Access notice — moved above the CTA. It used to sit below in
            small print, so the actual flow for a new Spotify user was:
            click the big button, authorize, hit the dev-mode allowlist
            wall, get an error, leave. Seeing this first avoids that dead
            end entirely. */}
        <p className="mt-8 max-w-xs text-sm text-gray-500">
          New here and using Spotify? Spotify&apos;s developer mode requires an
          allowlist —{" "}
          <a
            href="mailto:anthonysfox1@gmail.com?subject=PlaylistFox%20access%20request"
            className="font-semibold text-[#CC5500] underline-offset-2 hover:underline"
          >
            email anthonysfox1@gmail.com
          </a>{" "}
          first to request access.
        </p>

        {/* Single, confident CTA. Label is deliberately provider-neutral for
            now — Clerk's own sign-in page offers both Spotify and Apple, but
            splitting this into two distinct branded buttons needs the exact
            Spotify custom-OAuth strategy identifier from the Clerk dashboard
            first, so a wrong guess can't silently break sign-in. */}
        <div className="mt-4 w-full max-w-xs">
          <SignInButton>
            <button className="group w-full rounded-2xl bg-gradient-to-r from-[#CC5500] to-[#A0522D] px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-900/20 transition-all hover:shadow-xl hover:shadow-orange-900/25 hover:cursor-pointer">
              <span className="flex items-center justify-center gap-2.5">
                Get started
                <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          </SignInButton>
        </div>

        {/* Scroll cue — the product preview and "how it works" steps below
            are otherwise a section nobody scrolling past a single-viewport
            hero would think to look for. A quiet text link, not another
            gradient button — the CTA above is the one primary action here. */}
        <a
          href="#how-it-works"
          className="mt-10 flex flex-col items-center gap-1 text-sm text-gray-400 transition-colors hover:text-[#CC5500]"
        >
          See how it works
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* Below the fold: what it actually looks like, and how it works —
          previously nothing on the page showed the product or explained the
          core mental model (a source playlist you follow vs. a managed
          playlist you own that receives tracks) before asking for OAuth
          access. */}
      <section
        id="how-it-works"
        className="relative mx-auto flex max-w-5xl scroll-mt-16 flex-col items-center gap-12 px-6 py-20 lg:flex-row lg:items-start lg:gap-16"
      >
        <div className="flex w-full max-w-md flex-col gap-6 lg:pt-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#CC5500] to-[#A0522D] text-sm font-bold text-white">
                {i + 1}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <LandingPreview />
        </div>
      </section>
    </div>
  );
};
