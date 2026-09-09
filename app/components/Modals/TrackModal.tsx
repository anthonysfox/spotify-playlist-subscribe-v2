"use client";

import type { PlaylistSummary, PlaylistTrack } from "@/lib/music/types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Play, Pause } from "lucide-react";
import { PROVIDER_LABELS } from "store/useMusicStore";
import { getTrackPreviewUrl } from "utils/itunesApi";

/**
 * Track preview (README "Screens" > Track preview, artboard 6a).
 *
 * A 440px right drawer — same slot as the subscribe flow — with no gradient
 * header and a "Subscribe to this" action so you can act on what you just
 * heard. Preview behaviour is unchanged: iTunes match on title + artist, 30s
 * cap, one at a time, stopped on close. New: rows resolve their match ahead of
 * the click, so a track with no iTunes preview says "no preview" instead of
 * looking like a dead click.
 */

type PreviewState = "unknown" | "resolving" | "ready" | "none";

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistSummary | null;
  tracks: PlaylistTrack[];
  loading?: boolean;
  /** "Subscribe to this" — hand the previewed playlist to the subscribe flow. */
  onSubscribe?: () => void;
}

// Resolve this many rows on open so their state is known before a click. There
// is no hover on touch, so the eager set has to cover more of the list there.
const EAGER_RESOLVE = 30;

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const TrackModal: React.FC<TrackModalProps> = ({
  isOpen,
  onClose,
  playlist,
  tracks,
  loading = false,
  onSubscribe,
}) => {
  const [state, setState] = useState<Record<string, PreviewState>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const capRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvingRef = useRef<Set<string>>(new Set());

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }
    if (capRef.current) {
      clearTimeout(capRef.current);
      capRef.current = null;
    }
    setPlayingId(null);
    setElapsed(0);
  }, []);

  // Audio stops when the drawer closes, and on unmount.
  useEffect(() => {
    if (!isOpen) stop();
  }, [isOpen, stop]);
  useEffect(() => stop, [stop]);

  // A new playlist's list is a fresh set of rows.
  useEffect(() => {
    setState({});
    setUrls({});
    resolvingRef.current.clear();
    stop();
  }, [playlist?.id, stop]);

  const resolve = useCallback(
    async (track: PlaylistTrack) => {
      if (resolvingRef.current.has(track.id)) return;
      if (state[track.id] === "ready" || state[track.id] === "none") return;
      resolvingRef.current.add(track.id);
      setState((s) => ({ ...s, [track.id]: "resolving" }));
      try {
        const url = await getTrackPreviewUrl(
          track.name,
          track.artists.join(", "),
        );
        if (url) {
          setUrls((u) => ({ ...u, [track.id]: url }));
          setState((s) => ({ ...s, [track.id]: "ready" }));
        } else {
          setState((s) => ({ ...s, [track.id]: "none" }));
        }
      } catch {
        setState((s) => ({ ...s, [track.id]: "none" }));
      } finally {
        resolvingRef.current.delete(track.id);
      }
    },
    [state],
  );

  // Resolve the top of the list on open so the visible rows show honest states
  // without the user having to hover every one.
  useEffect(() => {
    if (!isOpen || loading || tracks.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const track of tracks.slice(0, EAGER_RESOLVE)) {
        if (cancelled) return;
        // eslint-disable-next-line no-await-in-loop
        await resolve(track);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loading, playlist?.id, tracks.length]);

  const play = useCallback(
    (track: PlaylistTrack, url: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (capRef.current) clearTimeout(capRef.current);
      audio.src = url;
      audio.currentTime = 0;
      setElapsed(0);
      setPlayingId(track.id);
      audio.play().catch(() => setPlayingId(null));
      capRef.current = setTimeout(stop, 30_000);
    },
    [stop],
  );

  const onRowClick = async (track: PlaylistTrack) => {
    const st = state[track.id];
    if (st === "none") return;
    if (playingId === track.id) {
      stop();
      return;
    }
    if (st === "ready" && urls[track.id]) {
      play(track, urls[track.id]);
      return;
    }
    // unknown / resolving — resolve then play if it lands
    await resolve(track);
    const url = urls[track.id];
    if (url) play(track, url);
  };

  const onRowHover = (track: PlaylistTrack) => {
    setHoveredId(track.id);
    if (!state[track.id]) resolve(track);
  };

  if (!isOpen || !playlist) return null;

  const externalUrl =
    playlist.provider === "SPOTIFY"
      ? `https://open.spotify.com/playlist/${playlist.id}`
      : `https://music.apple.com/playlist/${playlist.id}`;

  const playingTrack = tracks.find((t) => t.id === playingId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 max-[719px]:items-end max-[719px]:justify-center">
      <audio ref={audioRef} preload="none" playsInline className="hidden" />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative z-10 flex w-full max-w-[440px] flex-col bg-surface shadow-[-8px_0_30px_rgba(26,21,18,0.12)] max-[719px]:max-h-[92vh] max-[719px]:rounded-t-[18px] max-[719px]:pb-[env(safe-area-inset-bottom)]">
        {/* Header */}
        <div className="border-b border-line px-5 py-4">
          <div className="mb-3.5 flex items-center justify-between">
            <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-35">
              Preview source
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-ink-35 hover:text-ink-70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-3.5 flex items-center gap-3.5">
            {playlist.imageUrl ? (
              <img
                src={playlist.imageUrl}
                alt=""
                className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover"
              />
            ) : (
              <span className="art-placeholder h-[76px] w-[76px] shrink-0 rounded-xl" />
            )}
            <div className="min-w-0">
              <div className="font-display text-[18px] font-semibold tracking-[-0.015em] text-ink">
                {playlist.name}
              </div>
              <div className="mt-0.5 text-[12.5px] text-ink-50">
                By {playlist.owner ?? "Unknown"}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-35">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    playlist.provider === "APPLE_MUSIC"
                      ? "bg-apple"
                      : "bg-spotify"
                  }`}
                />
                {playlist.trackCount || tracks.length} tracks
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSubscribe}
              disabled={!onSubscribe}
              className="flex-1 rounded-full bg-brand py-2.5 text-[13.5px] font-medium text-surface transition-colors hover:bg-brand-deep disabled:opacity-50"
            >
              Subscribe to this
            </button>
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-line-strong px-4 py-2.5 text-[13.5px] font-medium text-ink-70 transition-colors hover:border-line"
            >
              Open in {PROVIDER_LABELS[playlist.provider]}
            </a>
          </div>
        </div>

        {/* Track list */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {loading ? (
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[11px] px-3 py-2.5"
                >
                  <span className="w-[22px] shrink-0 text-center font-mono text-[12.5px] text-ink-35">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="h-[11px] w-[55%] rounded bg-ground-chip" />
                    <div className="mt-1.5 h-[9px] w-[34%] rounded bg-ground-alt" />
                  </div>
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-ink-50">
              No tracks to show.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {tracks.map((track, index) => {
                const st = state[track.id] ?? "unknown";
                const isPlaying = playingId === track.id;
                const isHovered = hoveredId === track.id;
                const noPreview = st === "none";
                return (
                  <div
                    key={`${track.id}-${index}`}
                    onMouseEnter={() => onRowHover(track)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onRowClick(track)}
                    className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 transition-colors ${
                      noPreview
                        ? "cursor-default"
                        : "cursor-pointer"
                    } ${
                      isPlaying
                        ? "bg-brand-tint-soft"
                        : isHovered && !noPreview
                          ? "bg-[#F7F3EE]"
                          : ""
                    }`}
                  >
                    <span className="flex w-[22px] shrink-0 items-center justify-center">
                      {st === "resolving" ? (
                        <span className="h-[13px] w-[13px] animate-spin rounded-full border-2 border-[#E4DBD2] border-t-brand" />
                      ) : isPlaying ? (
                        <Pause className="h-3.5 w-3.5 text-brand" />
                      ) : isHovered && !noPreview ? (
                        <Play className="h-3.5 w-3.5 text-ink-50" />
                      ) : (
                        <span className="font-mono text-[12.5px] text-ink-35">
                          {index + 1}
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-[13.5px] font-medium ${
                          isPlaying ? "text-brand-deep" : "text-ink"
                        }`}
                      >
                        {track.name}
                      </div>
                      <div className="truncate text-[12px] text-ink-35">
                        {track.artists.join(", ") || "Unknown Artist"}
                      </div>
                    </div>

                    {isPlaying && (
                      <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[#EFE0D2]">
                        <span
                          className="block h-full bg-brand"
                          style={{ width: `${Math.min(100, (elapsed / 30) * 100)}%` }}
                        />
                      </span>
                    )}
                    {st === "resolving" && !isPlaying && (
                      <span className="shrink-0 text-[11.5px] text-ink-35">
                        finding preview…
                      </span>
                    )}
                    {noPreview && (
                      <span className="shrink-0 text-[11.5px] text-ink-50">
                        no preview
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mini-player */}
        {playingTrack && (
          <div className="flex items-center gap-3 border-t border-line bg-ground px-4 py-3">
            {playlist.imageUrl ? (
              <img
                src={playlist.imageUrl}
                alt=""
                className="h-[34px] w-[34px] shrink-0 rounded-[9px] object-cover"
              />
            ) : (
              <span className="art-placeholder h-[34px] w-[34px] shrink-0 rounded-[9px]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-ink">
                {playingTrack.name}
              </div>
              <div className="text-[11.5px] text-ink-35">
                30-second preview · iTunes
              </div>
            </div>
            <span className="shrink-0 font-mono text-[11.5px] text-ink-35">
              {fmt(elapsed)} / 0:30
            </span>
            <button
              type="button"
              onClick={stop}
              aria-label="Pause preview"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ink text-surface"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* keep elapsed in sync with the audio element */}
      <TimeSync audioRef={audioRef} playing={!!playingId} onTick={setElapsed} />
    </div>
  );
};

/** Bridges the <audio> element's timeupdate events to React state without
 *  re-rendering the whole list on every tick until something is playing. */
function TimeSync({
  audioRef,
  playing,
  onTick,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playing: boolean;
  onTick: (seconds: number) => void;
}) {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playing) return;
    const handler = () => onTick(Math.min(30, audio.currentTime));
    audio.addEventListener("timeupdate", handler);
    return () => audio.removeEventListener("timeupdate", handler);
  }, [audioRef, playing, onTick]);
  return null;
}
