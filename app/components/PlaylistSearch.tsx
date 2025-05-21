"use client";
import React, { useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist } from "../../utils/types";
import { SearchBar } from "./SearchBar";
import { Header } from "./Header";
import WebPlayer from "./WebPlayer";
import { PlaylistList } from "./PlaylistList";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./NavTabs";
import { SubscibeModal } from "./SubscibeModal";
import { PlaylistSettingsModal } from "./PlaylistSettingsModal";
import { sources } from "next/dist/compiled/webpack/webpack";
import { Bell } from "lucide-react";
import { useUserStore } from "store/useUserStore";

const userPlaylistsEndpoint = "/api/spotify/user/playlists";

const PlaylistSearch = ({ userData }: any) => {
  const setUser = useUserStore((state) => state.setUser);

  const [searchText, setSearchText] = useState<string>("");
  const [playlists, setPlaylists] = useState<ISpotifyPlaylist[]>([]);
  const [previewTracks, setPreviewTracks] = useState<any>([]);
  const [isLongPress, setIsLongPress] = useState(false);
  const [deviceID, setDeviceID] = useState("");
  const [player, setPlayer] = useState(null);
  const [offset, setOffset] = useState<number>(OFFSET);
  const [APIURL, setAPIURL] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadedAllData, setLoadedAllData] = useState<boolean>(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>("");
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPlaylistSettingseModal, setShowPlaylistSettingseModal] =
    useState(false);
  const [subscriptions, setSubscriptions] = useState<any>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const [userOffset, setUserOffset] = useState(0);
  const [userLoading, setUserLoading] = useState(false);
  const [userLoadedAll, setUserLoadedAll] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<ISpotifyPlaylist[]>([]);

  const [searchOffset, setSearchOffset] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadedAll, setSearchLoadedAll] = useState(false);

  // get users subscriptions
  useEffect(() => {
    async function fetchSubscriptions() {
      const api = `/api/users/subscriptions`;
      const res = await fetch(api);
      const data = await res.json();

      // const subscriptionMap = data.reduce((map, group) => {
      //   map[group.destination.spotifyId] = group;
      //   return map;
      // }, {} as Record<string, any>);

      // const enrichedSubscriptionData = userPlaylists.map((playlist) => {
      //   const subscription = subscriptionMap[playlist.id];

      //   if (subscription) {
      //     return {
      //       ...playlist,
      //       subscription,
      //     };
      //   }
      //   return playlist;
      // });

      setSubscriptions([...data]);
    }

    if (activeTab === "subscribed") fetchSubscriptions();
  }, [activeTab, userPlaylists]);

  useEffect(() => {
    setUser({
      ...userData,
    });
  }, [userData, setUser]);

  useEffect(() => {
    async function fetchPlaylists() {
      const api = `/api/spotify/search?searchText=${encodeURIComponent(
        searchText
      )}`;
      setAPIURL(api);
      const res = await fetch(api);
      const data = await res.json();
      setPlaylists([...data]);
    }

    const timeoutId = setTimeout(() => {
      if (searchText) {
        setPlaylists([]);
        fetchPlaylists();
        setOffset(0);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchText]);

  const fetchSearchPlaylists = async () => {
    if (searchLoading || searchLoadedAll || !APIURL) return;
    setSearchLoading(true);

    try {
      const res = await fetch(`${APIURL}&offset=${searchOffset}`);
      const data: ISpotifyPlaylist[] = await res.json();
      console.log(data.length);
      setPlaylists((prev) => [...prev, ...data]);
      setSearchLoadedAll(data.length < OFFSET);
      setSearchOffset((prev) => prev + OFFSET);
    } catch (err) {
      console.error("Failed search fetch:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchUserPlaylists = async () => {
    if (userLoading || userLoadedAll) return;
    setUserLoading(true);

    try {
      const res = await fetch(`${userPlaylistsEndpoint}?offset=${userOffset}`);
      const data: ISpotifyPlaylist[] = await res.json();
      setPlaylists((prev) => [...prev, ...data]);
      setUserLoadedAll(data.length < OFFSET);
      setUserOffset((prev) => prev + OFFSET);
      const filteredPlaylists = data.filter(
        (playlist) =>
          playlist.owner.id === userData?.externalAccounts[0].externalId
      );
      setUserPlaylists((prev) => [...prev, ...filteredPlaylists]);
    } catch (err) {
      console.error("Failed user playlist fetch:", err);
    } finally {
      setUserLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!hasFetched.current) {
        hasFetched.current = true;
        await fetchUserPlaylists();
      }
    };
    fetchData();

    return () => {
      // Cleanup logic can be added here if needed, such as aborting fetch requests
    };
  }, []);

  useEffect(() => {
    const fetchPlaylistTracks = async (playlistID: string) => {
      const res = await fetch(`/api/spotify/playlists/${playlistID}`);
      const data = await res.json();
      setPreviewTracks([...data]);
    };

    if (expandedPlaylist) fetchPlaylistTracks(expandedPlaylist);
  }, [expandedPlaylist]);

  const handleUnsubscribe = async (playlistID: string) => {
    // const res = await fetch(`/api/spotify/unsubscribe/${playlistID}`, {
    //   method: "DELETE",
    //   headers: {
    //     Authorization: `Bearer ${token}`,
    //   },
    // });
    // const data = await res.json();
    // if (data.success) {
    //   // setSelectedPlaylists((prev) => prev.filter((id) => id !== playlistID));
    // }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const nearBottom = scrollHeight - scrollTop <= clientHeight + 100;

        if (!nearBottom || userLoading || searchLoading) return;

        if (searchText) {
          console.log("hi");
          fetchSearchPlaylists();
        } else {
          fetchUserPlaylists();
        }
      }
    };

    if (listRef.current) {
      listRef.current.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (listRef.current) {
        listRef.current.removeEventListener("scroll", handleScroll);
      }
    };
  }, [
    loading,
    loadedAllData,
    listRef.current,
    searchText,
    userOffset,
    searchOffset,
    userLoadedAll,
    searchLoadedAll,
    userLoading,
    searchLoading,
    APIURL,
  ]);
  console.log(subscriptions);
  return (
    <>
      {/* <WebPlayer
        token={token}
        setDeviceID={setDeviceID}
        player={player}
        setPlayer={setPlayer}
      /> */}
      <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "discover" ? (
        <>
          <SearchBar value={searchText} onChange={setSearchText} />
          {playlists.length ? (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Search Results
              </h2>
              <p className="text-gray-600 mt-1">
                Click on a playlist to preview tracks or subscribe to
                automatically add songs to your library
              </p>
            </div>
          ) : null}
          <PlaylistList
            playlists={playlists}
            setIsLongPress={setIsLongPress}
            isLongPress={isLongPress}
            deviceID={deviceID}
            player={player}
            setSelectedPlaylist={setSelectedPlaylist}
            loading={loading}
            loadedAllData={loadedAllData}
            offset={offset}
            setOffset={setOffset}
            expandedPlaylist={expandedPlaylist}
            setExpandedPlaylist={setExpandedPlaylist}
            handleUnsubscribe={handleUnsubscribe}
            previewTracks={previewTracks}
            setPreviewTracks={setPreviewTracks}
            testingRef={listRef}
            setShowSubscribeModal={setShowSubscribeModal}
          />
          {showSubscribeModal && (
            <SubscibeModal
              selectedPlaylist={selectedPlaylist}
              setSelectedPlaylist={setSelectedPlaylist}
              setShowSubscribeModal={setShowSubscribeModal}
              userPlaylists={userPlaylists}
            />
          )}
        </>
      ) : (
        <>
          {subscriptions.length ? (
            <>
              <div className="overflow-auto">
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
                            (p) => p.id === group.destination.spotifyId
                          ) || null
                        );
                        setShowPlaylistSettingseModal(true);
                      }}
                    >
                      <div className="flex items-start">
                        <img
                          src={group.destination.imageUrl}
                          alt={group.destination.name}
                          className="w-16 h-16 object-cover rounded"
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
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="ml-3 flex-grow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-gray-800">
                                    {source.name}
                                  </h4>
                                  {/* <p className="text-gray-500 text-sm">
                    By {source.sourcePlaylist.creator}
                  </p> */}
                                </div>
                                <button
                                  onClick={() => handleUnsubscribe(source.id)}
                                  className="px-3 py-1 rounded-full bg-gray-100 text-red-500 text-xs hover:bg-gray-200 shadow-sm border border-gray-200"
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
            </>
          ) : (
            <>
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
            </>
          )}
          {showPlaylistSettingseModal && selectedPlaylist && (
            <PlaylistSettingsModal
              setShowPlaylistSettingsModal={setShowPlaylistSettingseModal}
              setSelectedPlaylist={setSelectedPlaylist}
              selectedPlaylist={selectedPlaylist}
            />
          )}
        </>
      )}
    </>
  );
};

export default PlaylistSearch;
