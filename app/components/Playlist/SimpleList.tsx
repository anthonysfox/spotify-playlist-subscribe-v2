import React, { useMemo, useState, useEffect } from "react";
import { ISpotifyPlaylist } from "../../../utils/types";
import { Bell, Plus, Music, ExternalLink } from "lucide-react";
import { useUserStore } from "../../../store/useUserStore";
import { TrackModal } from "../Modals/TrackModal";

export const SimplePlaylistList = ({
  playlists,
  setSelectedPlaylist,
  setShowSubscribeModal,
}: {
  playlists: ISpotifyPlaylist[];
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const managedPlaylists = useUserStore((state) => state.managedPlaylists);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] =
    useState<ISpotifyPlaylist | null>(null);
  const [previewTracks, setPreviewTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent;
      return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    };
    
    setIsMobile(checkIsMobile());
  }, []);

  const subscribedPlaylists = useMemo(() => {
    return new Set(
      managedPlaylists.flatMap((mp) => {
        return mp.subscriptions.map(
          (sub) => sub.sourcePlaylist.spotifyPlaylistId
        );
      })
    );
  }, [managedPlaylists]);

  const getManagedPlaylistsForSource = (sourceSpotifyPlaylistId: string) => {
    return managedPlaylists.filter((mp) => {
      return mp.subscriptions.some((sub) => {
        return sub.sourcePlaylist.spotifyPlaylistId === sourceSpotifyPlaylistId;
      });
    });
  };

  const unsubscribeFromSource = useUserStore(
    (state) => state.unsubscribeFromSource
  );

  const handleSubscribe = (playlist: ISpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setShowSubscribeModal(true);
  };

  const handleViewTracks = async (playlist: ISpotifyPlaylist) => {
    // On mobile, open Spotify app directly
    if (isMobile) {
      const spotifyUrl = `https://open.spotify.com/playlist/${playlist.id}`;
      window.open(spotifyUrl, '_blank');
      return;
    }

    // On desktop, show track modal with previews
    setSelectedPlaylistForModal(playlist);
    setPreviewTracks([]);
    setLoadingTracks(playlist.id);

    try {
      const res = await fetch(
        `/api/spotify/playlists/${playlist.id}?tracks=true`
      );
      if (!res.ok) throw new Error("Failed to fetch playlist tracks");
      const { tracks } = await res.json();
      setPreviewTracks([...tracks]);
      setTrackModalOpen(true);
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    } finally {
      setLoadingTracks(null);
    }
  };

  const handleTrackModalClose = () => {
    setTrackModalOpen(false);
    setSelectedPlaylistForModal(null);
    setPreviewTracks([]);
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="flex flex-col gap-2 pb-4">
        {playlists
          .filter((playlist) => playlist)
          .map((playlist, index) => (
            <div
              key={`simple-${playlist.id}-${index}`}
              className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-xl border border-gray-200 hover:border-[#CC5500]/30 hover:bg-orange-50/30 transition-all w-full min-w-0"
            >
              {/* Small image */}
              <img
                src={playlist.images?.[0]?.url}
                alt={playlist.name}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
              />

              {/* Content */}
              <div
                className="flex-1 min-w-0 overflow-hidden cursor-pointer"
                onClick={() => handleViewTracks(playlist)}
              >
                <h3 className="font-semibold text-gray-900 text-sm truncate hover:text-[#CC5500] transition-colors">
                  {playlist.name}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {playlist.owner.display_name}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {loadingTracks === playlist.id ? (
                    <>
                      <div className="w-3 h-3 border border-[#CC5500] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-[#CC5500]">Loading...</span>
                    </>
                  ) : (
                    <>
                      {isMobile ? (
                        <>
                          <ExternalLink size={12} className="text-[#CC5500]" />
                          <span className="text-xs text-[#CC5500]">
                            Open in Spotify
                          </span>
                        </>
                      ) : (
                        <>
                          <Music size={12} className="text-[#CC5500]" />
                          <span className="text-xs text-[#CC5500]">
                            View tracks
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Subscription badges */}
                {getManagedPlaylistsForSource(playlist.id).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getManagedPlaylistsForSource(playlist.id).map(
                      (managedPlaylist) => (
                        <div
                          key={managedPlaylist.id}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sourcePlaylistId =
                              managedPlaylist.subscriptions.find(
                                (sub) =>
                                  sub.sourcePlaylist.spotifyPlaylistId ===
                                  playlist.id
                              )?.sourcePlaylist.id;
                            if (sourcePlaylistId) {
                              unsubscribeFromSource(
                                sourcePlaylistId,
                                managedPlaylist.id
                              );
                            }
                          }}
                          title={`Click to remove from ${managedPlaylist.name}`}
                        >
                          <Bell size={8} className="group-hover:hidden" />
                          <span className="hidden group-hover:inline text-red-500 text-xs">
                            ×
                          </span>
                          <span className="font-medium truncate max-w-auto">
                            {managedPlaylist.name}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Action button */}
              <button
                onClick={() => handleSubscribe(playlist)}
                className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors ${
                  subscribedPlaylists.has(playlist.id)
                    ? "bg-orange-100 text-[#CC5500] hover:bg-orange-200"
                    : "bg-[#CC5500] text-white hover:bg-[#B04A00]"
                }`}
              >
                {subscribedPlaylists.has(playlist.id) ? (
                  <Plus size={14} />
                ) : (
                  <Bell size={14} />
                )}
              </button>
            </div>
          ))}
      </div>

      <TrackModal
        isOpen={trackModalOpen}
        onClose={handleTrackModalClose}
        playlist={selectedPlaylistForModal}
        tracks={previewTracks}
      />
    </div>
  );
};