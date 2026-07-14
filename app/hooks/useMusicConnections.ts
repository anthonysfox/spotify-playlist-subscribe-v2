"use client";

import { useCallback, useEffect, useState } from "react";
import type { MusicProvider } from "@/lib/music/types";

export const PROVIDER_LABELS: Record<MusicProvider, string> = {
  SPOTIFY: "Spotify",
  APPLE_MUSIC: "Apple Music",
};

type Connections = Record<MusicProvider, boolean>;

/**
 * Which music services this user has, and which one the UI is currently acting on.
 *
 * The app used to assume everyone had Spotify. Now that someone can sign up with
 * Apple instead, "which services does this person actually have" is a real
 * question with a real answer — and every screen that talks to a service needs
 * it, so it lives in one place rather than being re-derived per component.
 */
export function useMusicConnections() {
  const [connections, setConnections] = useState<Connections | null>(null);
  const [activeProvider, setActiveProvider] = useState<MusicProvider | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/music/connections");
      if (!response.ok) return;

      const { connections } = (await response.json()) as {
        connections: Connections;
      };

      setConnections(connections);

      // Default to whichever service they actually have, preferring Spotify only
      // because that's where the existing catalogue of subscriptions lives.
      setActiveProvider((current) => {
        if (current && connections[current]) return current;

        return (
          (["SPOTIFY", "APPLE_MUSIC"] as MusicProvider[]).find(
            (provider) => connections[provider],
          ) ?? null
        );
      });
    } catch {
      // Leave connections null — callers treat that as "still loading".
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const connected = connections
    ? (Object.keys(connections) as MusicProvider[]).filter((p) => connections[p])
    : [];

  return {
    connections,
    connected,
    /** True once we know, and the answer is "none". */
    hasNone: connections !== null && connected.length === 0,
    activeProvider,
    setActiveProvider,
    reload: load,
  };
}
