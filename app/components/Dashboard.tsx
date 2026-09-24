"use client";
import React, { useState, useRef } from "react";
import { CuratedPlaylists } from "./CuratedPlaylists";
import { SubscribeSheet } from "./Modals/SubscribeSheet";
import { useMusicStore, connectedProviders } from "store/useMusicStore";
import type { PlaylistSummary } from "@/lib/music/types";
import { ProviderSwitcher } from "./Navigation/ProviderSwitcher";

/**
 * The Discover screen. Navigation is real routes now (AppShell), so this no
 * longer owns an `activeTab` — the Library / Activity / Connections views live
 * at their own paths.
 */
const Dashboard = () => {
  const connections = useMusicStore((s) => s.connections);
  const activeProvider = useMusicStore((s) => s.activeProvider);

  // The subscribe sheet takes one or more source playlists — a single `+` click
  // passes one, batch-select passes several.
  const [subscribeSources, setSubscribeSources] = useState<
    PlaylistSummary[] | null
  >(null);
  const listRef = useRef<HTMLDivElement>(null);

  const connected = connectedProviders(connections);
  const hasNone = connections !== null && connected.length === 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      <div className="mb-5 flex w-full flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-ink text-[30px] leading-tight font-semibold tracking-[-0.025em]">
          Find a playlist worth subscribing to.
        </h1>
        <ProviderSwitcher />
      </div>

      {hasNone ? (
        <div className="flex grow flex-col items-center justify-center p-8 text-center">
          <span className="bg-surface mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
            <img src="/logo.png" alt="" className="h-16 w-16 object-cover" />
          </span>
          <h2 className="font-display text-ink mb-1 text-[17px] font-semibold">
            Nothing to browse yet
          </h2>
          <p className="text-ink-50 mb-4 max-w-[34ch] text-[13.5px] leading-relaxed">
            Connect a music service and PlaylistFox can start pulling playlists
            in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <a
              href="/settings/connections"
              className="bg-brand text-surface hover:bg-brand-deep rounded-full px-5 py-2.5 text-[13.5px] font-medium transition-colors"
            >
              Connect Spotify
            </a>
            <a
              href="/settings/connections"
              className="border-line-strong text-ink-70 hover:border-brand/40 hover:text-brand rounded-full border px-5 py-2.5 text-[13.5px] font-medium transition-colors"
            >
              Connect Apple Music
            </a>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 grow flex-col">
          {activeProvider && (
            <CuratedPlaylists
              key={activeProvider}
              provider={activeProvider}
              onSubscribe={setSubscribeSources}
              listRef={listRef}
              isActive={true}
            />
          )}
        </div>
      )}

      {subscribeSources && subscribeSources.length > 0 && (
        <SubscribeSheet
          sources={subscribeSources}
          onClose={() => setSubscribeSources(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
