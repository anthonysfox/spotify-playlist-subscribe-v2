"use client";

import { useEffect } from "react";
import { useMusicStore } from "store/useMusicStore";
import { useUserStore } from "store/useUserStore";
import type { MusicProvider } from "@/lib/music/types";
import type { ManagedPlaylistWithSubscriptions } from "@/types";
import { AppShell } from "./AppShell";

/**
 * Seeds the module-level Zustand stores from data the server component
 * (`AppFrame`) already fetched, so a hard navigation straight to `/library` or
 * `/activity` paints with real data instead of an empty shell that pops in
 * after client effects run.
 *
 * Same "seed in an effect, never during render" rule as the old Dashboard: the
 * stores are singletons, so writing to one during a server render could leak
 * one user's data into another's concurrently-rendering response.
 */
export function AppFrameClient({
  userData,
  initialConnections,
  initialManagedPlaylists,
  children,
}: {
  userData: Record<string, any> | null;
  initialConnections: Record<MusicProvider, boolean> | null;
  initialManagedPlaylists: ManagedPlaylistWithSubscriptions[];
  children: React.ReactNode;
}) {
  const setConnections = useMusicStore((s) => s.setConnections);
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);
  const setUser = useUserStore((s) => s.setUser);

  useEffect(() => {
    setConnections(initialConnections);
    setManagedPlaylists(initialManagedPlaylists);
    if (userData) {
      setUser({
        ...userData,
        externalAccounts: userData.externalAccounts || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppShell>{children}</AppShell>;
}
