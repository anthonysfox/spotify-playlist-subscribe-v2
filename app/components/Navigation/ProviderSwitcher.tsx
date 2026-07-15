"use client";

import { useEffect } from "react";
import {
  useMusicStore,
  connectedProviders,
  PROVIDER_LABELS,
} from "store/useMusicStore";

/**
 * The app-wide Spotify / Apple Music switch.
 *
 * Renders nothing unless the user actually has more than one service connected —
 * there's nothing to switch between otherwise, and a lone toggle would just be
 * noise. Lives in the header so "which service am I in" is answerable from
 * anywhere, not only inside the discover tab.
 */
export const ProviderSwitcher = () => {
  const connections = useMusicStore((s) => s.connections);
  const activeProvider = useMusicStore((s) => s.activeProvider);
  const setActiveProvider = useMusicStore((s) => s.setActiveProvider);
  const loadConnections = useMusicStore((s) => s.loadConnections);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const connected = connectedProviders(connections);

  if (connected.length < 2 || !activeProvider) return null;

  return (
    <div
      role="tablist"
      aria-label="Music service"
      className="inline-flex items-center rounded-full bg-gray-100 p-0.5"
    >
      {connected.map((provider) => {
        const active = provider === activeProvider;

        return (
          <button
            key={provider}
            role="tab"
            aria-selected={active}
            onClick={() => setActiveProvider(provider)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              active
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {PROVIDER_LABELS[provider]}
          </button>
        );
      })}
    </div>
  );
};
