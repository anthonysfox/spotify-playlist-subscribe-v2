import React from "react";
import { X, Play, Pause, ExternalLink, Plus } from "lucide-react";
import { formatTime } from "utils";
import { getDeviceId } from "utils/spotifyPlayerUtils";

interface TrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: {
    name: string;
    owner: { display_name: string };
    images: Array<{ url: string }>;
  } | null;
  tracks: Array<{ track: any }>;
  currentlyPlaying: string | null;
  onTrackPreview: (track: any) => void;
  isPreviewSupported?: boolean;
}

export const TrackModal: React.FC<TrackModalProps> = ({
  isOpen,
  onClose,
  playlist,
  tracks,
  currentlyPlaying,
  onTrackPreview,
  isPreviewSupported = true,
}) => {
  
  // Detect if we should use queue method (for mobile) or Web Playback SDK (desktop)
  const isMobile = typeof window !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  const openInSpotify = (trackId: string) => {
    const spotifyUrl = `https://open.spotify.com/track/${trackId}`;
    window.open(spotifyUrl, '_blank');
  };

  const addToQueueAndPlay = async (trackId: string) => {
    try {
      const deviceId = getDeviceId();
      
      // Get token first
      const tokenResponse = await fetch('/api/spotify/token');
      const { token } = await tokenResponse.json();
      
      // Call Spotify API directly
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
          position_ms: 30000,
        }),
      });

      if (response.ok) {
        console.log('Track playing directly from Spotify API');
        // Update the currently playing state for UI
        if (currentlyPlaying !== trackId) {
          onTrackPreview({ id: trackId });
        }
        
        // Auto-pause after 30 seconds
        setTimeout(async () => {
          if (currentlyPlaying === trackId) {
            await pausePlayback();
          }
        }, 30000);
      } else {
        // Fallback to opening in Spotify
        openInSpotify(trackId);
      }
    } catch (error) {
      console.error('Failed to play track directly:', error);
      // Fallback to opening in Spotify
      openInSpotify(trackId);
    }
  };

  const pausePlayback = async () => {
    try {
      const response = await fetch('/api/spotify/player/pause', {
        method: 'PUT',
      });

      if (response.ok) {
        console.log('Playback paused');
        // Clear currently playing state
        onTrackPreview({ id: null });
      }
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  // Debug: Log preview support status
  console.log('TrackModal - isPreviewSupported:', isPreviewSupported, 'UserAgent:', typeof window !== 'undefined' ? navigator.userAgent : 'undefined');
  if (!isOpen || !playlist) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
                  onClick={() => {
                    if (currentlyPlaying === track.id) {
                      if (isMobile) {
                        pausePlayback();
                      } else {
                        onTrackPreview(track);
                      }
                    } else {
                      if (isMobile) {
                        addToQueueAndPlay(track.id);
                      } else {
                        onTrackPreview(track);
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-gray-500 text-sm font-medium">
                      {currentlyPlaying === track.id ? (
                        <Pause size={14} className="text-[#CC5500]" />
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
                    {!isPreviewSupported && (
                      <button
                        onClick={() => openInSpotify(track.id)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                        title="Open in Spotify"
                      >
                        <ExternalLink size={12} className="text-gray-400 hover:text-[#CC5500]" />
                      </button>
                    )}
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
