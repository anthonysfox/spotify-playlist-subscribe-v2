import { MusicProvider } from "@/lib/music";
import { PROVIDER_LABELS } from "store/useMusicStore";
import Link from "next/link";
import React from "react";
import { ManagedPlaylistWithSubscriptions } from "@/types";
import { ChevronDown, Plus, RefreshCw, Settings } from "lucide-react";
import { useUserStore, pendingRemovalKey } from "store/useUserStore";
import { CoverArt } from "./CoverArt";
import { deriveStatus } from "@/lib/sync-status";
import { IconButton } from "./IconButton";

const PROVIDER_DOT: Record<MusicProvider, string> = {
  SPOTIFY: "bg-spotify",
  APPLE_MUSIC: "bg-apple",
};

const TONE_TEXT: Record<string, string> = {
  ok: "text-ok-text",
  warn: "text-warn-text",
  running: "text-ink-70",
  none: "text-ink-50",
};

function StatusBlock({
  playlist,
}: {
  playlist: ManagedPlaylistWithSubscriptions;
}) {
  const s = deriveStatus(playlist);
  return (
    <div className="min-w-0 text-right">
      <div
        className={`flex items-center justify-end gap-1.5 text-[12.5px] font-medium ${TONE_TEXT[s.tone]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot} ${
            s.pulse ? "animate-softpulse" : ""
          }`}
        />
        {s.label}
      </div>
      {s.detail && (
        <div className="text-ink-35 mt-0.5 text-[11.5px]">{s.detail}</div>
      )}
    </div>
  );
}

type SubscriptionRowProps = {
  playlist: ManagedPlaylistWithSubscriptions;
  isOpen: boolean;
  onToggle: () => void;
  /** This row's playlist is the one currently syncing. */
  isSyncing: boolean;
  /** Any sync is in flight, so the sync button is unavailable. */
  syncDisabled: boolean;
  onSync: () => void;
};

export const SubscriptionRow = ({
  playlist,
  isOpen,
  onToggle,
  isSyncing,
  syncDisabled,
  onSync,
}: SubscriptionRowProps) => {
  const pendingSourceRemovals = useUserStore((s) => s.pendingSourceRemovals);
  const removeSourceWithUndo = useUserStore((s) => s.removeSourceWithUndo);
  const undoSourceRemoval = useUserStore((s) => s.undoSourceRemoval);

  const configLine = [
    `${playlist.subscriptions.length} source${
      playlist.subscriptions.length === 1 ? "" : "s"
    }`,
    `${playlist.syncQuantityPerSource} per source`,
    playlist.syncInterval.toLowerCase(),
    playlist.syncMode.toLowerCase(),
  ].join(" · ");
  return (
    <div className="border-line bg-surface overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-3 p-3.5">
        <CoverArt
          src={playlist.imageUrl}
          alt={playlist.name}
          className="h-12 w-12 shrink-0 rounded-[10px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/library/${playlist.id}`}
              className="font-display text-ink hover:text-brand-deep truncate text-[15px] font-semibold"
            >
              {playlist.name}
            </Link>
            <span className="bg-ground-alt text-ink-50 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
              <span
                className={`h-1.5 w-1.5 rounded-full ${PROVIDER_DOT[playlist.provider]}`}
              />
              {PROVIDER_LABELS[playlist.provider]}
            </span>
          </div>
          <div className="text-ink-50 mt-0.5 truncate text-[12.5px]">
            {configLine}
          </div>
        </div>

        <div className="hidden sm:block">
          <StatusBlock playlist={playlist} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton label="Sync now" onClick={onSync} disabled={syncDisabled}>
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
          </IconButton>
          <Link
            href={`/library/${playlist.id}/settings`}
            aria-label={`Settings for ${playlist.name}`}
            title="Settings"
            className="border-line text-ink-35 hover:border-line-strong hover:bg-ground-alt hover:text-ink-70 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <IconButton label={isOpen ? "Collapse" : "Expand"} onClick={onToggle}>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </IconButton>
        </div>
      </div>

      {/* status on its own line on narrow screens */}
      <div className="border-line border-t px-3.5 py-2 sm:hidden">
        <StatusBlock playlist={playlist} />
      </div>

      {isOpen && (
        <div className="border-line bg-surface-sunk border-t px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-ink-35 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
              {playlist.contributions &&
              Object.keys(playlist.contributions).length
                ? "Sources · contribution last 30 days"
                : "Sources"}
            </span>
            <Link
              href="/"
              className="text-brand-deep hover:text-brand inline-flex items-center gap-1 text-[12px] font-medium"
            >
              <Plus className="h-3 w-3" />
              Add source
            </Link>
          </div>

          <div className="flex flex-col">
            {playlist.subscriptions.map((sub) => {
              const key = pendingRemovalKey(playlist.id, sub.sourcePlaylist.id);
              if (pendingSourceRemovals[key]) {
                return (
                  <div
                    key={key}
                    className="bg-brand-tint text-brand-deep my-1 flex items-center justify-between rounded-xl px-3 py-2 text-[12.5px]"
                  >
                    <span className="min-w-0 truncate">
                      Removed{" "}
                      <b className="font-semibold">{sub.sourcePlaylist.name}</b>{" "}
                      from this playlist.
                    </span>
                    <button
                      type="button"
                      onClick={() => undoSourceRemoval(key)}
                      className="ml-3 shrink-0 font-semibold underline underline-offset-2"
                    >
                      Undo
                    </button>
                  </div>
                );
              }
              const contrib =
                playlist.contributions?.[sub.sourcePlaylist.id] ?? null;
              const maxContrib = playlist.contributions
                ? Math.max(1, ...Object.values(playlist.contributions))
                : 1;
              return (
                <div
                  key={sub.sourcePlaylist.id}
                  className={`border-line flex items-center gap-3 border-b py-2 last:border-b-0 ${
                    contrib === 0 ? "opacity-60" : ""
                  }`}
                >
                  <CoverArt
                    src={sub.sourcePlaylist.imageUrl}
                    alt={sub.sourcePlaylist.name}
                    className="h-7 w-7 shrink-0 rounded-md"
                  />
                  <span className="text-ink-70 min-w-0 flex-1 truncate text-[12.5px] font-medium">
                    {sub.sourcePlaylist.name}
                  </span>
                  {contrib !== null ? (
                    <span className="flex w-24 shrink-0 items-center gap-2">
                      <span className="bg-ground-chip h-[5px] flex-1 overflow-hidden rounded-full">
                        <span
                          className="bg-brand block h-full rounded-full"
                          style={{
                            width: `${(contrib / maxContrib) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="text-ink-35 font-mono text-[11px]">
                        {contrib}
                      </span>
                    </span>
                  ) : (
                    <span className="text-ink-35 shrink-0 font-mono text-[11px]">
                      {sub.sourcePlaylist.trackCount} trks
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      removeSourceWithUndo(
                        playlist.id,
                        sub.sourcePlaylist.id,
                        sub.sourcePlaylist.name,
                      )
                    }
                    className="text-ink-35 hover:text-warn-text shrink-0 text-[12px] font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              );
            })}

            {playlist.subscriptions.every(
              (sub) =>
                pendingSourceRemovals[
                  pendingRemovalKey(playlist.id, sub.sourcePlaylist.id)
                ],
            ) &&
              playlist.subscriptions.length > 0 && (
                <p className="text-ink-35 py-2 text-[12px]">
                  All sources removed.
                </p>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
