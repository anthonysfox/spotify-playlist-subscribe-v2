"use client";

import { useUser } from "@clerk/nextjs";
import Dashboard from "./components/Dashboard";
import { HomePage } from "./components/HomePage";
import { useSpotifyPlayer } from "./hooks/useSpotifyPlayer";
import { useUserStore } from "../store/useUserStore";

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();
  const token = useUserStore((state) => state.spotifyToken);
  const { transferPlayback } = useSpotifyPlayer(token || "");

  // Show loading or nothing while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="grow flex flex-col p-4 h-full w-full">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-[#CC5500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow flex flex-col p-4 h-full w-full">
      {isSignedIn && user ? (
        <Dashboard userData={user} transferPlayback={transferPlayback} />
      ) : (
        <HomePage />
      )}
    </div>
  );
}