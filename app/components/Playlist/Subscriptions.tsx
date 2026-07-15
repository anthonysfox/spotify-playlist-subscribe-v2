import { Bell, Music, Clock, Hash, Calendar, Settings } from "lucide-react";
import React, { useEffect, useState } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { PlaylistSettingsModal } from "../Modals/SettingsModal";
import { useUserStore } from "store/useUserStore";
import type { ManagedPlaylistWithSubscriptions } from "store/useUserStore";
import { SubscriptionSkeleton } from "../Skeletons/SubscriptionSkeleton";
import toast from "react-hot-toast";
import type { SelectablePlaylist } from "../Dashboard";
import { PROVIDER_LABELS } from "store/useMusicStore";

interface ISubscriptionsProps {
  // The same piece of state holds a Spotify playlist during the subscribe flow
  // and a managed playlist when opening settings — this component writes the
  // latter into it (see setSelectedPlaylist(managedPlaylist) below). The type is
  // the union it genuinely holds, rather than one half of it.
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<SelectablePlaylist | null>
  >;
  setShowPlaylistSettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  showPlaylistSettingsModal: boolean;
  selectedPlaylist: SelectablePlaylist | null;
}

export const Subscriptions = ({
  setSelectedPlaylist,
  setShowPlaylistSettingsModal,
  setActiveTab,
  showPlaylistSettingsModal,
  selectedPlaylist,
}: ISubscriptionsProps) => {
  const userPlaylists = useUserStore((state) => state.userPlaylists);
  const managedPlaylists = useUserStore((state) => state.managedPlaylists);
  const setManagedPlaylists = useUserStore(
    (state) => state.setManagedPlaylists
  );
  const unsubscribeFromSource = useUserStore(
    (state) => state.unsubscribeFromSource
  );
  const isLoading = useUserStore((state) => state.isLoading);
  const setIsLoading = useUserStore((state) => state.setLoading);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function fetchSubscriptions() {
      setIsLoading(true);
      const api = `/api/users/me/managed-playlists`;
      const res = await fetch(api);
      const data = await res.json();
      setManagedPlaylists([...data]);
      setIsLoading(false);
    }
    fetchSubscriptions();
  }, []);

  const handleUnsubscribe = async (
    sourcePlaylistID: string,
    managedPlaylistId: string
  ) => {
    await unsubscribeFromSource(sourcePlaylistID, managedPlaylistId);
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/users/me/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "Sync failed");
      }
      toast.success(
        data?.message || "Sync started. Playlists will update shortly."
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col grow min-h-0">
      {!isLoading ? (
        <>
          {managedPlaylists.length ? (
            <div className="grow overflow-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Auto-Synced Playlists
                </h2>
                <button
                  onClick={handleSyncNow}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSyncing}
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
              <div className="grid gap-6">
                {managedPlaylists.map(
                  (
                    managedPlaylist: ManagedPlaylistWithSubscriptions,
                    groupIndex: number,
                  ) => (
                    <div
                      key={groupIndex}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div
                        className="p-6 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50 cursor-pointer hover:from-slate-100 hover:to-gray-100 transition-all duration-200 group relative"
                        onClick={() => {
                          setSelectedPlaylist(managedPlaylist);
                          setShowPlaylistSettingsModal(true);
                        }}
                      >
                        <div className="flex items-center mb-4">
                          <div className="relative">
                            <img
                              // A managed playlist can genuinely have no artwork
                              // (a brand new Apple Music playlist has none until
                              // it has tracks). The `any` on this map hid that.
                              src={managedPlaylist.imageUrl ?? undefined}
                              alt={managedPlaylist.name}
                              className="w-16 h-16 object-cover rounded-xl shadow-md"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                              <Bell size={12} className="text-white" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-lg mb-1">
                                {managedPlaylist.name}
                              </h3>

                              {/*
                                With both services connected, a Spotify playlist
                                and an Apple Music one are otherwise
                                indistinguishable in this list — and they behave
                                differently (no REPLACE mode on Apple), so the
                                difference matters.
                              */}
                              <span
                                className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full border mb-1 ${
                                  managedPlaylist.provider === "APPLE_MUSIC"
                                    ? "bg-pink-50 text-pink-700 border-pink-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }`}
                              >
                                {PROVIDER_LABELS[managedPlaylist.provider]}
                              </span>

                              <Settings
                                size={16}
                                className="text-gray-400 group-hover:text-gray-600 transition-colors opacity-60 group-hover:opacity-100"
                              />
                            </div>
                            <p className="text-gray-600 text-sm">
                              Auto-collecting from{" "}
                              {managedPlaylist.subscriptions.length} source
                              {managedPlaylist.subscriptions.length === 1
                                ? ""
                                : "s"}{" "}
                              • Click to configure
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Music size={12} className="text-emerald-500" />
                            <span className="text-sm font-semibold text-gray-700">
                              {managedPlaylist.syncQuantityPerSource} per source
                            </span>
                            <span className="text-xs text-gray-500">
                              (
                              {managedPlaylist.syncQuantityPerSource *
                                managedPlaylist.subscriptions.length}{" "}
                              total per sync)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Hash size={12} className="text-blue-500" />
                            <span className="text-sm font-semibold text-gray-700">
                              {managedPlaylist.trackCount} total songs
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Clock size={12} className="text-purple-500" />
                            <span className="text-sm font-semibold text-gray-700">
                              {`${managedPlaylist.syncInterval
                                .charAt(0)
                                .toUpperCase()}${managedPlaylist.syncInterval
                                .slice(1)
                                .toLowerCase()}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Calendar size={12} className="text-orange-500" />
                            <span className="text-sm font-semibold text-gray-700">
                              Next:{" "}
                              {managedPlaylist.nextSyncTime
                                ? new Date(
                                    managedPlaylist.nextSyncTime
                                  ).toLocaleDateString(undefined, {
                                    timeZone: "UTC",
                                    year: "numeric",
                                    month: "numeric",
                                    day: "numeric",
                                  })
                                : "Not scheduled"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <h4 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wider">
                          Connected Sources
                        </h4>
                        <div className="space-y-3">
                          {managedPlaylist.subscriptions.map(
                            (subscription: any, sourceIndex: number) => (
                              <div
                                key={sourceIndex}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-gray-100 hover:to-slate-100 transition-all duration-200 border border-gray-100"
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <img
                                    src={subscription.sourcePlaylist.imageUrl}
                                    alt={subscription.sourcePlaylist.name}
                                    className="w-12 h-12 object-cover rounded-lg shadow-md flex-shrink-0"
                                  />
                                  <div className="ml-4 flex-1 min-w-0">
                                    <h5 className="font-semibold text-gray-900 truncate mb-1">
                                      {subscription.sourcePlaylist.name}
                                    </h5>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleUnsubscribe(
                                      subscription.sourcePlaylist.id,
                                      managedPlaylist.id
                                    )
                                  }
                                  className="ml-2 sm:ml-4 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-red-50 text-red-600 text-xs sm:text-sm font-medium hover:bg-red-100 transition-all duration-200 border border-red-200 shadow-sm hover:shadow-md flex-shrink-0"
                                >
                                  <span className="hidden sm:inline">
                                    Unsubscribe
                                  </span>
                                  <span className="sm:hidden">×</span>
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
              <Bell size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800">
                No auto-synced playlists yet
              </h3>
              <p className="text-gray-600">
                Create smart playlists that automatically sync songs from your
                favorite sources
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
