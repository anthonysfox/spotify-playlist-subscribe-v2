import { Bell, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist, IUserPlaylistsState } from "utils/types";
import { useUserStore } from "../../../store/useUserStore";
import { OFFSET } from "utils/constants";
import toast from "react-hot-toast";

const userPlaylistsEndpoint = "/api/spotify/user/playlists";

export const SubscribeModal = ({
  setShowSubscribeModal,
  setSelectedPlaylist,
  selectedPlaylist,
}: {
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  selectedPlaylist: ISpotifyPlaylist | null;
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState("WEEKLY");
  const [selectedUserPlaylist, setSelectedUserPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [songCount, setSongCount] = useState(5);
  const selectRef = useRef<HTMLSelectElement>(null);

  const userPlaylists = useUserStore((state) => state.userPlaylists);
  const isLoading = useUserStore((state) => state.isLoading);
  const userData = useUserStore((state) => state.user);
  const offset = useUserStore((state) => state.offset);
  const loadedAllPlaylists = useUserStore((state) => state.loadedAllPlaylists);
  const setIsLoading = useUserStore((state) => state.setLoading);
  const setOffset = useUserStore((state) => state.setOffset);
  const setUserPlaylists = useUserStore((state) => state.setUserPlaylists);
  const setLoadedAllPlaylists = useUserStore(
    (state) => state.setLoadedAllPlaylists
  );

  const fetchUserPlaylists = useCallback(async () => {
    if (isLoading || loadedAllPlaylists) return;
    setIsLoading(true);

    try {
      const res = await fetch(`${userPlaylistsEndpoint}?offset=${offset}`);
      const data: ISpotifyPlaylist[] = await res.json();

      const filteredPlaylists = data.filter(
        (playlist) =>
          playlist.owner.id === userData?.externalAccounts[0].externalId
      );
      setUserPlaylists(filteredPlaylists);
      setLoadedAllPlaylists(data.length < OFFSET);
      setOffset(offset + OFFSET);
    } catch (err) {
      console.error("Failed user playlist fetch:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, offset, loadedAllPlaylists, userData]);

  // Fetch user playlists with pagination
  useEffect(() => {
    if (userData && userPlaylists.length === 0) {
      fetchUserPlaylists();
    }
  }, [userData, userPlaylists, fetchUserPlaylists]);

  console.log(selectedUserPlaylist);
  const saveSubscriptionSettings = async () => {
    const body = {
      destinationPlaylist: {
        id: selectedUserPlaylist?.id,
        name: selectedUserPlaylist?.name,
        imageUrl: selectedUserPlaylist?.images?.[0]?.url || "",
        trackCount: selectedUserPlaylist?.tracks?.total || 0,
      },
      sourcePlaylist: {
        id: selectedPlaylist?.id,
        name: selectedPlaylist?.name || "",
        imageUrl: selectedPlaylist?.images?.[0]?.url || "",
      },
    };
    const res = await fetch("/api/spotify/playlists/subscribe", {
      method: "POST",
      body: JSON.stringify({
        ...body,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(async (res) => {
        const data = await res.json();
        setShowSubscribeModal(false);
        setSelectedPlaylist(null);
        toast.success("Subscribed successfully");
      })
      .catch((err) => {
        console.error("Error subscribing:", err);
        toast.error("Failed to subscribe");
      });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl">
        <button
          onClick={() => {
            setShowSubscribeModal(false);
            setSelectedPlaylist(null);
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <Bell size={36} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Subscription Settings
          </h2>
          <p className="text-gray-600">
            You&apos;re subscribing to &ldquo;{selectedPlaylist?.name || ""}
            &ldquo;
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            Choose which playlist to add tracks to:
          </label>
          <div className="relative">
            <select
              id="playlist-dropdown"
              onChange={(e) => {
                setSelectedUserPlaylist(
                  userPlaylists.find(
                    (playlist) => playlist.id === e.target.value
                  ) || null
                );
              }}
              className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none text-gray-700"
              defaultValue=""
              ref={selectRef}
            >
              <option value="" disabled>
                Select a playlist
              </option>
              {userPlaylists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.tracks.total} tracks)
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Preview of selected playlist */}
          {/* <div id="selected-playlist-preview" className="mt-3">
            {userPlaylists.length > 0 && (
              <div className="flex items-center p-3 bg-gray-50 rounded-sm border border-gray-200">
                <img
                  src={userPlaylists[0].imageUrl}
                  alt={userPlaylists[0].name}
                  className="w-12 h-12 object-cover rounded-sm"
                />
                <div className="ml-3">
                  <h3 className="font-medium text-gray-800">
                    {userPlaylists[0].name}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {userPlaylists[0].tracks} tracks
                  </p>
                </div>
              </div>
            )}
          </div> */}
        </div>

        {/* <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            How many songs to add each time?
          </label>
          <div className="relative">
            <select
              id="song-count-dropdown"
              onChange={(e) => setSongCount(parseInt(e.target.value))}
              className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none text-gray-700"
              defaultValue="5"
              value={songCount}
            >
              {songCountOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            This is the number of tracks we'll add from this playlist each time.
          </p>
        </div> */}

        {/* <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            How often should we add new tracks?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {frequencyOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  setSelectedFrequency(option.value);
                }}
                id={`freq-${option.value}`}
                className={`frequency-option py-2 text-center rounded cursor-pointer transition-colors border ${
                  option.value === selectedFrequency
                    ? "bg-green-600 text-white"
                    : "bg-gray-50 text-gray-800 border-gray-200"
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            We&apos;ll add a few tracks from this playlist to your selected
            playlist at this frequency.
          </p>
        </div> */}

        <button
          id="save-button"
          data-destination=""
          data-frequency="weekly"
          onClick={(e) => {
            saveSubscriptionSettings();
          }}
          className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-md transition-colors"
        >
          Save Subscription
        </button>
      </div>
    </div>
  );
};
