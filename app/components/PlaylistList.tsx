import React, { useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { Bell } from "lucide-react";
import { formatTime } from "utils";

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
  handleSubscribe,
  handleUnsubscribe,
  previewTracks,
  setPreviewTracks,
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
  handleSubscribe: (playlistID: string) => void;
  handleUnsubscribe: (playlistID: string) => void;
  previewTracks: any;
  setPreviewTracks: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = (playlist: ISpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    // timerRef.current = setTimeout(() => {
    setIsLongPress(true);
    // }, 500); // Adjust the delay as needed
  };

  const handleMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isLongPress) {
      //  Handle short press
    } else {
      setSelectedPlaylist(null);
    }

    setIsLongPress(false);
  };

  useEffect(() => {
    window.addEventListener("mouseup", () => setIsLongPress(false));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const { scrollTop, scrollHeight, clientHeight } = ref.current;
        if (
          scrollHeight - scrollTop <= clientHeight + 100 &&
          !loading &&
          !loadedAllData
        ) {
          console.log("here");
          // Reached bottom, load more
          setOffset((prev) => prev + OFFSET);
        }
      }
    };

    if (ref.current) {
      ref.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [loading, loadedAllData]);

  const handlePlaylistClick = (playlistID: string) => {
    setExpandedPlaylist(expandedPlaylist === playlistID ? null : playlistID);
    setPreviewTracks([]);
  };
  return (
    <>
      <div className="flex-grow overflow-auto">
        {loading ? (
          <div className="flex justify-center my-12">
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
        ) : (
          <div className="flex flex-col gap-4 pb-4" ref={ref}>
            {playlists
              .filter((playlist) => playlist)
              .map((playlist, index) => (
                <>
                  <div
                    key={playlist.id}
                    className="bg-white rounded-lg overflow-hidden hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
                  >
                    <div className="flex">
                      <img
                        src={playlist.images?.[0]?.url}
                        alt={playlist.name}
                        className="w-20 h-20 object-cover"
                      />
                      <div
                        className="p-4 flex-grow cursor-pointer"
                        onClick={() => handlePlaylistClick(playlist.id)}
                      >
                        <h3 className="font-medium text-gray-800">
                          {playlist.name}
                        </h3>
                        <p className="text-gray-500 text-sm">
                          By {playlist.owner.display_name}
                        </p>
                        <p className="text-green-600 text-xs mt-1 font-medium">
                          Click to
                          {expandedPlaylist === playlist.id
                            ? " hide "
                            : " view "}
                          tracks
                        </p>
                      </div>
                      <div className="p-4 self-center">
                        {playlist.subscribed ? (
                          <button
                            onClick={() => handleUnsubscribe(playlist.id)}
                            className="px-4 py-2 rounded-full bg-gray-100 text-red-500 text-sm hover:bg-gray-200 transition-colors shadow-sm border border-gray-200"
                          >
                            Unsubscribe
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSubscribe(playlist.id)}
                            className="px-4 py-2 rounded-full bg-green-600 text-white text-sm hover:bg-green-700 transition-colors shadow-sm flex items-center"
                          >
                            <Bell size={16} className="mr-1" />
                            Subscribe
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedPlaylist === playlist.id && (
                    <div className="border-t border-gray-200 p-2">
                      <div className="px-2">
                        <div className="flex justify-between text-xs text-gray-500 py-2 px-2 border-b border-gray-200">
                          <span className="w-6">#</span>
                          <span className="flex-grow">TITLE</span>
                          <span>DURATION</span>
                        </div>
                        {previewTracks.map(({ track }, index) => (
                          <div
                            key={track.id}
                            className="flex justify-between items-center py-2 px-2 text-sm hover:bg-gray-100 rounded"
                          >
                            <span className="w-6 text-gray-500">
                              {index + 1}
                            </span>
                            <div className="flex-grow">
                              <p className="text-gray-800">{track.name}</p>
                              <p className="text-gray-500 text-xs">
                                {track.artist}
                              </p>
                            </div>
                            <span className="text-gray-500">
                              {formatTime(track.duration_ms)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ))}
          </div>
        )}
      </div>
    </>
  );
};
