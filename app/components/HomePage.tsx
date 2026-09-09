import { SignInButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

/**
 * Signed-out landing (README "Screens" > Landing page, artboard 1d).
 *
 * The old page led with an aurora-blur hero, three generic feature cards and a
 * rotating feature reel — none of which explained the one thing a new visitor
 * needs before granting OAuth access: a *source* playlist you follow vs. a
 * *managed* playlist PlaylistFox owns and feeds. The concept diagram in the
 * hero does that job, statically.
 */

const STEPS = [
  {
    title: "Pick your sources",
    body: "Subscribe to any playlist you already follow — one of yours, or a public one.",
  },
  {
    title: "Point at a managed playlist",
    body: "A playlist PlaylistFox owns on your behalf — brand new, or one you already have.",
  },
  {
    title: "It stays fresh on its own",
    body: "New tracks land automatically, on whatever schedule you set — daily to monthly.",
  },
];

const Dot = ({ className }: { className: string }) => (
  <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${className}`} />
);

// Stand-in "cover art" — a small set of gradients so the landing mocks read as
// real playlists without shipping any image assets.
const GRADIENTS = [
  "linear-gradient(135deg,#CC5500,#E8A15B)",
  "linear-gradient(135deg,#3B5BDB,#74C0FC)",
  "linear-gradient(135deg,#2F9E6E,#B2E6C5)",
  "linear-gradient(135deg,#7048B6,#D0A9EE)",
  "linear-gradient(135deg,#1A1512,#5A5048)",
  "linear-gradient(135deg,#C2255C,#FF9FB6)",
];

const Cover = ({ i, size }: { i: number; size: string }) => (
  <span
    className={`${size} shrink-0 rounded-md`}
    style={{ backgroundImage: GRADIENTS[i % GRADIENTS.length] }}
  />
);

/** A small, honest mock of what each step looks like in the app. */
function StepMock({ i }: { i: number }) {
  const shell =
    "mt-4 h-[140px] w-full overflow-hidden rounded-xl border border-line bg-ground p-2.5";

  if (i === 0) {
    // Browse & subscribe
    const rows = ["Fresh Finds", "Indie Sleaze Revival", "Bedroom Pop Weekly"];
    return (
      <div className={`${shell} flex flex-col gap-1.5`}>
        {rows.map((name, r) => (
          <div
            key={name}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5"
          >
            <Cover i={r + 1} size="h-6 w-6" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-70">
              {name}
            </span>
            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] leading-none text-surface">
              +
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (i === 1) {
    // The managed playlist
    return (
      <div className={`${shell} flex flex-col justify-center`}>
        <div className="rounded-lg border-[1.5px] border-brand bg-brand-tint-soft p-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Cover i={0} size="h-6 w-6" />
            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ink">
              Friday Rotation
            </span>
            <span className="ml-auto shrink-0 rounded-full bg-surface px-1.5 py-0.5 font-mono text-[9px] text-brand-deep">
              weekly
            </span>
          </div>
          <div className="flex gap-1.5">
            {["Fresh Finds", "Deep Focus"].map((s, c) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-ink-50"
              >
                <Cover i={c + 1} size="h-3 w-3" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // It stays fresh — a run feed
  const runs: [string, string, string][] = [
    ["bg-ok", "Friday Rotation", "+7"],
    ["bg-ok", "Morning Coffee", "+4"],
    ["bg-ink-25", "Gym / Loud", "+0"],
  ];
  return (
    <div className={`${shell} flex flex-col gap-1.5`}>
      {runs.map(([dot, name, n], r) => (
        <div
          key={name}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5"
        >
          <Dot className={dot} />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-70">
            {name}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-35">
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}

export const HomePage = () => {
  return (
    <div className="bg-ground text-ink-70">
      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-10 sm:py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-[46px]">
          {/* Left */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px]">
              <span className="text-ink-35">Works with</span>
              <span className="inline-flex items-center gap-1.5 text-ink-70">
                <Dot className="bg-spotify" />
                Spotify
              </span>
              <span className="text-line-strong">·</span>
              <span className="inline-flex items-center gap-1.5 text-ink-70">
                <Dot className="bg-apple" />
                Apple Music
              </span>
            </div>

            <h1 className="font-display text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
              Playlists that
              <br />
              keep up with
              <br />
              <span className="text-brand">themselves.</span>
            </h1>

            <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed text-ink-50">
              Subscribe to the playlists you already follow. PlaylistFox funnels
              their new tracks into a playlist it manages for you — on Spotify and
              Apple Music, on whatever schedule you pick.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <SignInButton>
                <button className="rounded-full bg-brand px-[30px] py-4 text-[16px] font-medium text-surface transition-colors hover:cursor-pointer hover:bg-brand-deep">
                  Get started free
                </button>
              </SignInButton>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1 text-[14px] font-medium text-ink-50 transition-colors hover:text-ink-70"
              >
                See how it works
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>

            <p className="mt-6 max-w-sm text-[13px] leading-relaxed text-ink-35">
              New here and using Spotify? Spotify&apos;s developer mode needs an
              allowlist —{" "}
              <a
                href="mailto:anthonysfox1@gmail.com?subject=PlaylistFox%20access%20request"
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                email anthonysfox1@gmail.com
              </a>{" "}
              first to request access.
            </p>
          </div>

          {/* Right — concept card */}
          <div className="relative mx-auto w-full max-w-[470px]">
            <span className="absolute -right-3 -top-3 z-10 flex h-[52px] w-[52px] items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_6px_18px_rgba(26,21,18,0.18)]">
              <Image
                src="/logo.png"
                alt="PlaylistFox"
                width={58}
                height={58}
                className="h-[58px] w-[58px] object-cover"
                priority
              />
            </span>

            <div className="rounded-[18px] border border-line bg-surface p-6">
              <div className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                Two kinds of playlist
              </div>

              <div className="mt-3 flex flex-col">
                <div className="rounded-xl border border-line px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-wide text-ink-35">
                    A source you follow
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Cover i={1} size="h-8 w-8" />
                    <span className="text-[13.5px] font-medium text-ink">
                      Fresh Finds — Basement
                    </span>
                  </div>
                </div>

                <div className="relative flex h-14 items-center justify-center">
                  <svg
                    width="2"
                    height="56"
                    className="overflow-visible"
                    aria-hidden="true"
                  >
                    <line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="56"
                      stroke="var(--color-brand)"
                      strokeWidth="2"
                      strokeDasharray="4 6"
                      className="animate-flowdash"
                    />
                  </svg>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-surface px-2 font-mono text-[10px] text-brand-deep">
                    new tracks, weekly
                  </span>
                </div>

                <div className="rounded-xl border-[1.5px] border-brand bg-brand-tint-soft px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-wide text-brand-deep">
                    A playlist we manage
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Cover i={0} size="h-8 w-8" />
                    <span className="text-[13.5px] font-medium text-ink">
                      Friday Rotation
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-ground-alt px-4 py-2.5 text-[12.5px] text-ink-70">
                Subscribing is just drawing that arrow.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Three-step explainer ---- */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-line bg-surface"
      >
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
          <div className="grid gap-10 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="font-mono text-[12px] font-medium text-brand">
                  0{i + 1}
                </div>
                <h3 className="mt-2 font-display text-[19px] font-semibold tracking-[-0.015em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-50">
                  {step.body}
                </p>
                <StepMock i={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Services strip ---- */}
      <section id="services" className="scroll-mt-20 bg-ground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-10 text-[13px] text-ink-50 sm:px-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-35">
            Available today on
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot className="bg-spotify" />
            Spotify
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Dot className="bg-apple" />
            Apple Music
          </span>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-line bg-ground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[12.5px] text-ink-35 sm:flex-row sm:px-10">
          <span>PlaylistFox — playlists that keep up with themselves.</span>
          <a
            href="mailto:anthonysfox1@gmail.com"
            className="transition-colors hover:text-ink-50"
          >
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
};
