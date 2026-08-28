import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Music2, Pause, Play } from "lucide-react";
import type { PlaylistSummary } from "@/lib/music/types";
import type { PlaylistTrack } from "@/lib/track-filters";
import { getTrackPreviewUrl } from "utils/itunesApi";

const PREVIEW_TRACK_LIMIT = 3;
// Same cap TrackModal uses — iTunes previews are ~30s clips; this is a safety
// stop in case an audio element's own end event doesn't fire.
const PREVIEW_AUDIO_TIMEOUT_MS = 30000;

/**
 * searchPlaylists results, rendered as a horizontally-scrolling row of
 * flippable artwork tiles.
 *
 * Owns one shared `<audio>` element for the whole row, so clicking a second
 * track's play button stops whatever was already playing instead of
 * overlapping it.
 */
export function PlaylistResultCards({
  playlists,
}: {
  playlists: PlaylistSummary[];
}) {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [flippedPlaylistId, setFlippedPlaylistId] = useState<string | null>(
    null,
  );

  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    setPlayingTrackId(null);
    setLoadingTrackId(null);
  };

  // Stop playback if the whole message tree unmounts (chat closed mid-preview).
  useEffect(() => stop, []);

  const togglePlay = async (track: PlaylistTrack) => {
    if (playingTrackId === track.id) {
      stop();
      return;
    }

    stop();
    setLoadingTrackId(track.id);

    let previewUrl: string | null = null;
    try {
      // Matched on title + artist via iTunes — the same source TrackModal
      // uses, since Spotify's own preview_url isn't reliably available.
      previewUrl = await getTrackPreviewUrl(
        track.name,
        track.artists.join(", "),
      );
    } catch {
      previewUrl = null;
    }

    if (!previewUrl || !audioRef.current) {
      setLoadingTrackId(null);
      return;
    }

    const audio = audioRef.current;
    audio.src = previewUrl;
    audio.load();

    const handleCanPlay = () => {
      setLoadingTrackId(null);
      setPlayingTrackId(track.id);
      audio.play().catch(() => stop());
    };
    const handleEnded = () => stop();
    const handleError = () => stop();

    audio.addEventListener("canplaythrough", handleCanPlay, { once: true });
    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });

    stopTimeoutRef.current = setTimeout(stop, PREVIEW_AUDIO_TIMEOUT_MS);
  };

  return (
    // items-start keeps each card's height independent — a flex row (like a
    // grid row) stretches every child to match the tallest by default.
    <div className="my-1 flex items-start gap-1.5 overflow-x-auto pb-1">
      <audio ref={audioRef} className="hidden" preload="none" playsInline />
      {playlists.map((playlist) => (
        <PlaylistPreviewCard
          key={playlist.id}
          playlist={playlist}
          playingTrackId={playingTrackId}
          loadingTrackId={loadingTrackId}
          onTogglePlay={togglePlay}
          setFlippedPlaylistId={setFlippedPlaylistId}
          isFlipped={playlist.id === flippedPlaylistId}
          stop={stop}
        />
      ))}
    </div>
  );
}

/**
 * A square artwork tile that flips in place to show its first few tracks,
 * each playable as a 30s preview.
 *
 * The track list is fetched only on the first flip, not for every result up
 * front — most search results never get clicked, so eagerly fetching tracks
 * for all of them would mean paying for previews nobody looks at. Once
 * fetched, the result is kept in state so flipping back and forth doesn't
 * refetch. Front and back are absolutely positioned on top of each other
 * inside a fixed aspect-square box, so flipping never changes the tile's
 * height — which is also what keeps it from stretching its row-mates.
 */
function PlaylistPreviewCard({
  playlist,
  playingTrackId,
  loadingTrackId,
  onTogglePlay,
  isFlipped,
  setFlippedPlaylistId,
  stop,
}: {
  playlist: PlaylistSummary;
  playingTrackId: string | null;
  loadingTrackId: string | null;
  onTogglePlay: (track: PlaylistTrack) => void;
  isFlipped: boolean;
  setFlippedPlaylistId: (flippedPlaylistId: string | null) => void;
  stop: () => void;
}) {
  const [tracks, setTracks] = useState<PlaylistTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flipToBack = async () => {
    setFlippedPlaylistId(playlist.id);
    stop();

    if (tracks !== null || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/music/playlist-tracks?provider=${playlist.provider}&id=${playlist.id}&limit=${PREVIEW_TRACK_LIMIT}`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {
      setError("Couldn't load preview");
    } finally {
      setLoading(false);
    }
  };

  const flipToFront = () => {
    setFlippedPlaylistId(null);
    stop();
  };

  return (
    <div className="w-28 shrink-0 [perspective:800px]">
      <div
        className="relative aspect-square w-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : undefined,
        }}
      >
        {/* Front — square artwork, name/count overlaid at the bottom */}
        <button
          type="button"
          onClick={flipToBack}
          style={{ backfaceVisibility: "hidden" }}
          className="absolute inset-0 overflow-hidden rounded-lg border border-gray-200 text-left"
          aria-label={`Preview ${playlist.name}`}
        >
          {playlist.imageUrl ? (
            <img
              src={playlist.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100">
              <Music2 className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-1.5 pb-1 pt-4">
            <p className="truncate text-[10px] font-medium text-white">
              {playlist.name}
            </p>
            <p className="truncate text-[9px] text-white/70">
              {playlist.trackCount ?? 0} tracks
            </p>
          </div>
        </button>

        {/* Back — track preview */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-1"
        >
          <div className="flex items-center justify-between px-0.5 pb-0.5">
            <span className="text-[9px] font-medium text-gray-400">
              Preview
            </span>
            <button
              type="button"
              onClick={flipToFront}
              className="text-gray-400 hover:text-[#CC5500]"
              aria-label="Back to results"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto text-[10px] text-gray-600">
            {loading && <span className="text-gray-400">Loading…</span>}
            {error && <span className="text-red-500">{error}</span>}
            {tracks && tracks.length === 0 && (
              <span className="text-gray-400">No tracks found</span>
            )}
            {tracks && tracks.length > 0 && (
              <ul className="space-y-0.5">
                {tracks.map((track) => {
                  const isPlaying = playingTrackId === track.id;
                  const isLoading = loadingTrackId === track.id;
                  return (
                    <li key={track.id}>
                      <button
                        type="button"
                        onClick={() => onTogglePlay(track)}
                        className="flex w-full items-center gap-1 rounded text-left hover:text-[#CC5500]"
                      >
                        {isLoading ? (
                          <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-[#CC5500]" />
                        ) : isPlaying ? (
                          <Pause className="h-2.5 w-2.5 shrink-0 text-[#CC5500]" />
                        ) : (
                          <Play className="h-2.5 w-2.5 shrink-0 text-gray-400" />
                        )}
                        <span className="truncate">{track.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
