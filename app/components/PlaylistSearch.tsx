"use client";
import React, { useEffect, useState } from "react";
import { ISpotifyPlaylist } from "../../utils/types";
import { SearchBar } from "./SearchBar";
import { Header } from "./Header";
import WebPlayer from "./WebPlayer";
import { PlaylistList } from "./PlaylistList";
import { PreviewTracksBox } from "./PreviewTracksBox";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./NavTabs";

const PlaylistSearch = ({ token }: { token: string }) => {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<ISpotifyPlaylist[]>([]);
  const [previewTracks, setPreviewTracks] = useState<any>([]);
  const [isLongPress, setIsLongPress] = useState(false);
  const [deviceID, setDeviceID] = useState("");
  const [player, setPlayer] = useState(null);
  const [offset, setOffset] = useState<number>(OFFSET);
  const [APIURL, setAPIURL] = useState<string>("/api/spotify/user/playlists");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadedAllData, setLoadedAllData] = useState<boolean>(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<ISpotifyPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>("");

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

  useEffect(() => {
    async function fetchPlaylists() {
      setLoading(true);
      const res = await fetch(APIURL);
      const data = await res.json();
      setPlaylists([...data]);
      setLoading(false);
    }

    if (token) fetchPlaylists();
  }, [token]);

  const fetchData = async () => {
    if (loading || loadedAllData) return;
    setLoading(true);
    const res = await fetch(
      `${APIURL}${APIURL.indexOf("?") >= 0 ? "&" : "?"}offset=${offset}`
    );
    const data: ISpotifyPlaylist[] = await res.json();
    setLoadedAllData(data.length < OFFSET);
    setPlaylists((prevState) => [...prevState, ...data]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchData();
  }, [offset, token]);

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
      setSelectedPlaylists((prev) => [...prev, playlistID]);
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
      setSelectedPlaylists((prev) => prev.filter((id) => id !== playlistID));
    }
  };

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
          {playlists.length && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Search Results
              </h2>
              <p className="text-gray-600 mt-1">
                Click on a playlist to preview tracks or subscribe to
                automatically add songs to your library
              </p>
            </div>
          )}
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
          />
        </>
      )}
      {/* {previewOpen ? (
        <PreviewTracksBox
          previewTracks={previewTracks}
          open={previewOpen}
          setPreviewOpen={setPreviewOpen}
          deviceID={deviceID}
          player={player}
        />
      ) : null} */}
    </>
  );
};

export default PlaylistSearch;
