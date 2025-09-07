import { Bell, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist, IUserPlaylistsState } from "utils/types";
import { useUserStore } from "../../../store/useUserStore";
import { OFFSET } from "utils/constants";
import toast from "react-hot-toast";

const userPlaylistsEndpoint = "/api/spotify/user/playlists";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

interface SubscribeReqBody {
  sourcePlaylist: {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
  };
  managedPlaylist?: {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
  };
  newPlaylistName?: string;
  syncFrequency: string;
  runImmediateSync: boolean;
}

export const SubscribeModal = ({
  setShowSubscribeModal,
  setSelectedPlaylist,
  selectedPlaylist,
  setShowPlaylistSettingsModal,
}: {
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  selectedPlaylist: ISpotifyPlaylist | null;
  setShowPlaylistSettingsModal?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState("WEEKLY");
  const [selectedUserPlaylist, setSelectedUserPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");
  const [runImmediateSync, setRunImmediateSync] = useState(true);
  const selectRef = useRef<HTMLSelectElement>(null);

  const userPlaylists = useUserStore((state) => state.userPlaylists);
  const isLoading = useUserStore((state) => state.isLoading);
  const userData = useUserStore((state) => state.user);
  const offset = useUserStore((state) => state.offset);
  const loadedAllPlaylists = useUserStore((state) => state.loadedAllPlaylists);
  const managedPlaylists = useUserStore((state) => state.managedPlaylists);
  const setIsLoading = useUserStore((state) => state.setLoading);
  const setOffset = useUserStore((state) => state.setOffset);
  const setUserPlaylists = useUserStore((state) => state.setUserPlaylists);
  const setLoadedAllPlaylists = useUserStore(
    (state) => state.setLoadedAllPlaylists
  );
  const addManagedPlaylist = useUserStore((state) => state.addManagedPlaylist);

  // Find existing managed playlist for selected user playlist
  const existingManagedPlaylist = selectedUserPlaylist
    ? managedPlaylists.find(
        (mp) => mp.spotifyPlaylistId === selectedUserPlaylist.id
      )
    : null;

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

  const saveSubscriptionSettings = async () => {
    const body: SubscribeReqBody = {
      sourcePlaylist: {
        id: selectedPlaylist?.id || "",
        name: selectedPlaylist?.name || "",
        imageUrl: selectedPlaylist?.images?.[0]?.url || "",
        trackCount: selectedPlaylist?.tracks.total || 0,
      },
      syncFrequency: selectedFrequency,
      runImmediateSync,
    };

    if (newPlaylistName) {
      body.newPlaylistName = newPlaylistName;
    } else {
      body.managedPlaylist = {
        id: selectedUserPlaylist?.id || "",
        name: selectedUserPlaylist?.name || "",
        imageUrl: selectedUserPlaylist?.images?.[0]?.url || "",
        trackCount: selectedUserPlaylist?.tracks?.total || 0,
      };
    }

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
        const {
          data: { managedPlaylist },
          success,
          message,
        } = await res.json();

        if (success) {
          addManagedPlaylist(managedPlaylist);
          setShowSubscribeModal(false);
          setSelectedPlaylist(null);
          toast.success(message);
        } else {
          toast.error(message);
        }
      })
      .catch((err) => {
        console.error("Error subscribing:", err);
        toast.error("Failed to subscribe");
      });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
          <div>
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
                {userPlaylists.map((playlist) => {
                  const isManaged = managedPlaylists.find(
                    (mp) => mp.spotifyPlaylistId === playlist.id
                  );
                  return (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name} ({playlist.tracks.total} tracks)
                      {isManaged ? " • Already managed" : ""}
                    </option>
                  );
                })}
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
          </div>
          <div className="flex justify-center m-2">- or -</div>
          <div>
            <label className="block text-gray-700 mb-2 font-medium">
              Create a new playlist to add tracks to:
            </label>
            <input
              type="text"
              id="first_name"
              className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none text-gray-700"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
            />
          </div>
        </div>

        {/* Show existing playlist settings if managed playlist exists */}
        {existingManagedPlaylist && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Playlist Already Managed
                </h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    <strong>Current sync frequency:</strong>{" "}
                    {existingManagedPlaylist.syncInterval.charAt(0) +
                      existingManagedPlaylist.syncInterval
                        .slice(1)
                        .toLowerCase()}
                  </p>
                  <p>
                    <strong>Songs per sync:</strong>{" "}
                    {existingManagedPlaylist.syncQuantityPerSource} per source
                  </p>
                  <p>
                    <strong>Active subscriptions:</strong>{" "}
                    {existingManagedPlaylist.subscriptions?.length || 0}
                  </p>
                  {existingManagedPlaylist.syncInterval === "CUSTOM" &&
                    existingManagedPlaylist.customDays && (
                      <p>
                        <strong>Custom schedule:</strong>{" "}
                        {JSON.parse(existingManagedPlaylist.customDays).join(
                          ", "
                        )}{" "}
                        at {existingManagedPlaylist.customTime}
                      </p>
                    )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  This will add a new subscription to your existing managed
                  playlist with these settings.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            {existingManagedPlaylist
              ? "Sync frequency (will use existing settings)"
              : "How often should we add new tracks?"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {frequencyOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  if (!existingManagedPlaylist) {
                    setSelectedFrequency(option.value);
                  }
                }}
                id={`freq-${option.value}`}
                className={`frequency-option py-2 text-center rounded transition-colors border ${
                  existingManagedPlaylist
                    ? option.value === existingManagedPlaylist.syncInterval
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : option.value === selectedFrequency
                    ? "bg-green-600 text-white"
                    : "bg-gray-50 text-gray-800 border-gray-200 cursor-pointer"
                }`}
              >
                {option.label}
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            {existingManagedPlaylist
              ? "This subscription will use the existing playlist's sync settings."
              : "We'll add tracks from this playlist to your selected playlist at this frequency."}
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={runImmediateSync}
              onChange={(e) => setRunImmediateSync(e.target.checked)}
              className="text-green-600 focus:ring-green-500 rounded"
            />
            <div>
              <div className="font-medium text-gray-700">
                Sync immediately after subscribing
              </div>
              <div className="text-xs text-gray-500">
                Add songs right away instead of waiting for the next scheduled
                sync
              </div>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <button
            id="save-button"
            onClick={() => {
              saveSubscriptionSettings();
            }}
            disabled={!selectedUserPlaylist && !newPlaylistName}
            className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium shadow-md transition-colors"
          >
            Subscribe
          </button>

          <button
            onClick={() => {
              if (setShowPlaylistSettingsModal) {
                // Create a temporary playlist object with default settings for the modal
                setSelectedPlaylist({
                  id: "temp-id",
                  name:
                    newPlaylistName || selectedPlaylist?.name || "New Playlist",
                  imageUrl: selectedPlaylist?.images?.[0]?.url || null,
                  trackCount: selectedPlaylist?.tracks?.total || 0,
                  syncInterval: selectedFrequency,
                  syncQuantityPerSource: 5,
                  syncMode: "APPEND",
                  explicitContentFilter: false,
                  trackAgeLimit: 0,
                  customDays: ["monday"],
                  customTime: "09:00",
                });
                setShowPlaylistSettingsModal(true);
              }
            }}
            className="w-full py-2 text-green-600 hover:text-green-700 text-sm underline bg-transparent"
          >
            Advanced Settings
          </button>
        </div>
      </div>
    </div>
  );
};
