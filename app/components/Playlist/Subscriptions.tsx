import { Bell } from "lucide-react";
import React, { useEffect } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { PlaylistSettingsModal } from "../Modals/SettingsModal";
import { useUserStore } from "store/useUserStore";
import { SubscriptionSkeleton } from "../Skeletons/SubscriptionSkeleton";
import toast from "react-hot-toast";

interface ISubscriptionsProps {
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  setShowPlaylistSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  showPlaylistSettingsModal: boolean;
  selectedPlaylist: ISpotifyPlaylist | null;
}

export const Subscriptions = ({
  setSelectedPlaylist,
  setShowPlaylistSettingsModal,
  setActiveTab,
  showPlaylistSettingsModal,
  selectedPlaylist,
}: ISubscriptionsProps) => {
  const userPlaylists = useUserStore((state) => state.userPlaylists);
  const subscriptions = useUserStore((state) => state.subscriptions);
  const setSubscriptions = useUserStore((state) => state.setSubscriptions);
  const removeSourceFromSubscription = useUserStore(
    (state) => state.removeSourceFromSubscription
  );
  const isLoading = useUserStore((state) => state.isLoading);
  const setIsLoading = useUserStore((state) => state.setLoading);
  console.log(subscriptions);
  useEffect(() => {
    async function fetchSubscriptions() {
      setIsLoading(true);
      const api = `/api/users/subscriptions`;
      const res = await fetch(api);
      const data = await res.json();
      setSubscriptions([...data]);
      setIsLoading(false);
    }

    fetchSubscriptions();
  }, []);

  const handleUnsubscribe = async (sourceID: string) => {
    const res = await fetch(`/api/users/subscriptions/${sourceID}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          throw new Error(data.error || "Failed to unsubscribe");
        }
        console.log(data);
        removeSourceFromSubscription(data.data.subscriptionId, sourceID);
      })
      .catch((error) => {
        console.error("Error unsubscribing:", error.message || error);
        toast.error(error.message || "Failed to unsubscribe");
        throw error;
      });
  };

  return (
    <div className="flex flex-col grow min-h-0">
      {!isLoading ? (
        <>
          {subscriptions.length ? (
            <div className="grow overflow-auto p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Auto-Synced Playlists
              </h2>
              <div className="grid gap-6">
                {subscriptions.map((group: any, groupIndex: number) => (
                  <div
                    key={groupIndex}
                    className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div
                      className="p-6 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 cursor-pointer hover:from-slate-100 hover:to-gray-100 transition-all duration-200"
                      onClick={() => {
                        setSelectedPlaylist(
                          userPlaylists.find(
                            (p: ISpotifyPlaylist) =>
                              p.id === group.destination.spotifyId
                          ) || null
                        );
                        setShowPlaylistSettingsModal(true);
                      }}
                    >
                      <div className="flex items-center mb-4">
                        <div className="relative">
                          <img
                            src={group.destination.imageUrl}
                            alt={group.destination.name}
                            className="w-16 h-16 object-cover rounded-xl shadow-md"
                          />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <Bell size={12} className="text-white" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="font-bold text-gray-900 text-lg mb-1">
                            {group.destination.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            Auto-collecting from {group.sources.length} source{group.sources.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-700">
                            {group.destination.trackCount} songs
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-700">
                            {`${group.destination.syncInterval
                              .charAt(0)
                              .toUpperCase()}${group.destination.syncInterval
                              .slice(1)
                              .toLowerCase()}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-700">
                            Next Sync: {group.destination.nextSyncTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <h4 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wider">
                        Connected Sources
                      </h4>
                      <div className="space-y-3">
                        {group.sources.map(
                          (source: any, sourceIndex: number) => (
                            <div
                              key={sourceIndex}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-gray-100 hover:to-slate-100 transition-all duration-200 border border-gray-100"
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <img
                                  src={source.imageUrl}
                                  alt={source.name}
                                  className="w-12 h-12 object-cover rounded-lg shadow-md flex-shrink-0"
                                />
                                <div className="ml-4 flex-1 min-w-0">
                                  <h5 className="font-semibold text-gray-900 truncate mb-1">
                                    {source.name}
                                  </h5>
                                </div>
                              </div>
                              <button
                                onClick={() => handleUnsubscribe(source.id)}
                                className="ml-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all duration-200 border border-red-200 shadow-sm hover:shadow-md flex-shrink-0"
                              >
                                Unsubscribe
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">
                No auto-synced playlists yet
              </h3>
              <p className="text-gray-600">
                Create smart playlists that automatically sync songs from your favorite sources
              </p>
              <button
                onClick={() => setActiveTab("discover")}
                className="mt-6 px-6 py-3 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md transition-colors"
              >
                Discover Playlists
              </button>
            </div>
          )}
        </>
      ) : (
        <SubscriptionSkeleton />
      )}
      {showPlaylistSettingsModal && selectedPlaylist && (
        <PlaylistSettingsModal
          setShowPlaylistSettingsModal={setShowPlaylistSettingsModal}
          setSelectedPlaylist={setSelectedPlaylist}
          selectedPlaylist={selectedPlaylist}
        />
      )}
    </div>
  );
};
