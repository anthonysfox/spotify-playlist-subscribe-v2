import React, { useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { Bell, Play, Pause } from "lucide-react";
import { formatTime } from "utils";
import { PlaylistSkeleton } from "./Skeleton";

const OFFSET = 20;

export const PlaylistList = ({
  playlists,
  setIsLongPress,
  isLongPress,
  offset,
  setOffset,
  loading,
  loadedAllData,
  deviceID,
  player,
  setSelectedPlaylist,
  expandedPlaylist,
  setExpandedPlaylist,
  handleUnsubscribe,
  previewTracks,
  setPreviewTracks,
  testingRef,
  setShowSubscribeModal,
}: {
  playlists: ISpotifyPlaylist[];
  setIsLongPress: (isLongPress: boolean) => void;
  isLongPress: boolean;
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  deviceID: string;
  player: any;
  loading: boolean;
  loadedAllData: boolean;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  expandedPlaylist: string | null;
  setExpandedPlaylist: React.Dispatch<React.SetStateAction<string | null>>;
  handleUnsubscribe: (playlistID: string) => void;
  previewTracks: any;
  setPreviewTracks: React.Dispatch<React.SetStateAction<any>>;
  testingRef: React.RefObject<HTMLDivElement>;
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [previewTimeouts, setPreviewTimeouts] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});

  useEffect(() => {
    window.addEventListener("mouseup", () => setIsLongPress(false));

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

  const handleViewTracks = async (playlistID: string) => {
    if (expandedPlaylist === playlistID) {
      // If already expanded, collapse it
      setExpandedPlaylist(null);
      setPreviewTracks([]);
    } else {
      // Expand the clicked playlist and fetch tracks
      setExpandedPlaylist(playlistID);
      setPreviewTracks([]); // Clear previous tracks while loading

      try {
        const res = await fetch(`/api/spotify/playlists/${playlistID}`);
        if (!res.ok) throw new Error("Failed to fetch playlist tracks");
        const data = await res.json();
        setPreviewTracks(data);
      } catch (error) {
        console.error("Error fetching playlist tracks:", error);
        // You might want to show an error message to the user here
      }
    }
  };

  const handleTrackPreview = async (track: any) => {
    const trackId = track.id;

    // If this track is already playing, stop it
    if (currentlyPlaying === trackId) {
      await stopTrackPreview(trackId);
      return;
    }

    // Stop any currently playing track
    if (currentlyPlaying) {
      await stopTrackPreview(currentlyPlaying);
    }

    try {
      if (player) {
        // First, add the track to the queue
        const playRes = await fetch("/api/spotify/player/play", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [`spotify:track:${trackId}`],
            position_ms: 30000,
            device_id: deviceID,
          }),
        });

        if (!playRes.ok) {
          const errorData = await playRes.json();
          console.error("Failed to play track:", errorData);
          return;
        }
        setCurrentlyPlaying(trackId);

        // Set a timeout to stop the track after 30 seconds
        const timeout = setTimeout(() => {
          stopTrackPreview(trackId);
        }, 30000); // 30 seconds

        setPreviewTimeouts((prev) => ({
          ...prev,
          [trackId]: timeout,
        }));
      } else {
        console.error("WebPlayer not available");
      }
    } catch (error) {
      console.error("Error playing track preview:", error);
    }
  };

  const stopTrackPreview = async (trackId: string) => {
    try {
      console.log("Stopping track preview");

      if (player) {
        await player.pause();
        console.log("Track preview paused via WebPlayer");
      }
    } catch (error) {
      console.error("Error stopping track preview:", error);
    } finally {
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
    }
  };

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden min-h-0 flex-1 custom-scrollbar scrollbar-visible pl-3 pr-3 inset-shadow-sm rounded-lg"
      ref={testingRef}
    >
      <div className="flex flex-col gap-4 pb-4 mt-3 pr-2">
        {loading && playlists.length === 0 && <PlaylistSkeleton />}
        {!loading && playlists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No playlists found</p>
          </div>
        )}
        {playlists.length > 0 &&
          playlists
            .filter((playlist) => playlist)
            .map((playlist, index) => (
              <div
                key={`${playlist.id}-${index}`}
                className="bg-white rounded-lg overflow-hidden hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row">
                  <img
                    src={playlist.images?.[0]?.url}
                    alt={playlist.name}
                    className="w-full h-32 sm:w-20 sm:h-20 object-cover"
                  />
                  <div className="flex flex-col sm:flex-row grow">
                    <div
                      className="p-3 sm:p-4 grow cursor-pointer min-w-0"
                      onClick={() => handleViewTracks(playlist.id)}
                    >
                      <h3 className="font-medium text-gray-800 text-base sm:text-lg truncate">
                        {playlist.name}
                      </h3>
                      <p className="text-gray-500 text-sm mt-1">
                        By {playlist.owner.display_name}
                      </p>
                      <p className="text-green-600 text-xs mt-2 font-medium">
                        Click to
                        {expandedPlaylist === playlist.id ? " hide " : " view "}
                        tracks
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 self-center shrink-0">
                      {playlist.subscribed ? (
                        <button
                          onClick={() => setSelectedPlaylist({ ...playlist })}
                          className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-full bg-gray-100 text-red-500 text-sm hover:bg-gray-200 transition-colors shadow-xs border border-gray-200"
                        >
                          Unsubscribe
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowSubscribeModal(true);
                            setSelectedPlaylist({ ...playlist });
                          }}
                          className="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-full bg-green-600 text-white text-sm hover:bg-green-700 transition-colors shadow-xs flex items-center justify-center"
                        >
                          <Bell size={16} className="mr-1" />
                          Subscribe
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {expandedPlaylist === playlist.id ? (
                  <div className="border-t border-gray-200 p-2">
                    <div className="px-2">
                      <div className="flex justify-between text-xs text-gray-500 py-2 px-2 border-b border-gray-200">
                        <span className="w-6">#</span>
                        <span className="grow">TITLE</span>
                        <span className="hidden sm:block">DURATION</span>
                      </div>
                      {previewTracks.map(
                        ({ track }: { track: any }, index: number) => (
                          <div
                            key={track.id}
                            className="flex justify-between items-center py-2 px-2 text-sm hover:bg-gray-100 rounded-sm cursor-pointer"
                            onClick={() => handleTrackPreview(track)}
                          >
                            <div className="flex items-center grow min-w-0">
                              <button
                                className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center mr-2 sm:mr-3 transition-colors shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTrackPreview(track);
                                }}
                              >
                                {currentlyPlaying === track.id ? (
                                  <Pause size={12} className="text-white" />
                                ) : (
                                  <Play
                                    size={12}
                                    className="text-white ml-0.5"
                                  />
                                )}
                              </button>
                              <span className="w-6 text-gray-500 text-xs sm:text-sm shrink-0">
                                {index + 1}
                              </span>
                              <div className="grow ml-2 min-w-0">
                                <p className="text-gray-800 font-medium text-sm sm:text-base truncate">
                                  {track.name}
                                </p>
                                <p className="text-gray-500 text-xs truncate">
                                  {track.artists?.[0]?.name || "Unknown Artist"}
                                </p>
                              </div>
                            </div>
                            <span className="text-gray-500 text-xs sm:text-sm shrink-0 ml-2">
                              {formatTime(track.duration_ms)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
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
        {/* End of results indicator */}
        {loadedAllData && playlists.length > 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm">No more playlists to load</p>
          </div>
        )}
      </div>
    </div>
  );
};
