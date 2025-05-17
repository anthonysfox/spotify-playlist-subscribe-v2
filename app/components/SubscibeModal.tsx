import { Bell, X } from "lucide-react";
import React, { useState } from "react";
import { ISpotifyPlaylist } from "utils/types";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export const SubscibeModal = ({
  setShowSubscribeModal,
  setSelectedPlaylist,
  selectedPlaylist,
  userPlaylists,
}: {
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  selectedPlaylist: ISpotifyPlaylist | null;
  userPlaylists: ISpotifyPlaylist[];
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState("WEEKLY");
  const [addSongsToPlaylist, setAddSongsToPlaylist] = useState("");

  const saveSubscriptionSettings = async () => {
    const res = await fetch("/api/spotify/playlists/subscribe", {
      method: "POST",
      body: JSON.stringify({
        userPlaylistID: addSongsToPlaylist,
        spotifyPlaylistID: selectedPlaylist?.id,
        frequency: selectedFrequency,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).then(async (res) => {
      const data = await res.json();
      console.log(data);
      setShowSubscribeModal(false);
      setSelectedPlaylist(null);
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
                setAddSongsToPlaylist(e.target.value);
              }}
              className="w-full p-3 bg-white rounded border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none text-gray-700"
              defaultValue=""
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
              <div className="flex items-center p-3 bg-gray-50 rounded border border-gray-200">
                <img
                  src={userPlaylists[0].imageUrl}
                  alt={userPlaylists[0].name}
                  className="w-12 h-12 object-cover rounded"
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

        <div className="mb-6">
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
        </div>

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
