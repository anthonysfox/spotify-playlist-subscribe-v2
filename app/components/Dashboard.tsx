"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  ISpotifyPlaylist,
  IState,
  ITopArtistState,
  IUserPlaylistsState,
} from "utils/types";
import { CuratedPlaylists } from "./CuratedPlaylists";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./Navigation/NavTabs";
import { SubscribeModal, SubscribeReqBody } from "./Modals/SubscribeModal";
import { PlaylistSettingsModal } from "./Modals/SettingsModal";
import { Bell } from "lucide-react";
import { useUserStore } from "store/useUserStore";
import { useSpotifyPlayer } from "hooks/useSpotifyPlayer";
import { Subscriptions } from "./Playlist/Subscriptions";
import toast from "react-hot-toast";

const playlistEndpoint = "/api/spotify/playlists";

const Dashboard = ({ userData }: any) => {
  const setUser = useUserStore((state) => state.setUser);
  const setManagedPlaylists = useUserStore(
    (state) => state.setManagedPlaylists
  );
  const [token, setToken] = useState<string>("");
  const { player, deviceID } = useSpotifyPlayer(token);
  const [previewTracks, setPreviewTracks] = useState<any>([]);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>("");
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPlaylistSettingseModal, setShowPlaylistSettingsModal] =
    useState(false);
  const [topArtists, setTopArtists] = useState<any>([]);
  const [subscribeModalFormData, setSubscribeModalFormData] =
    useState<SubscribeReqBody | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Transform client-side user data to match expected format
    const transformedUser = {
      ...userData,
      // Ensure externalAccounts is properly formatted
      externalAccounts: userData?.externalAccounts || [],
    };
    setUser(transformedUser);
  }, [userData, setUser]);

  useEffect(() => {
    fetch("/api/users/managed-playlists")
      .then((resp) => resp.json())
      .then((data) => setManagedPlaylists([...data]))
      .catch((error) => {
        console.error("Error getting subscriptions:", error.message);
        toast.error(error.message || "Failed to get subscriptions");
      });
  }, [setManagedPlaylists]);

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

  //useEffect(() => {
  // const fetchData = async () => {
  //    if (activeTab === "my-playlists") {
  //      await fetchUserPlaylists();
  //    } else if (activeTab === "top-artists") {
  //      await fetchTopArtistPlaylists();
  //    }
  //  };

  //  fetchData();
  //}, [
  //  activeTab,
  //  topArtistsState.offset,
  //  topArtistsState.loadedAll,
  //  topArtistsState.loading,
  //]);

  const fetchPlaylistTracks = async (playlistID: string) => {
    const res = await fetch(`${playlistEndpoint}/${playlistID}`);
    const data = await res.json();
    setPreviewTracks(data);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const nearBottom = scrollHeight - scrollTop <= clientHeight + 100;

        if (nearBottom) {
          //if (activeTab === "my-playlists" && !userPlaylistsState.loading) {
          //fetchUserPlaylists();
          //} else if (activeTab === "top-artists" && !topArtistsState.loading) {
          //fetchTopArtistPlaylists();
          //}
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
    //userPlaylistsState.loading,
    topArtistsState.loading,
    //userPlaylistsState.offset,
    topArtistsState.offset,
    //userPlaylistsState.loadedAll,
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
            isActive={activeTab === "discover"}
          />
          {showSubscribeModal && (
            <SubscribeModal
              selectedPlaylist={selectedPlaylist}
              setSelectedPlaylist={setSelectedPlaylist}
              setShowSubscribeModal={setShowSubscribeModal}
              setShowPlaylistSettingsModal={setShowPlaylistSettingsModal}
              //userPlaylists={userPlaylistsState.playlists}
              setSubscribeModalFormData={setSubscribeModalFormData}
              subscribeModalFormData={subscribeModalFormData}
            />
          )}
          {showPlaylistSettingseModal && selectedPlaylist && (
            <PlaylistSettingsModal
              setShowPlaylistSettingsModal={setShowPlaylistSettingsModal}
              setSelectedPlaylist={setSelectedPlaylist}
              setShowSubscribeModal={setShowSubscribeModal}
              setSubscribeModalFormData={setSubscribeModalFormData}
              selectedPlaylist={selectedPlaylist}
              mode={subscribeModalFormData ? "create" : "edit"}
              subscribeModalFormData={subscribeModalFormData}
              fromSubscribeModal={!!subscribeModalFormData}
            />
          )}
        </div>
      ) : (
        <Subscriptions
          setSelectedPlaylist={setSelectedPlaylist}
          setShowPlaylistSettingsModal={setShowPlaylistSettingsModal}
          setActiveTab={setActiveTab}
          showPlaylistSettingsModal={showPlaylistSettingseModal}
          selectedPlaylist={selectedPlaylist}
        />
      )}
    </div>
  );
};

export default Dashboard;
