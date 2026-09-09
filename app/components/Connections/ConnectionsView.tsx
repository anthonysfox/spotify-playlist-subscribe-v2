"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useMusicStore } from "store/useMusicStore";
import { AppleMusicConnect } from "../AppleMusicConnect";
import { McpTokens } from "../McpTokens";

/**
 * Connections — one page for the music services PlaylistFox can sync with plus
 * MCP access tokens (README "Screens" > Connections). Replaces `/profile` and
 * the Clerk account-menu entries for Apple Music / MCP tokens.
 */
export function ConnectionsView() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const connections = useMusicStore((s) => s.connections);

  const spotifyAccount = user?.externalAccounts?.find((a) =>
    /spotify/i.test(a.provider),
  );
  const spotifyConnected =
    connections?.SPOTIFY ?? Boolean(spotifyAccount);
  const spotifyHandle =
    spotifyAccount?.username ||
    spotifyAccount?.emailAddress ||
    [spotifyAccount?.firstName, spotifyAccount?.lastName]
      .filter(Boolean)
      .join(" ") ||
    null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-1 font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Connections
        </h1>
        <p className="mb-6 text-[13px] text-ink-50">
          The music services PlaylistFox can sync with, and tokens for the MCP
          server.
        </p>

        <div className="flex flex-col gap-3">
          {/* Spotify — managed through Clerk's connected accounts */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-spotify" />
                  <span className="font-display text-[15px] font-semibold text-ink">
                    Spotify
                  </span>
                  <span
                    className={`text-[11.5px] font-medium ${
                      spotifyConnected ? "text-ok-text" : "text-ink-50"
                    }`}
                  >
                    {spotifyConnected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <p className="mt-1 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-50">
                  Lets PlaylistFox read your playlists, create managed playlists
                  and add tracks on your behalf.
                  {spotifyConnected && spotifyHandle
                    ? ` Signed in as ${spotifyHandle}.`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openUserProfile()}
                className={`shrink-0 rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors ${
                  spotifyConnected
                    ? "border border-line-strong text-ink-70 hover:border-brand/40 hover:text-brand"
                    : "bg-brand text-surface hover:bg-brand-deep"
                }`}
              >
                {spotifyConnected ? "Manage" : "Connect"}
              </button>
            </div>
            {spotifyConnected && (
              <p className="mt-2 text-[11px] text-ink-35">
                Disconnect or reconnect Spotify under “Connected accounts” in
                your account settings.
              </p>
            )}
          </div>

          {/* Apple Music — owns its own connect/disconnect/reconnect flow */}
          <AppleMusicConnect />
        </div>

        <div className="mt-8">
          <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
            Developer
          </div>
          <McpTokens />
        </div>
      </div>
    </div>
  );
}
