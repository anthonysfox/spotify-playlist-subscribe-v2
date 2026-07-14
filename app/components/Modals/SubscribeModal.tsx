import { Bell, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PlaylistSummary, MusicProvider } from "@/lib/music/types";
import type { SelectablePlaylist } from "../Dashboard";
import { useUserStore } from "../../../store/useUserStore";
import { OFFSET } from "utils/constants";
import toast from "react-hot-toast";

// Provider-generic: the user's own playlists on whichever service they picked.
const userPlaylistsEndpoint = "/api/music/user-playlists";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export interface SubscribeReqBody {
  /** Which service both playlists live on. Defaults to Spotify server-side. */
  provider?: MusicProvider;
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
  // Advanced settings properties
  syncQuantityPerSource?: number;
  syncMode?: string;
  explicitContentFilter?: boolean;
  trackAgeLimit?: number;
  vibePrompt?: string;
  customDays?: string[];
}

export const SubscribeModal = ({
  setShowSubscribeModal,
  setSelectedPlaylist,
  selectedPlaylist,
  setShowPlaylistSettingsModal,
  subscribeModalFormData,
  setSubscribeModalFormData,
}: {
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  // Shares Dashboard's selectedPlaylist state, which can also hold a managed
  // playlist. This modal only ever reads a browsable one (Dashboard narrows with
  // isPlaylistSummary before rendering it), but the setter is the shared one, so
  // it has to accept the union.
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<SelectablePlaylist | null>
  >;
  setSubscribeModalFormData: React.Dispatch<
    React.SetStateAction<SubscribeReqBody | null>
  >;
  subscribeModalFormData: SubscribeReqBody | null;
  selectedPlaylist: PlaylistSummary | null;
  setShowPlaylistSettingsModal?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  // A subscription can't span services — the sync engine skips cross-provider
  // sources, since matching tracks across catalogues would need ISRC lookup. So
  // the destination is always on whichever service the source came from, and the
  // source playlist already tells us which that is.
  const provider: MusicProvider = selectedPlaylist?.provider ?? "SPOTIFY";

  const [selectedFrequency, setSelectedFrequency] = useState(
    subscribeModalFormData?.syncFrequency || "WEEKLY"
  );
  const [selectedUserPlaylist, setSelectedUserPlaylist] =
    useState<PlaylistSummary | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState<string>(
    subscribeModalFormData?.newPlaylistName || ""
  );
  const [runImmediateSync, setRunImmediateSync] = useState<boolean>(
    subscribeModalFormData?.runImmediateSync ?? true
  );
  console.log(subscribeModalFormData);

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
        (mp) => mp.externalPlaylistId === selectedUserPlaylist.id
      )
    : null;

  const fetchUserPlaylists = useCallback(async () => {
    if (isLoading || loadedAllPlaylists) return;
    setIsLoading(true);

    try {
      const res = await fetch(
        `${userPlaylistsEndpoint}?provider=${provider}&offset=${offset}`,
      );

      const { playlists: data } = (await res.json()) as {
        playlists: PlaylistSummary[];
      };

      // No client-side owner filter any more: /api/music/user-playlists already
      // returns only playlists the user can actually write to. Doing it here was
      // only possible for Spotify anyway, since it needed a Spotify user ID.
      setUserPlaylists(data);
      setLoadedAllPlaylists(data.length < OFFSET);
      setOffset(offset + OFFSET);
    } catch (err) {
      console.error("Failed user playlist fetch:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, offset, loadedAllPlaylists, provider]);

  // Fetch user playlists with pagination
  useEffect(() => {
    if (userData && userPlaylists.length === 0) {
      fetchUserPlaylists();
    }
  }, [userData, userPlaylists, fetchUserPlaylists]);

  useEffect(() => {
    if (subscribeModalFormData) {
      if (subscribeModalFormData?.managedPlaylist?.id) {
        const playlist = userPlaylists.find(
          (userPlaylist) =>
            userPlaylist.id === subscribeModalFormData.managedPlaylist?.id
        );
        setSelectedUserPlaylist(playlist || null);
      }
    }
  }, [subscribeModalFormData, userPlaylists]);

  const saveSubscriptionSettings = async () => {
    const body: SubscribeReqBody = {
      // Start with any existing advanced settings from subscribeModalFormData
      ...subscribeModalFormData,
      // Which service both playlists live on. The server needs this to pick the
      // right client, and to store it on the playlist records.
      provider,
      // Override with current form state (this takes precedence)
      sourcePlaylist: {
        id: selectedPlaylist?.id || "",
        name: selectedPlaylist?.name || "",
        imageUrl: selectedPlaylist?.imageUrl || "",
        trackCount: selectedPlaylist?.trackCount || 0,
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
        imageUrl: selectedUserPlaylist?.imageUrl || "",
        trackCount: selectedUserPlaylist?.trackCount || 0,
      };
    }

    const res = await fetch("/api/music/subscribe", {
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
            setSubscribeModalFormData(null);
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <Bell size={36} className="text-[#CC5500] mx-auto mb-4" />
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
                className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#CC5500] focus:border-[#CC5500] appearance-none text-gray-700"
                value={selectedUserPlaylist?.id || ""}
                ref={selectRef}
              >
                <option value="">Select a playlist...</option>
                {userPlaylists.map((playlist) => {
                  const isManaged = managedPlaylists.find(
                    (mp) => mp.externalPlaylistId === playlist.id
                  );
                  return (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                      {/* Apple doesn't report a track count for library
                          playlists, so only show one when we have it. */}
                      {playlist.trackCount > 0
                        ? ` (${playlist.trackCount} tracks)`
                        : ""}
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
              className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#CC5500] focus:border-[#CC5500] appearance-none text-gray-700"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              disabled={!!selectedUserPlaylist}
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
                        )}
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
                    ? "bg-[#CC5500] text-white"
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
              className="text-[#CC5500] focus:ring-[#CC5500] rounded"
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
            className="w-full py-3 rounded-full bg-[#CC5500] hover:bg-[#B04A00] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium shadow-md transition-colors"
          >
            Subscribe
          </button>

          <button
            onClick={() => {
              if (setShowPlaylistSettingsModal) {
                const body: SubscribeReqBody = {
                  sourcePlaylist: {
                    id: selectedPlaylist?.id || "",
                    name: selectedPlaylist?.name || "",
                    imageUrl: selectedPlaylist?.imageUrl || "",
                    trackCount: selectedPlaylist?.trackCount || 0,
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
                    imageUrl: selectedUserPlaylist?.imageUrl || "",
                    trackCount: selectedUserPlaylist?.trackCount || 0,
                  };
                }
                // Create a temporary playlist object with default settings for the modal
                setSubscribeModalFormData({
                  ...body,
                });
                setShowPlaylistSettingsModal(true);
                setShowSubscribeModal(false);
              }
            }}
            className="w-full py-2 text-[#CC5500] hover:text-[#B04A00] text-sm underline bg-transparent"
          >
            Advanced Settings
          </button>
        </div>
      </div>
    </div>
  );
};
