import React, { useEffect, useRef, useState, useMemo } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { Bell, Music } from "lucide-react";
import { PlaylistSkeleton } from "../Skeletons/PlaylistSkeleton";
import { TrackModal } from "../Modals/TrackModal";
import { playTrackPreview, stopPlayback } from "utils/spotifyPlayerUtils";
import { useUserStore } from "store/useUserStore";
import toast from "react-hot-toast";

const OFFSET = 20;

export const PlaylistList = ({
  playlists,
  loading,
  loadedAllData,
  deviceID,
  player,
  setSelectedPlaylist,
  previewTracks,
  setPreviewTracks,
  testingRef,
  setShowSubscribeModal,
  sentinelRef,
  transferPlayback,
}: {
  playlists: ISpotifyPlaylist[];
  deviceID: string;
  player: any;
  loading: boolean;
  loadedAllData: boolean;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  previewTracks: any;
  setPreviewTracks: React.Dispatch<React.SetStateAction<any>>;
  testingRef: React.RefObject<HTMLDivElement>;
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  sentinelRef?: React.RefObject<HTMLDivElement>;
  transferPlayback: () => Promise<void>;
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [previewTimeouts, setPreviewTimeouts] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [selectedPlaylistForModal, setSelectedPlaylistForModal] =
    useState<ISpotifyPlaylist | null>(null);
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);
  const managedPlaylists = useUserStore((state) => state.managedPlaylists);
  const unsubscribeFromSource = useUserStore(
    (state) => state.unsubscribeFromSource
  );

  const subscribedPlaylists = useMemo(() => {
    return new Set(
      managedPlaylists.flatMap((mp) => {
        return mp.subscriptions.map(
          (sub) => sub.sourcePlaylist.spotifyPlaylistId
        );
      })
    );
  }, [managedPlaylists]);

  useEffect(() => {
    // Update container height on resize
    const updateHeight = () => {
      if (testingRef.current) {
        const rect = testingRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(previewTimeouts).forEach((timeout) =>
        clearTimeout(timeout)
      );
    };
  }, [previewTimeouts]);

  const handleViewTracks = async (playlist: ISpotifyPlaylist) => {
    setSelectedPlaylistForModal(playlist);
    setPreviewTracks([]); // Clear previous tracks while loading
    setLoadingTracks(playlist.id); // Set loading state for this specific playlist

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
      // You might want to show an error message to the user here
    } finally {
      setLoadingTracks(null); // Clear loading state
    }
  };

  const handleTrackPreview = async (track: any) => {
    const trackId = track.id;

    // If this track is already playing, stop it
    if (currentlyPlaying === trackId) {
      await stopPlayback();
      setCurrentlyPlaying(null);
      return;
    }

    // Stop any currently playing track
    if (currentlyPlaying) {
      await stopPlayback();
    }

    try {
      setCurrentlyPlaying(trackId);
      await playTrackPreview(trackId, transferPlayback);

      // Set a timeout to clear the playing state after 30 seconds
      const timeout = setTimeout(() => {
        setCurrentlyPlaying(null);
      }, 30000);

      setPreviewTimeouts((prev) => ({
        ...prev,
        [trackId]: timeout,
      }));
    } catch (error) {
      console.error("Error playing track preview:", error);
      setCurrentlyPlaying(null);
    }
  };

  const stopTrackPreview = async (trackId: string) => {
    await stopPlayback();
    setCurrentlyPlaying(null);

    // Clear the timeout
    if (previewTimeouts[trackId]) {
      clearTimeout(previewTimeouts[trackId]);
      setPreviewTimeouts((prev) => {
        const newTimeouts = { ...prev };
        delete newTimeouts[trackId];
        return newTimeouts;
      });
    }
  };

  const handleTrackModalClose = () => {
    setTrackModalOpen(false);
    setSelectedPlaylistForModal(null);
    setPreviewTracks([]);
    setCurrentlyPlaying(null);
    if (currentlyPlaying) stopTrackPreview(currentlyPlaying);
  };

  const getManagedPlaylistsForSource = (sourceSpotifyPlaylistId: string) => {
    return managedPlaylists.filter((mp) => {
      return mp.subscriptions.some((sub) => {
        return sub.sourcePlaylist.spotifyPlaylistId === sourceSpotifyPlaylistId;
      });
    });
  };

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden min-h-0 flex-1 custom-scrollbar scrollbar-visible pl-3 pr-3 inset-shadow-sm rounded-lg"
      ref={testingRef}
    >
      <div className="flex flex-col gap-3 pb-4 mt-3 pr-2">
        {loading && !playlists.length && <PlaylistSkeleton />}
        {!loading && !playlists.length && (
          <div className="text-center py-12">
            <p className="text-gray-500">No playlists found</p>
          </div>
        )}
        {playlists.length > 0 &&
          playlists
            .filter((playlist) => playlist)
            .map((playlist, index) => (
              <div
                key={`playlist-${playlist.id}-${index}`}
                className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 shadow-lg border border-gray-200 group"
                onClick={() => {
                  if (loadingTracks !== playlist.id) {
                    handleViewTracks(playlist);
                  }
                }}
              >
                <div className="flex flex-col sm:flex-row">
                  <div className="relative overflow-hidden">
                    <img
                      src={playlist.images?.[0]?.url}
                      alt={playlist.name}
                      className="w-full h-24 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent sm:hidden"></div>
                  </div>
                  <div className="flex flex-col sm:flex-row grow p-3 sm:pt-1 sm:pb-1 sm:pl-3 sm:pr-0">
                    <div
                      className={`grow min-w-0 flex flex-col justify-between space-y-2 sm:space-y-1 sm:pt-1 sm:pb-1 ${
                        loadingTracks === playlist.id
                          ? "cursor-not-allowed opacity-75"
                          : "cursor-pointer"
                      }`}
                    >
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate group-hover:text-[#CC5500] transition-colors">
                        {playlist.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        By{" "}
                        <span className="font-medium">
                          {playlist.owner.display_name}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        {loadingTracks === playlist.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#CC5500] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#CC5500] text-sm font-medium">
                              Loading tracks...
                            </p>
                          </>
                        ) : (
                          <>
                            <Music size={16} className="text-[#CC5500]" />
                            <p className="text-[#CC5500] text-sm font-medium">
                              View tracks
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {getManagedPlaylistsForSource(playlist.id).map(
                          (managedPlaylist) => (
                            <div
                              key={managedPlaylist.id}
                              className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full border border-orange-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 cursor-pointer group"
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
                              <Bell size={10} className="group-hover:hidden" />
                              <span className="hidden group-hover:inline text-red-500">
                                ×
                              </span>
                              <span className="font-medium truncate max-w-20">
                                {managedPlaylist.name}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div className="self-center sm:self-center shrink-0 sm:pr-3 mt-1 sm:mt-0">
                      {subscribedPlaylists.has(playlist.id) ? (
                        <button
                          onClick={() => {
                            setShowSubscribeModal(true);
                            setSelectedPlaylist({ ...playlist });
                          }}
                          className="w-full sm:w-auto px-3 py-2 sm:py-1.5 rounded-lg bg-orange-50 text-[#CC5500] text-sm font-medium hover:bg-orange-100 transition-all duration-200 border border-orange-200 flex items-center justify-center gap-1.5"
                        >
                          <Bell size={12} />
                          Add More
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowSubscribeModal(true);
                            setSelectedPlaylist({ ...playlist });
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-gradient-to-r from-[#CC5500] to-[#A0522D] text-white text-sm font-semibold hover:from-[#B04A00] hover:to-[#8B4513] transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center group"
                        >
                          <Bell
                            size={14}
                            className="mr-1.5 group-hover:animate-pulse"
                          />
                          Subscribe
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        {/* Loading indicator at bottom */}
        {loading && playlists.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="animate-pulse flex space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Intersection Observer Sentinel */}
        {sentinelRef && !loadedAllData && (
          <div
            ref={sentinelRef}
            className="h-10 flex items-center justify-center"
          >
            {/* This invisible element triggers loading more content */}
          </div>
        )}
        {/* End of results indicator */}
        {loadedAllData && playlists.length > 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No more playlists to load</p>
          </div>
        )}
      </div>

      <TrackModal
        isOpen={trackModalOpen}
        onClose={handleTrackModalClose}
        playlist={selectedPlaylistForModal}
        tracks={previewTracks}
        currentlyPlaying={currentlyPlaying}
        onTrackPreview={handleTrackPreview}
      />
    </div>
  );
};