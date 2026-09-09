"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useUserStore } from "store/useUserStore";
import { useAppStore } from "store/useAppStore";

/**
 * Clears the persisted Zustand stores the moment Clerk reports no signed-in
 * user, so a second person on the same browser never sees the first person's
 * playlists flash in before the app reloads.
 *
 * This used to live inside NavBar, which is now only mounted on signed-out
 * marketing pages — the reset needs to run regardless of which chrome is on
 * screen, so it moved to its own always-mounted component in the root layout.
 */
export default function StoreResetOnSignOut() {
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

  return null;
}
