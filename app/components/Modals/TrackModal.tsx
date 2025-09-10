import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause, ExternalLink } from "lucide-react";
import { formatTime } from "utils";
import { getTrackPreviewUrl } from "utils/itunesApi";

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: {
    name: string;
    owner: { display_name: string };
    images: Array<{ url: string }>;
  } | null;
  tracks: Array<{ track: any }>;
}

export const TrackModal: React.FC<TrackModalProps> = ({
  isOpen,
  onClose,
  playlist,
  tracks,
}) => {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [previewURL, setPreviewURL] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCurrentPreview();
    }
  }, [isOpen]);

  useEffect(() => {
    if (previewURL && audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
      
      // Auto-stop after 30 seconds
      previewTimeoutRef.current = setTimeout(() => {
        stopCurrentPreview();
      }, 30000);
    }
  }, [previewURL]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentPreview();
    };
  }, []);

  const stopCurrentPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setCurrentlyPlaying(null);
    setLoadingPreview(null);
    setPreviewURL("");
  };

  const playPreview = (track: any) => {
    if (currentlyPlaying === track.id) {
      stopCurrentPreview();
    } else {
      setCurrentlyPlaying(track.id);
      getTrackPreview(track);
    }
  };

  const getTrackPreview = async (track: any) => {
    const trackId = track.id;
    setLoadingPreview(trackId);
    stopCurrentPreview();
    
    try {
      const trackURL = await getTrackPreviewUrl(
        track.name,
        track.artists?.map((artist: any) => artist.name).join(", ") || "",
        track.album.name,
        track.duration_ms
      );
      
      if (trackURL) {
        setCurrentlyPlaying(trackId);
        setPreviewURL(trackURL);
      } else {
        console.log("No preview available for this track");
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
      <audio ref={audioRef} src={previewURL || undefined} className="hidden" />
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
            <img
              src={playlist.images?.[0]?.url}
              alt={playlist.name}
              className="w-20 h-20 rounded-xl shadow-lg"
            />
            <div>
              <h2 className="text-2xl font-bold mb-1">{playlist.name}</h2>
              <p className="text-orange-100">
                By{" "}
                <span className="font-medium">
                  {playlist.owner.display_name}
                </span>
              </p>
              <p className="text-orange-200 text-sm mt-1">
                {tracks.length} tracks
              </p>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-[auto_1fr_auto] gap-4 text-xs font-semibold text-gray-600 py-3 px-4 border-b border-gray-200 mb-4">
              <span className="w-8">#</span>
              <span>TITLE</span>
              <span>DURATION</span>
            </div>

            <div className="space-y-2">
              {tracks.map(({ track }, index) => (
                <div
                  key={track.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-4 items-center py-3 px-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                  onMouseEnter={() => setHoveredTrack(track.id)}
                  onMouseLeave={() => setHoveredTrack(null)}
                  onClick={() => {
                    playPreview(track);
                  }}
                >
                  <div className="flex items-center gap-3">
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
                  </div>

                  <div className="min-w-0 flex items-center gap-4">
                    {track.album?.images?.[0] && (
                      <img
                        src={track.album.images[0].url}
                        alt={track.album.name}
                        className="w-12 h-12 rounded-lg shadow-sm"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-[#CC5500] transition-colors">
                        {track.name}
                      </p>
                      <p className="text-gray-500 text-sm truncate">
                        {track.artists
                          ?.map((artist: any) => artist.name)
                          .join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm font-medium">
                      {formatTime(track.duration_ms)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
