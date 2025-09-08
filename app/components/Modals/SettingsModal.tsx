import { Settings, X } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useUserStore } from "store/useUserStore";
import { ISpotifyPlaylist } from "utils/types";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom schedule" },
];

const songCountOptions = [
  { value: 1, label: "1 song" },
  { value: 3, label: "3 songs" },
  { value: 5, label: "5 songs" },
  { value: 10, label: "10 songs" },
  { value: 20, label: "20 songs" },
];

const syncModeOptions = [
  {
    value: "APPEND",
    label: "Add new songs",
    description: "Keep existing songs and add new ones",
  },
  {
    value: "REPLACE",
    label: "Replace all songs",
    description: "Clear playlist and add fresh songs",
  },
];

const trackAgeLimitOptions = [
  { value: 0, label: "No limit" },
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 3 months" },
  { value: 180, label: "Last 6 months" },
];

const daysOfWeek = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const timeOptions = [
  { value: "06:00", label: "6:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "21:00", label: "9:00 PM" },
];

export const PlaylistSettingsModal = ({
  setShowPlaylistSettingsModal,
  setSelectedPlaylist,
  selectedPlaylist,
  fromSubscribeModal,
}: {
  setShowPlaylistSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPlaylist: React.Dispatch<React.SetStateAction<any>>;
  selectedPlaylist: any;
  fromSubscribeModal: boolean;
}) => {
  const [updatedData, setUpdatedData] = useState({
    syncInterval: selectedPlaylist?.syncInterval || "WEEKLY",
    syncQuantityPerSource: selectedPlaylist?.syncQuantityPerSource || 5,
    syncMode: selectedPlaylist?.syncMode || "APPEND",
    explicitContentFilter: selectedPlaylist?.explicitContentFilter || false,
    trackAgeLimit: selectedPlaylist?.trackAgeLimit || 0,
    customDays: selectedPlaylist?.customDays ? 
      (typeof selectedPlaylist.customDays === 'string' ? 
        JSON.parse(selectedPlaylist.customDays) : selectedPlaylist.customDays) 
      : ["monday"],
    customTime: selectedPlaylist?.customTime || "09:00",
  });
  const updateManagedPlaylist = useUserStore(
    (state) => state.updateManagedPlaylist
  );

  const resetData = () =>
    setUpdatedData({
      syncInterval: selectedPlaylist?.syncInterval || "WEEKLY",
      syncQuantityPerSource: selectedPlaylist?.syncQuantityPerSource || 5,
      syncMode: selectedPlaylist?.syncMode || "APPEND",
      explicitContentFilter: selectedPlaylist?.explicitContentFilter || false,
      trackAgeLimit: selectedPlaylist?.trackAgeLimit || 0,
      customDays: selectedPlaylist?.customDays ? 
        (typeof selectedPlaylist.customDays === 'string' ? 
          JSON.parse(selectedPlaylist.customDays) : selectedPlaylist.customDays) 
        : ["monday"],
      customTime: selectedPlaylist?.customTime || "09:00",
    });

  const handleUpdateManagedPlaylist = async () => {
    fetch(`/api/users/managed-playlists/${selectedPlaylist.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...updatedData }),
    })
      .then((resp) => resp.json())
      .then(({ data: { managedPlaylist }, success, message }) => {
        if (success) {
          updateManagedPlaylist(selectedPlaylist.id, managedPlaylist);
          toast.success(message);
          setShowPlaylistSettingsModal(false);
        } else {
          toast.error(message);
        }
      })
      .catch((error) => {
        console.error(error.message);
        toast.error(error.message);
      });
  };

  const handleCancelOrClose = () => {
    if (!fromSubscribeModal) setSelectedPlaylist(null);
    setShowPlaylistSettingsModal(false);
  };

  // Safety check - don't render if selectedPlaylist is missing
  if (!selectedPlaylist?.id) {
    return null;
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${
      fromSubscribeModal ? '' : 'bg-black/60 backdrop-blur-sm'
    }`}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative shadow-xl">
        <button
          onClick={handleCancelOrClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <Settings size={36} className="text-[#CC5500] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            Advanced Settings
          </h2>
          <p className="text-gray-600">
            Configure how &quot;{selectedPlaylist?.name || 'this playlist'}&quot; receives tracks
            from subscribed playlists
          </p>
        </div>

        <div className="flex items-center p-3 bg-gray-50 rounded-sm border border-gray-200 mb-6">
          <img
            src={selectedPlaylist?.imageUrl || selectedPlaylist?.images?.[0]?.url || '/placeholder.png'}
            alt={selectedPlaylist?.name || 'Playlist'}
            className="w-12 h-12 object-cover rounded-sm"
          />
          <div className="ml-3">
            <h3 className="font-medium text-gray-800">
              {selectedPlaylist?.name || 'Unknown Playlist'}
            </h3>
            <p className="text-gray-500 text-sm">
              {selectedPlaylist?.trackCount || selectedPlaylist?.tracks?.total || 0} tracks
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* SYNC SCHEDULE */}
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-700 mb-3">Sync Schedule</h3>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">
                How often should we add new tracks?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {frequencyOptions.map((option) => {
                  return (
                    <div
                      key={option.value}
                      id={`settings-freq-${option.value}`}
                      className={`settings-frequency-option py-2 text-center rounded cursor-pointer transition-colors border ${
                        updatedData.syncInterval === option.value
                          ? "bg-[#CC5500] text-white"
                          : "bg-gray-50 text-gray-800 border-gray-200"
                      }`}
                      onClick={() =>
                        setUpdatedData((prevState) => ({
                          ...prevState,
                          syncInterval: option.value,
                        }))
                      }
                    >
                      {option.label}
                    </div>
                  );
                })}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                This is how often we&apos;ll update your playlist with fresh
                tracks.
              </p>
            </div>

            {updatedData.syncInterval === "CUSTOM" && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-3">
                  Custom Schedule
                </h4>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Select days of the week:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={updatedData.customDays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUpdatedData((prev) => ({
                                ...prev,
                                customDays: [...prev.customDays, day.value],
                              }));
                            } else {
                              setUpdatedData((prev) => ({
                                ...prev,
                                customDays: prev.customDays.filter(
                                  (d: string) => d !== day.value
                                ),
                              }));
                            }
                          }}
                          className="text-[#CC5500] focus:ring-[#CC5500] rounded"
                        />
                        <span>{day.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">
                    Select time:
                  </label>
                  <div className="relative">
                    <select
                      value={updatedData.customTime}
                      onChange={(e) =>
                        setUpdatedData((prev) => ({
                          ...prev,
                          customTime: e.target.value,
                        }))
                      }
                      className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#CC5500] focus:border-[#CC5500] appearance-none text-gray-700"
                    >
                      {timeOptions.map((option) => (
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
                </div>
              </div>
            )}
          </div>

          {/* CONTENT SETTINGS */}
          <div className="border-b pb-4">
            <h3 className="font-medium text-gray-700 mb-3">Content Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  How many songs to add each time?
                </label>
                <div className="relative">
                  <select
                    id="settings-song-count-dropdown"
                    className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#CC5500] focus:border-[#CC5500] appearance-none text-gray-700"
                    value={updatedData.syncQuantityPerSource}
                    onChange={(e) =>
                      setUpdatedData((prevState) => ({
                        ...prevState,
                        syncQuantityPerSource: parseInt(e.target.value),
                      }))
                    }
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
                  This is the number of tracks we&apos;ll add from each
                  subscribed playlist during updates.
                </p>
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Sync mode
                </label>
                <div className="space-y-2">
                  {syncModeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-start space-x-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="syncMode"
                        value={option.value}
                        checked={updatedData.syncMode === option.value}
                        onChange={(e) =>
                          setUpdatedData((prev) => ({
                            ...prev,
                            syncMode: e.target.value,
                          }))
                        }
                        className="mt-1 text-[#CC5500] focus:ring-[#CC5500]"
                      />
                      <div>
                        <div className="font-medium text-gray-700">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Content Filters</h3>

            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updatedData.explicitContentFilter}
                  onChange={(e) =>
                    setUpdatedData((prev) => ({
                      ...prev,
                      explicitContentFilter: e.target.checked,
                    }))
                  }
                  className="text-[#CC5500] focus:ring-[#CC5500] rounded"
                />
                <div>
                  <div className="font-medium text-gray-700">
                    Filter explicit content
                  </div>
                  <div className="text-xs text-gray-500">
                    Skip tracks marked as explicit
                  </div>
                </div>
              </label>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Only sync recent tracks
                </label>
                <div className="relative">
                  <select
                    value={updatedData.trackAgeLimit}
                    onChange={(e) =>
                      setUpdatedData((prev) => ({
                        ...prev,
                        trackAgeLimit: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-3 bg-white rounded-sm border border-gray-300 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#CC5500] focus:border-[#CC5500] appearance-none text-gray-700"
                  >
                    {trackAgeLimitOptions.map((option) => (
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
                  Only sync tracks added to source playlist within this
                  timeframe.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={resetData}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleCancelOrClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              handleUpdateManagedPlaylist();
            }}
            className="px-6 py-2 bg-[#CC5500] text-white rounded hover:bg-[#B04A00] transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
