"use client";
import React, { useEffect, useRef, useState } from "react";
import { ISpotifyPlaylist } from "../../utils/types";
import { SearchBar } from "./SearchBar";
import { Header } from "./Header";
import WebPlayer from "./WebPlayer";
import { PlaylistList } from "./PlaylistList";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./NavTabs";

const userPlaylistsEndpoint = "/api/spotify/user/playlists";

const PlaylistSearch = ({ token }: { token: string }) => {
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
  const [userPlaylists, setUserPlaylists] = useState<ISpotifyPlaylist[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  const [userOffset, setUserOffset] = useState(0);
  const [userLoading, setUserLoading] = useState(false);
  const [userLoadedAll, setUserLoadedAll] = useState(false);

  const [searchOffset, setSearchOffset] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadedAll, setSearchLoadedAll] = useState(false);

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
    console.log(searchLoading, searchLoadedAll, APIURL);
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
      setUserPlaylists((prev) => [...prev, ...data]);
      setPlaylists((prev) => [...prev, ...data]);
      setUserLoadedAll(data.length < OFFSET);
      setUserOffset((prev) => prev + OFFSET);
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

  const handleSubscribe = async (playlistID: string) => {
    const res = await fetch(`/api/spotify/subscribe/${playlistID}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      // setSelectedPlaylists((prev) => [...prev, playlistID]);
    }
  };

  const handleUnsubscribe = async (playlistID: string) => {
    const res = await fetch(`/api/spotify/unsubscribe/${playlistID}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (data.success) {
      // setSelectedPlaylists((prev) => prev.filter((id) => id !== playlistID));
    }
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

  return (
    <>
      {/* <WebPlayer
        token={token}
        setDeviceID={setDeviceID}
        player={player}
        setPlayer={setPlayer}
      /> */}
      <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "discover" && (
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
            handleSubscribe={handleSubscribe}
            handleUnsubscribe={handleUnsubscribe}
            previewTracks={previewTracks}
            setPreviewTracks={setPreviewTracks}
            testingRef={listRef}
          />
        </>
      )}
    </>
  );
};

export default PlaylistSearch;
