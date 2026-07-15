"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "store/useUserStore";
import { useAppStore } from "store/useAppStore";
import { ProviderSwitcher } from "./ProviderSwitcher";

export default function Navbar() {
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;

    useUserStore.setState({
      userPlaylists: [],
      managedPlaylists: [],
      user: null,
      isLoading: false,
      loadedAllPlaylists: false,
      offset: 0,
    });
    useAppStore.setState({
      browsePlaylists: [],
      isLoading: false,
      loadedAllPlaylists: false,
      offset: 0,
    });

    useUserStore.persist.clearStorage();
    useAppStore.persist.clearStorage();
  }, [isLoaded, isSignedIn]);

  return (
    <>
      <header className="p-4 bg-white shadow-xs">
        <div className="flex w-full h-16 items-center justify-between">
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link href={"/"} className="flex items-center">
              <Image
                src="/logo.png"
                alt="PlaylistFox"
                width={40}
                height={40}
                className="rounded-lg shadow-sm"
              />
              <h1 className="text-2xl font-bold text-gray-800 ml-3">
                PlaylistFox
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-4 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            <SignedIn>
              <ProviderSwitcher />
            </SignedIn>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
    </>
  );
}
