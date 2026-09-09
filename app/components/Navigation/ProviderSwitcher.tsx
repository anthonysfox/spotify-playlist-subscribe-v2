"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  useMusicStore,
  connectedProviders,
  unconnectedProviders,
  PROVIDER_LABELS,
} from "store/useMusicStore";

/**
 * The app-wide Spotify / Apple Music switch, plus a nudge to connect a
 * second service when only one is hooked up.
 *
 * Connecting Apple Music used to only be discoverable by opening the account
 * menu (Clerk's UserButton) and noticing a tab in there — nothing in the main
 * UI hinted it was even possible unless the user had zero services connected
 * (Dashboard's own empty state, which only fires at exactly zero). This lives
 * in the header, the one place "which service am I using" is already
 * answered from anywhere, so it's the natural place to also answer "what
 * else could I connect."
 *
 * Renders nothing at exactly zero connections — Dashboard's empty state
 * already covers that case prominently; duplicating it here would be noise.
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
  const unconnected = unconnectedProviders(connections);

  if (connected.length === 0) return null;

  const providerDot: Record<string, string> = {
    SPOTIFY: "bg-spotify",
    APPLE_MUSIC: "bg-apple",
  };

  return (
    <div className="flex items-center gap-2">
      {connected.length > 1 ? (
        <div
          role="tablist"
          aria-label="Music service"
          className="inline-flex items-center rounded-full border border-line-strong bg-surface p-0.5"
        >
          {connected.map((provider) => {
            const active = provider === activeProvider;

            return (
              <button
                key={provider}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveProvider(provider)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-ink text-surface"
                    : "text-ink-50 hover:text-ink-70"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${providerDot[provider]}`}
                />
                {PROVIDER_LABELS[provider]}
              </button>
            );
          })}
        </div>
      ) : (
        // Only one service connected — nothing to switch between yet, just
        // show what's active.
        <span className="flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-70">
          <span
            className={`h-1.5 w-1.5 rounded-full ${providerDot[connected[0]]}`}
          />
          {PROVIDER_LABELS[connected[0]]}
        </span>
      )}

      {unconnected.length > 0 && (
        <Link
          href="/settings/connections"
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-[13px] font-medium text-ink-50 transition-colors hover:border-brand/40 hover:text-brand"
        >
          <Plus className="h-3.5 w-3.5" />
          Connect {PROVIDER_LABELS[unconnected[0]]}
        </Link>
      )}
    </div>
  );
};
