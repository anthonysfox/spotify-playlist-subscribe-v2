"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  ISpotifyPlaylist,
  IState,
  ITopArtistState,
  IUserPlaylistsState,
} from "../../utils/types";
import { Header } from "./Header";
import WebPlayer from "./WebPlayer";
import { CuratedPlaylists } from "./CuratedPlaylists";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./NavTabs";
import { SubscibeModal } from "./SubscibeModal";
import { PlaylistSettingsModal } from "./PlaylistSettingsModal";
import { Bell } from "lucide-react";
import { useUserStore } from "store/useUserStore";
import { useSpotifyPlayer } from "utils/useSpotifyPlayer";

const userPlaylistsEndpoint = "/api/spotify/user/playlists";
const playlistEndpoint = "/api/spotify/playlists";

const PlaylistSearch = ({ userData }: any) => {
  const setUser = useUserStore((state) => state.setUser);
  const [token, setToken] = useState<string>("");

  // Fetch the Spotify token from the API
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/spotify/token");
        if (response.ok) {
          const data = await response.json();
          console.log(
            "PlaylistSearch: Token fetched successfully:",
            !!data.token
          );
          setToken(data.token);
        } else {
          console.error("PlaylistSearch: Failed to fetch token");
        }
      } catch (error) {
        console.error("PlaylistSearch: Error fetching token:", error);
      }
    };

    fetchToken();
  }, []);

  const { player, deviceID } = useSpotifyPlayer(token);

  const [previewTracks, setPreviewTracks] = useState<any>([]);
  const [isLongPress, setIsLongPress] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>("");
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPlaylistSettingseModal, setShowPlaylistSettingseModal] =
    useState(false);
  const [subscriptions, setSubscriptions] = useState<any>([]);
  const [topArtists, setTopArtists] = useState<any>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const [userPlaylistsState, setUserPlaylistsState] =
    useState<IUserPlaylistsState>({
      offset: 0,
      loading: false,
      loadedAll: false,
      playlists: [],
    });

  // get users subscriptions
  useEffect(() => {
    async function fetchSubscriptions() {
      const api = `/api/users/subscriptions`;
      const res = await fetch(api);
      const data = await res.json();
      setSubscriptions([...data]);
    }

    if (activeTab === "subscribed") fetchSubscriptions();
  }, [activeTab, userPlaylistsState.playlists]);

  useEffect(() => {
    setUser({
      ...userData,
    });
  }, [userData, setUser]);

  const fetchUserPlaylists = async () => {
    if (userPlaylistsState.loading || userPlaylistsState.loadedAll) return;
    setUserPlaylistsState((prevState) => ({ ...prevState, loading: true }));

    try {
      const res = await fetch(
        `${userPlaylistsEndpoint}?offset=${userPlaylistsState.offset}`
      );
      const data: ISpotifyPlaylist[] = await res.json();

      const filteredPlaylists = data.filter(
        (playlist) =>
          playlist.owner.id === userData?.externalAccounts[0].externalId
      );
      setUserPlaylistsState((prevState) => ({
        ...prevState,
        loadedAll: data.length < OFFSET,
        offset: prevState.offset + OFFSET,
        playlists: [...prevState.playlists, ...filteredPlaylists],
      }));
    } catch (err) {
      console.error("Failed user playlist fetch:", err);
    } finally {
      setUserPlaylistsState((prevState) => ({ ...prevState, loading: false }));
    }
  };

  const fetchTopArtists = async (): Promise<string[]> => {
    try {
      const res = await fetch("/api/spotify/user/top-artists");
      if (!res.ok) throw new Error("Failed to fetch top artists");
      return await res.json();
    } catch (err) {
      console.error("Error fetching top artists:", err);
      return [];
    }
  };

  const fetchTopArtistPlaylists = async () => {
    if (topArtistsState.loading || topArtistsState.loadedAll) return;

    setTopArtistsState((prevState) => ({
      ...prevState,
      loading: true,
    }));

    try {
      let topFiveArtists = topArtistsState.artists.slice(0, 5);
      if (topFiveArtists.length === 0) {
        topFiveArtists = await fetchTopArtists();
        setTopArtistsState((prevState) => ({
          ...prevState,
          artists: topFiveArtists,
        }));
      }

      const playlistPromises = topFiveArtists.map((artist) =>
        fetch(
          `/api/spotify/search?searchText=${encodeURIComponent(
            artist
          )}&offset=${topArtistsState.offset}`
        ).then((res) => res.json())
      );

      const playlistResults = await Promise.all(playlistPromises);
      const allPlaylists = playlistResults.flat();

      setTopArtistsState((prevState) => ({
        ...prevState,
        loadedAll: allPlaylists.length < OFFSET,
        offset: prevState.offset + OFFSET,
        playlists: [...prevState.playlists, ...allPlaylists],
      }));
    } catch (err) {
      console.error("Failed top artist playlist fetch:", err);
    } finally {
      setTopArtistsState((prevState) => ({ ...prevState, loading: false }));
    }
  };

  const [topArtistsState, setTopArtistsState] = useState<ITopArtistState>({
    offset: 0,
    loading: false,
    loadedAll: false,
    playlists: [],
    artists: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (activeTab === "my-playlists") {
        await fetchUserPlaylists();
      } else if (activeTab === "top-artists") {
        await fetchTopArtistPlaylists();
      }
    };

    fetchData();
  }, [
    activeTab,
    userPlaylistsState.offset,
    topArtistsState.offset,
    userPlaylistsState.loadedAll,
    topArtistsState.loadedAll,
    userPlaylistsState.loading,
    topArtistsState.loading,
  ]);

  const fetchPlaylistTracks = async (playlistID: string) => {
    const res = await fetch(`${playlistEndpoint}/${playlistID}`);
    const data = await res.json();
    setPreviewTracks(data);
  };

  const handleUnsubscribe = async (playlistID: string) => {
    try {
      const res = await fetch(`/api/users/subscriptions/${playlistID}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubscriptions((prev: any) =>
          prev.filter((sub: any) => sub.id !== playlistID)
        );
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const nearBottom = scrollHeight - scrollTop <= clientHeight + 100;

        if (nearBottom) {
          if (activeTab === "my-playlists" && !userPlaylistsState.loading) {
            fetchUserPlaylists();
          } else if (activeTab === "top-artists" && !topArtistsState.loading) {
            fetchTopArtistPlaylists();
          }
        }
      }
    };

    const currentRef = listRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [
    activeTab,
    userPlaylistsState.loading,
    topArtistsState.loading,
    userPlaylistsState.offset,
    topArtistsState.offset,
    userPlaylistsState.loadedAll,
    topArtistsState.loadedAll,
  ]);

  return (
    <div className="flex flex-col h-full">
      <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "discover" ? (
        <div className="flex flex-col grow min-h-0">
          <CuratedPlaylists
            setSelectedPlaylist={setSelectedPlaylist}
            setShowSubscribeModal={setShowSubscribeModal}
            setExpandedPlaylist={setExpandedPlaylist}
            expandedPlaylist={expandedPlaylist}
            previewTracks={previewTracks}
            setPreviewTracks={setPreviewTracks}
            listRef={listRef}
            player={player}
            deviceID={deviceID || ""}
          />
          {showSubscribeModal && (
            <SubscibeModal
              selectedPlaylist={selectedPlaylist}
              setSelectedPlaylist={setSelectedPlaylist}
              setShowSubscribeModal={setShowSubscribeModal}
              userPlaylists={userPlaylistsState.playlists}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col grow min-h-0">
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
                        userPlaylistsState.playlists.find(
                          (p: ISpotifyPlaylist) =>
                            p.id === group.destination.spotifyId
                        ) || null
                      );
                      setShowPlaylistSettingseModal(true);
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
          {showPlaylistSettingseModal && selectedPlaylist && (
            <PlaylistSettingsModal
              setShowPlaylistSettingsModal={setShowPlaylistSettingseModal}
              setSelectedPlaylist={setSelectedPlaylist}
              selectedPlaylist={selectedPlaylist}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PlaylistSearch;
