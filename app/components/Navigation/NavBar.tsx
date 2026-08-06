"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { useUserStore } from "store/useUserStore";
import { useAppStore } from "store/useAppStore";
import { ProviderSwitcher } from "./ProviderSwitcher";
import { McpTokens } from "../McpTokens";
import { AppleMusicConnect } from "../AppleMusicConnect";
import { AppleIcon, Coins } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo-no-bg.png"
            alt="PlaylistFox"
            width={140}
            height={140}
            className="h-9 w-9 object-contain drop-shadow-sm"
          />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Playlist<span className="text-[#CC5500]">Fox</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <SignedIn>
            <ProviderSwitcher />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className="rounded-full bg-gradient-to-r from-[#CC5500] to-[#A0522D] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md hover:cursor-pointer">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton>
              <UserButton.UserProfilePage
                label="Connect Apple Music"
                url="profile"
                labelIcon={<AppleIcon className="w-4 h-4 text-gray-900" />}
              >
                <AppleMusicConnect />
              </UserButton.UserProfilePage>
              <UserButton.UserProfilePage
                label="MCP Tokens"
                url="mcp"
                labelIcon={<Coins className="w-4 h-4 text-gray-900" />}
              >
                <McpTokens />
              </UserButton.UserProfilePage>
            </UserButton>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
