import { create } from "zustand";
import type { MusicProvider } from "@/lib/music/types";

export const PROVIDER_LABELS: Record<MusicProvider, string> = {
  SPOTIFY: "Spotify",
  APPLE_MUSIC: "Apple Music",
};

export const PROVIDER_ORDER: MusicProvider[] = ["SPOTIFY", "APPLE_MUSIC"];

type Connections = Record<MusicProvider, boolean>;

interface MusicStore {
  /** null until the first load resolves — callers treat that as "still loading". */
  connections: Connections | null;
  /** The service the whole app is currently acting on. */
  activeProvider: MusicProvider | null;

  setActiveProvider: (provider: MusicProvider) => void;
  loadConnections: () => Promise<void>;
  /**
   * Seed connections directly (e.g. from data a Server Component already
   * fetched) instead of fetching them again client-side. Same
   * active-provider selection logic as loadConnections, so the two paths
   * can't drift apart.
   */
  setConnections: (connections: Connections | null) => void;
}

/** Keep the current choice if it's still connected; otherwise fall back to the
 * first connected service (Spotify first, only because that's where existing
 * subscriptions live). */
function pickActiveProvider(
  connections: Connections | null,
  current: MusicProvider | null,
): MusicProvider | null {
  if (!connections) return null;
  if (current && connections[current]) return current;
  return PROVIDER_ORDER.find((provider) => connections[provider]) ?? null;
}

/**
 * The active music service, shared app-wide.
 *
 * This has to be a single store rather than per-component state: the header
 * switcher and the discover tab both read and write "which service am I in",
 * and if each held its own copy they'd drift apart the moment you switched.
 */
export const useMusicStore = create<MusicStore>((set, get) => ({
  connections: null,
  activeProvider: null,

  setActiveProvider: (provider) => set({ activeProvider: provider }),

  setConnections: (connections) => {
    const activeProvider = pickActiveProvider(
      connections,
      get().activeProvider,
    );
    set({ connections, activeProvider });
  },

  loadConnections: async () => {
    try {
      const response = await fetch("/api/music/connections");
      if (!response.ok) return;

      const { connections } = (await response.json()) as {
        connections: Connections;
      };

      set({
        connections,
        activeProvider: pickActiveProvider(connections, get().activeProvider),
      });
    } catch {
      // Leave connections null; the UI shows a loading/disabled state.
    }
  },
}));

/** Derived helpers, so components don't re-implement them. */
export function connectedProviders(
  connections: Connections | null,
): MusicProvider[] {
  if (!connections) return [];
  return PROVIDER_ORDER.filter((provider) => connections[provider]);
}

/** The flip side of connectedProviders — what's still available to connect. */
export function unconnectedProviders(
  connections: Connections | null,
): MusicProvider[] {
  if (!connections) return [];
  return PROVIDER_ORDER.filter((provider) => !connections[provider]);
}
