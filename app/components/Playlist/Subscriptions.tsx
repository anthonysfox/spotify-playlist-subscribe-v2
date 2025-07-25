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
        console.log(data.data.subscriptionId);
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
            <div className="grow overflow-auto">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Your Playlists
              </h2>
              {subscriptions.map((group: any, groupIndex: number) => (
                <div
                  key={groupIndex}
                  className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200 mb-6"
                >
                  <div
                    className="p-4 border-b border-gray-200 bg-gray-50"
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
                    <div className="flex items-start">
                      <img
                        src={group.destination.imageUrl}
                        alt={group.destination.name}
                        className="w-16 h-16 object-cover rounded-sm"
                      />
                      <div className="ml-4">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {group.destination.name}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          Receiving songs from {group.sources.length}
                          {group.sources.length === 1
                            ? " playlist"
                            : " playlists"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {group.sources.map((source: any, sourceIndex: number) => (
                      <div key={sourceIndex} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start">
                          <img
                            src={source.imageUrl}
                            alt={source.name}
                            className="w-12 h-12 object-cover rounded-sm"
                          />
                          <div className="ml-3 grow">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-gray-800">
                                  {source.name}
                                </h4>
                              </div>
                              <button
                                onClick={() => handleUnsubscribe(source.id)}
                                className="px-3 py-1 rounded-full bg-gray-100 text-red-500 text-xs hover:bg-gray-200 shadow-xs border border-gray-200"
                              >
                                Unsubscribe
                              </button>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-sm">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                {source.songCount} songs {source.frequency}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                Next update: {source.nextUpdate}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">
                No subscriptions yet
              </h3>
              <p className="text-gray-600">
                Search for playlists and subscribe to them to get started
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
