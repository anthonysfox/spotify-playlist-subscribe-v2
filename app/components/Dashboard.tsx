"use client";
import React, { useState, useEffect, useRef } from "react";
import { ITopArtistState } from "utils/types";
import { CuratedPlaylists } from "./CuratedPlaylists";
import { OFFSET } from "utils/constants";
import { NavTabs } from "./Navigation/NavTabs";
import { SubscribeModal, SubscribeReqBody } from "./Modals/SubscribeModal";
import { PlaylistSettingsModal } from "./Modals/SettingsModal";
import type { ManagedPlaylistWithSubscriptions } from "store/useUserStore";
import type { PlaylistSummary } from "@/lib/music/types";
import {
  useMusicConnections,
  PROVIDER_LABELS,
} from "../hooks/useMusicConnections";

/**
 * What `selectedPlaylist` can actually hold.
 *
 * One piece of state serves two flows: a Spotify playlist while subscribing, and
 * a managed playlist when opening its settings from the Subscriptions tab. It
 * was typed as only the former, so the latter assignment was a lie the compiler
 * couldn't see.
 */
export type SelectablePlaylist =
  | PlaylistSummary
  | ManagedPlaylistWithSubscriptions;

/**
 * Narrow the union to a browsable playlist (a search/curated result), as opposed
 * to one of the user's own managed playlists.
 *
 * `externalPlaylistId` only exists on the managed (database) shape, so it's a
 * reliable discriminator — and this keeps the subscribe flow honest rather than
 * casting and hoping.
 */
export function isPlaylistSummary(
  playlist: SelectablePlaylist | null,
): playlist is PlaylistSummary {
  return !!playlist && !("externalPlaylistId" in playlist);
}
import { useUserStore } from "store/useUserStore";
import { Subscriptions } from "./Playlist/Subscriptions";
import toast from "react-hot-toast";

const playlistEndpoint = "/api/spotify/playlists";

const Dashboard = ({ userData }: { userData: any }) => {
  const setUser = useUserStore((state) => state.setUser);
  const setManagedPlaylists = useUserStore(
    (state) => state.setManagedPlaylists,
  );
  const [token, setToken] = useState<string>("");
  const [previewTracks, setPreviewTracks] = useState<any>([]);
  // Which services this user actually has, and which one discover is browsing.
  const { connected, hasNone, activeProvider, setActiveProvider } =
    useMusicConnections();

  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SelectablePlaylist | null>(null);
  const [activeTab, setActiveTab] = useState("discover");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>("");
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showPlaylistSettingseModal, setShowPlaylistSettingsModal] =
    useState(false);
  const [topArtists, setTopArtists] = useState<any>([]);
  const [subscribeModalFormData, setSubscribeModalFormData] =
    useState<SubscribeReqBody | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasEnsuredTimezone = useRef(false);

  // Fetch the Spotify token from the API
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/spotify/token");
        if (response.ok) {
          const data = await response.json();
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

  // useEffect(() => {
  //   if (hasEnsuredTimezone.current) return;
  //   hasEnsuredTimezone.current = true;

  //   const ensureTimezone = async () => {
  //     const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  //     if (!timeZone) return;

  //     try {
  //       const response = await fetch("/api/users/me");
  //       if (!response.ok) return;
  //       const data = await response.json();
  //       if (data?.data?.user?.timezone) return;

  //       await fetch("/api/users/me", {
  //         method: "PATCH",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ timezone: timeZone }),
  //       });
  //     } catch (error) {
  //       console.error("Failed to ensure timezone:", error);
  //     }
  //   };

  //   ensureTimezone();
  // }, []);

  useEffect(() => {
    fetch("/api/users/me/managed-playlists")
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
            artist,
          )}&offset=${topArtistsState.offset}`,
        ).then((res) => res.json()),
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
          {/*
            Someone can now sign up with Apple and never connect Spotify, so the
            discover tab can no longer assume a service exists. Show what they
            actually have — and if that's nothing, say so instead of rendering an
            empty grid that looks broken.
          */}
          {hasNone ? (
            <div className="flex flex-col items-center justify-center grow text-center p-8">
              <h2 className="text-lg font-medium text-gray-800 mb-1">
                No music service connected
              </h2>
              <p className="text-gray-600 mb-4">
                Connect Spotify or Apple Music to start subscribing to playlists.
              </p>
              <a
                href="/profile"
                className="px-4 py-2 bg-[#CC5500] text-white rounded hover:bg-[#B04A00] transition-colors"
              >
                Connect a service
              </a>
            </div>
          ) : (
            <>
              {connected.length > 1 && activeProvider && (
                <div className="flex gap-1 px-4 pt-3">
                  {connected.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setActiveProvider(option)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                        activeProvider === option
                          ? "bg-[#CC5500] text-white"
                          : "text-gray-600 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {PROVIDER_LABELS[option]}
                    </button>
                  ))}
                </div>
              )}

              {activeProvider && (
                <CuratedPlaylists
                  // Remount on provider change so cached results from the other
                  // service can't leak into the list.
                  key={activeProvider}
                  provider={activeProvider}
                  setSelectedPlaylist={setSelectedPlaylist}
                  setShowSubscribeModal={setShowSubscribeModal}
                  setExpandedPlaylist={setExpandedPlaylist}
                  expandedPlaylist={expandedPlaylist}
                  previewTracks={previewTracks}
                  setPreviewTracks={setPreviewTracks}
                  listRef={listRef}
                  isActive={activeTab === "discover"}
                />
              )}
            </>
          )}

          {showSubscribeModal && isPlaylistSummary(selectedPlaylist) && (
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
