import { Settings, X } from "lucide-react";
import React from "react";
import { ISpotifyPlaylist } from "utils/types";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const songCountOptions = [
  { value: 1, label: "1 song" },
  { value: 3, label: "3 songs" },
  { value: 5, label: "5 songs" },
  { value: 10, label: "10 songs" },
];

export const PlaylistSettingsModal = ({
  setShowPlaylistSettingsModal,
  setSelectedPlaylist,
  selectedPlaylist,
}: {
  setShowPlaylistSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  selectedPlaylist: ISpotifyPlaylist;
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative shadow-xl">
        <button
          onClick={() => {
            setShowPlaylistSettingsModal(false);
            setSelectedPlaylist(null);
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <Settings size={36} className="text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Playlist Update Settings
          </h2>
          <p className="text-gray-600">
            Configure how &quot;{selectedPlaylist.name}&quot; receives tracks
            from subscribed playlists
          </p>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-sm border border-gray-200 mb-6">
          <img
            src={selectedPlaylist.images?.[0]?.url}
            alt={selectedPlaylist.name}
            className="w-12 h-12 object-cover rounded-sm"
          />
          <div className="ml-3">
            <h3 className="font-medium text-gray-800">
              {selectedPlaylist.name}
            </h3>
            <p className="text-gray-500 text-sm">
              {selectedPlaylist.tracks.total} tracks
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            How many songs to add each time?
          </label>
          <div className="relative">
            <select
              id="settings-song-count-dropdown"
              className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none text-gray-700"
              defaultValue={3}
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
            This is the number of tracks we&apos;ll add from each subscribed
            playlist during updates.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">
            How often should we add new tracks?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {frequencyOptions.map((option) => {
              return (
                <div
                  key={option.value}
                  id={`settings-freq-${option.value}`}
                  className={`settings-frequency-option py-2 text-center rounded cursor-pointer transition-colors border ${
                    true
                      ? "bg-green-600 text-white"
                      : "bg-gray-50 text-gray-800 border-gray-200"
                  }`}
                >
                  {option.label}
                </div>
              );
            })}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            This is how often we&apos;ll update your playlist with fresh tracks.
          </p>
        </div>

        <button
          onClick={() => {
            console.log("hi");
          }}
          className="w-full py-3 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium shadow-md transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};
