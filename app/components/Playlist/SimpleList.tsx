import React, { useMemo, useRef, useState, useEffect } from "react";
import type { PlaylistSummary } from "@/lib/music/types";
import { Plus, Check, X } from "lucide-react";
import { useUserStore } from "../../../store/useUserStore";
import { PROVIDER_LABELS } from "../../../store/useMusicStore";
import { TrackModal } from "../Modals/TrackModal";
import toast from "react-hot-toast";

/**
 * Discover grid (README "Discover", artboard 1b): square covers, 5 columns on
 * desktop down to 2 under ~720px. Clicking the cover previews tracks; the small
 * `+` opens the subscribe sheet. Shift-click (desktop) or long-press (mobile) a
 * cover enters batch-select mode to subscribe several sources at once (`4b`).
 */
export const SimplePlaylistList = ({
  playlists,
  onSubscribe,
}: {
  playlists: PlaylistSummary[];
  onSubscribe: (sources: PlaylistSummary[]) => void;
}) => {
  const managedPlaylists = useUserStore((state) => state.managedPlaylists);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] =
    useState<PlaylistSummary | null>(null);
  const [previewTracks, setPreviewTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectMode = selectedIds.size > 0;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    if (!selectMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitSelect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectMode]);

  const byId = useMemo(
    () => new Map(playlists.map((p) => [p.id, p])),
    [playlists],
  );

  const subscribedIds = useMemo(
    () =>
      new Set(
        managedPlaylists.flatMap((mp) =>
          mp.subscriptions.map((sub) => sub.sourcePlaylist.externalPlaylistId),
        ),
      ),
    [managedPlaylists],
  );

  const managedForSource = (sourceId: string) =>
    managedPlaylists.filter((mp) =>
      mp.subscriptions.some(
        (sub) => sub.sourcePlaylist.externalPlaylistId === sourceId,
      ),
    );

  const exitSelect = () => {
    setSelectedIds(new Set());
  };

  const enterSelectWith = (id: string) => {
    setSelectedIds(new Set([id]));
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleCoverClick = (playlist: PlaylistSummary, e: React.MouseEvent) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectMode) {
      toggleSelected(playlist.id);
      return;
    }
    if (e.shiftKey) {
      enterSelectWith(playlist.id);
      return;
    }
    handleViewTracks(playlist);
  };

  const startLongPress = (id: string) => {
    if (selectMode) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      enterSelectWith(id);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleViewTracks = async (playlist: PlaylistSummary) => {
    // No user-agent branch: a phone plays a 30s preview fine, and the preview
    // drawer becomes a bottom sheet under 720px (README artboards 9a/9b). The
    // deep link stays, demoted to the "Open in …" action inside the sheet.
    setSelectedPlaylistForModal(playlist);
    setPreviewTracks([]);
    setTrackModalOpen(true);
    setLoadingTracks(playlist.id);

    try {
      const res = await fetch(
        `/api/music/playlist-tracks?provider=${playlist.provider}&id=${playlist.id}`,
      );
      if (!res.ok) throw new Error("Failed to fetch playlist tracks");
      const { tracks } = await res.json();
      setPreviewTracks([...tracks]);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      toast.error("Couldn't load tracks for this playlist");
    } finally {
      setLoadingTracks(null);
    }
  };

  const handleTrackModalClose = () => {
    setTrackModalOpen(false);
    setSelectedPlaylistForModal(null);
    setPreviewTracks([]);
  };

  const selectedList = [...selectedIds]
    .map((id) => byId.get(id))
    .filter(Boolean) as PlaylistSummary[];

  return (
    <div className="w-full pb-4">
      <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {playlists
          .filter((playlist) => playlist)
          .map((playlist, index) => {
            const subscribed = subscribedIds.has(playlist.id);
            const feeds = subscribed ? managedForSource(playlist.id) : [];
            const picked = selectedIds.has(playlist.id);
            return (
              <div
                key={`tile-${playlist.id}-${index}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => handleCoverClick(playlist, e)}
                    onPointerDown={() => startLongPress(playlist.id)}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    aria-label={
                      selectMode
                        ? `${picked ? "Deselect" : "Select"} ${playlist.name}`
                        : `Preview ${playlist.name}`
                    }
                    className={`block w-full overflow-hidden rounded-xl ${
                      picked
                        ? "outline outline-[2.5px] outline-offset-2 outline-brand"
                        : ""
                    }`}
                  >
                    {playlist.imageUrl ? (
                      <img
                        src={playlist.imageUrl}
                        alt={playlist.name}
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover transition-opacity group-hover:opacity-95"
                      />
                    ) : (
                      <div className="art-placeholder aspect-square w-full" />
                    )}
                  </button>

                  {selectMode ? (
                    <span
                      className={`absolute left-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-lg ${
                        picked
                          ? "bg-brand text-surface"
                          : "border-2 border-surface bg-ink/20"
                      }`}
                    >
                      {picked && (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      )}
                    </span>
                  ) : subscribed ? (
                    <span className="absolute right-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-medium text-surface">
                      Subscribed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSubscribe([playlist])}
                      aria-label={`Subscribe to ${playlist.name}`}
                      className="absolute right-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-surface text-brand opacity-0 shadow-[0_1px_3px_rgba(26,21,18,0.15)] transition-opacity hover:bg-brand-tint-soft focus:opacity-100 group-hover:opacity-100"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  )}

                  {loadingTracks === playlist.id && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink/10">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-surface border-t-transparent" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium text-ink">
                    {playlist.name}
                  </div>
                  {subscribed ? (
                    <div className="truncate text-[12px] text-brand">
                      →{" "}
                      {feeds.map((m) => m.name).join(", ") ||
                        "managed playlist"}
                    </div>
                  ) : (
                    <div className="truncate text-[12px] text-ink-35">
                      {PROVIDER_LABELS[playlist.provider]} ·{" "}
                      {playlist.trackCount} tracks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {selectMode && (
        <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-3 rounded-2xl bg-ink p-3.5 text-surface shadow-[0_8px_24px_rgba(26,21,18,0.28)]">
          <div className="flex items-center gap-3">
            <span className="flex shrink-0">
              {selectedList.slice(0, 3).map((s, i) => (
                <span
                  key={s.id}
                  className="h-8 w-8 overflow-hidden rounded-md border-2 border-ink bg-ink-70"
                  style={{ marginLeft: i === 0 ? 0 : -10 }}
                >
                  {s.imageUrl && (
                    <img
                      src={s.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
              ))}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">
                {selectedList.length} source
                {selectedList.length === 1 ? "" : "s"} selected
              </div>
              <div className="truncate text-[11.5px] text-ink-25">
                {selectedList.map((s) => s.name).join(", ")}
              </div>
            </div>
            <button
              type="button"
              onClick={exitSelect}
              aria-label="Done"
              className="shrink-0 rounded-md p-1 text-ink-25 hover:text-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={selectedList.length === 0}
            onClick={() => {
              onSubscribe(selectedList);
              exitSelect();
            }}
            className="w-full rounded-xl bg-brand py-3 text-[14px] font-medium text-surface transition-colors hover:bg-brand-deep disabled:opacity-50"
          >
            Subscribe all {selectedList.length}
          </button>
        </div>
      )}

      <TrackModal
        isOpen={trackModalOpen}
        onClose={handleTrackModalClose}
        playlist={selectedPlaylistForModal}
        tracks={previewTracks}
        loading={loadingTracks !== null}
        onSubscribe={
          selectedPlaylistForModal
            ? () => {
                onSubscribe([selectedPlaylistForModal]);
                handleTrackModalClose();
              }
            : undefined
        }
      />
    </div>
  );
};
