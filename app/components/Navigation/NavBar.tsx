"use client";
import { SignInButton, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

/**
 * Signed-out marketing header only. The signed-in app has no top bar — its
 * navigation is the left rail / bottom tab bar in AppShell. The store-reset
 * that used to live here moved to <StoreResetOnSignOut/> in the root layout so
 * it runs regardless of which chrome is mounted.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="PlaylistFox"
            width={140}
            height={140}
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Playlist<span className="text-brand">Fox</span>
          </span>
        </Link>

        <SignedOut>
          <SignInButton>
            <button className="rounded-full border border-line-strong px-4 py-1.5 text-[13.5px] font-medium text-ink transition-colors hover:border-brand/40 hover:text-brand hover:cursor-pointer">
              Sign in
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </header>
  );
}
