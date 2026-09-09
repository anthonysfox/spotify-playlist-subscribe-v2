"use client";
import React, { useState, useRef } from "react";
import { CuratedPlaylists } from "./CuratedPlaylists";
import { SubscribeSheet } from "./Modals/SubscribeSheet";
import { useMusicStore, connectedProviders } from "store/useMusicStore";
import type { PlaylistSummary } from "@/lib/music/types";
import { SearchAssistant } from "./SearchAssistant";
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
    <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      {/* Mounted here (not inside the grid) so it persists while the sheet
          opens and closes. */}
      <SearchAssistant />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink">
          Find a playlist worth subscribing to.
        </h1>
        <ProviderSwitcher />
      </div>

      {hasNone ? (
        <div className="flex grow flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-1 font-display text-[17px] font-semibold text-ink">
            Nothing to browse yet
          </h2>
          <p className="mb-4 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-50">
            Connect Spotify or Apple Music to start subscribing to playlists.
          </p>
          <a
            href="/settings/connections"
            className="rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-medium text-surface transition-colors hover:bg-brand-deep"
          >
            Connect a service
          </a>
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
