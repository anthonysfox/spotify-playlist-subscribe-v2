import { PrismaClient } from "@prisma/client";

import PlaylistSearch from "./components/Playlist/Search";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Disc } from "lucide-react";
import { currentUser } from "@clerk/nextjs/server";
const prisma = new PrismaClient();

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="grow flex flex-col p-4 h-full w-full">
      {user ? (
        <PlaylistSearch userData={JSON.parse(JSON.stringify(user))} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center px-4">
          <Disc size={64} className="text-green-500 mb-6" />
          <h2 className="text-3xl font-bold mb-4">
            All your favorite playlists in one place{" "}
          </h2>
          <p className="text-gray-400 text-lg mb-6">
            Subscribe to playlists you love and organize all your favorites in
            one convenient location. Discover new music and keep your collection
            perfectly curated.
          </p>
          <div className="bg-gray-900 p-4 rounded-lg mb-8 w-full">
            <p className="text-yellow-400 font-medium mb-2">
              ⚠️ Spotify Premium Required
            </p>
            <p className="text-gray-400 text-sm">
              This app requires a Spotify Premium subscription to access all
              features. Free accounts have limited functionality.
            </p>
          </div>
          <SignInButton>
            <button className="w-full py-3 rounded-full bg-green-500 hover:bg-green-600 font-medium text-lg">
              Log in with Spotify
            </button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}
