import type { PlaylistSummary, PlaylistTrack } from "@/lib/music/types";
import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause } from "lucide-react";
import { getTrackPreviewUrl } from "utils/itunesApi";

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistSummary | null;
  // Provider-agnostic tracks, the same shape the sync engine works in. This used
  // to be Spotify's nested `{ track: { album, duration_ms, artists: [{name}] } }`
  // shape, which no longer matches what the API returns — a track's artists are
  // now plain strings, and there's no album/duration.
  tracks: PlaylistTrack[];
  loading?: boolean;
}

export const TrackModal: React.FC<TrackModalProps> = ({
  isOpen,
  onClose,
  playlist,
  tracks,
  loading = false,
}) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [previewURL, setPreviewURL] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) stopCurrentPreview();
  }, [isOpen]);

  useEffect(() => {
    if (previewURL && audioRef.current) {
      const audio = audioRef.current;

      audio.pause();
      audio.currentTime = 0;
      audio.src = previewURL;
      audio.load();

      const handleCanPlay = () => {
        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      };

      const handleError = () => {
        console.error("Audio loading error");
        setCurrentlyPlaying(null);
        setPreviewURL("");
      };

      audio.addEventListener("canplaythrough", handleCanPlay);
      audio.addEventListener("error", handleError);

      previewTimeoutRef.current = setTimeout(() => {
        stopCurrentPreview();
      }, 30000);

      return () => {
        audio.removeEventListener("canplaythrough", handleCanPlay);
        audio.removeEventListener("error", handleError);
      };
    }
  }, [previewURL]);

  useEffect(() => {
    return () => stopCurrentPreview();
  }, []);

  const stopCurrentPreview = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setCurrentlyPlaying(null);
    setLoadingPreview(null);
    setPreviewURL("");
  };

  const playPreview = (track: PlaylistTrack) => {
    if (currentlyPlaying === track.id) {
      stopCurrentPreview();
    } else {
      setCurrentlyPlaying(track.id);
      getTrackPreview(track);
    }
  };

  const handleManualPlay = async () => {
    if (audioRef.current && previewURL) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error("Manual play failed:", error);
      }
    }
  };

  const getTrackPreview = async (track: PlaylistTrack) => {
    setLoadingPreview(track.id);
    stopCurrentPreview();

    try {
      // Previews come from iTunes, matched on title + artist — which is all we
      // have (and all we need), and works the same whether the track came from
      // Spotify or Apple Music.
      const trackURL = await getTrackPreviewUrl(
        track.name,
        track.artists.join(", "),
      );

      if (trackURL) {
        setCurrentlyPlaying(track.id);
        setPreviewURL(trackURL);
      } else {
        setCurrentlyPlaying(null);
      }
    } catch (error) {
      console.error("Error getting track preview:", error);
      setCurrentlyPlaying(null);
    }

    setLoadingPreview(null);
  };

  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <audio
        ref={audioRef}
        src={previewURL || undefined}
        className="hidden"
        preload="none"
        playsInline
        controls={false}
      />
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-colors hover:cursor-pointer"
          >
            <X size={24} />
          </button>

          <div className="flex items-center gap-4">
            {playlist.imageUrl && (
              <img
                src={playlist.imageUrl}
                alt={playlist.name}
                className="w-20 h-20 rounded-xl shadow-lg"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold mb-1">{playlist.name}</h2>
              <p className="text-orange-100">
                By{" "}
                <span className="font-medium">
                  {playlist.owner ?? "Unknown"}
                </span>
              </p>
              <p className="text-orange-200 text-sm mt-1">
                {loading ? "Loading tracks…" : `${tracks.length} tracks`}
              </p>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-[#CC5500] rounded-full animate-spin mb-3" />
                Loading tracks…
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No tracks to show.
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    className="grid grid-cols-[auto_1fr] gap-4 items-center py-3 px-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                    onMouseEnter={() => setHoveredTrack(track.id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                    onClick={async () => {
                      if (currentlyPlaying === track.id && previewURL) {
                        await handleManualPlay();
                      } else {
                        playPreview(track);
                      }
                    }}
                  >
                    <span className="w-6 text-gray-500 text-sm font-medium flex items-center justify-center">
                      {loadingPreview === track.id ? (
                        <div className="w-3 h-3 border-2 border-gray-300 border-t-[#CC5500] rounded-full animate-spin" />
                      ) : currentlyPlaying === track.id ? (
                        <Pause size={14} className="text-[#CC5500]" />
                      ) : hoveredTrack === track.id ? (
                        <Play size={14} className="text-gray-500" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-[#CC5500] transition-colors">
                        {track.name}
                      </p>
                      <p className="text-gray-500 text-sm truncate">
                        {track.artists.join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
