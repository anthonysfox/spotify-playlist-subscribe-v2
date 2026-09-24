"use client";
import { SignInButton, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

/**
 * Signed-out marketing header (README landing, artboard 1d — top bar). The
 * signed-in app has no top bar; its navigation is the rail / tab bar in
 * AppShell. The store-reset that used to live here moved to
 * <StoreResetOnSignOut/> in the root layout.
 */
export default function Navbar() {
  return (
    <header className="border-line bg-surface/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-surface flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
            <Image
              src="/logo.png"
              alt="PlaylistFox"
              width={38}
              height={38}
              className="h-[38px] w-[38px] object-cover"
            />
          </span>
          <span className="font-display text-ink text-lg font-semibold tracking-tight">
            Playlist<span className="text-brand">Fox</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="text-ink-50 hover:text-ink-70 hidden text-[13.5px] font-medium transition-colors sm:block"
          >
            How it works
          </a>
          <SignedOut>
            <SignInButton>
              <button className="border-line-strong text-ink hover:border-brand/40 hover:text-brand rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors hover:cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
