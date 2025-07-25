"use client";
import React, { useState, useEffect } from "react";
import { ISpotifyPlaylist } from "utils/types";
import { PlaylistList } from "./Playlist/List";
import { SearchBar } from "./Navigation/SearchBar";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import { CategoryFilters } from "./Filters/CategoryFilters";
import { categorySubOptions } from "constants/categories";

interface CuratedPlaylistsProps {
  setSelectedPlaylist: React.Dispatch<
    React.SetStateAction<ISpotifyPlaylist | null>
  >;
  setShowSubscribeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setExpandedPlaylist: React.Dispatch<React.SetStateAction<string | null>>;
  expandedPlaylist: string | null;
  previewTracks: any;
  setPreviewTracks: React.Dispatch<React.SetStateAction<any>>;
  listRef: React.RefObject<HTMLDivElement>;
  player: any;
  deviceID: string;
}

export const CuratedPlaylists: React.FC<CuratedPlaylistsProps> = ({
  setSelectedPlaylist,
  setShowSubscribeModal,
  setExpandedPlaylist,
  expandedPlaylist,
  previewTracks,
  setPreviewTracks,
  listRef,
  player,
  deviceID,
}) => {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [activeSubOption, setActiveSubOption] = useState("trending"); // Default sub-option
  const [playlists, setPlaylists] = useState<ISpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadedAll, setLoadedAll] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usePagination, setUsePagination] = useState(false); // Always use infinite scroll
  const itemsPerPage = 20;

  // Clear container and reset scroll when filters change
  const clearContainerAndResetScroll = () => {
    setPlaylists([]);
    setOffset(0);
    setCurrentPage(1);
    setLoadedAll(false);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  // Handle search text changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        setIsSearchMode(true);
        clearContainerAndResetScroll();
        fetchSearchPlaylists(searchText, true, 1);
      } else {
        setIsSearchMode(false);
        clearContainerAndResetScroll();
        // Reset to curated playlists
        if (usePagination) {
          fetchCuratedPlaylists(activeCategory, activeSubOption, true, 1);
        } else {
          fetchCuratedPlaylists(activeCategory, activeSubOption, true);
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const fetchSearchPlaylists = async (
    searchQuery: string,
    reset = false,
    page = 1
  ) => {
    if (loading) return;

    setLoading(true);

    try {
      const currentOffset = usePagination
        ? (page - 1) * itemsPerPage
        : reset
        ? 0
        : offset;

      const res = await fetch(
        `/api/spotify/search?searchText=${encodeURIComponent(
          searchQuery
        )}&offset=${currentOffset}`
      );
      if (!res.ok) throw new Error("Failed to fetch search results");

      const data: ISpotifyPlaylist[] = await res.json();
      const originalDataLength = data.length;

      if (usePagination) {
        setPlaylists(data);
        setCurrentPage(page);
        // For pagination, if we get fewer items than requested, we're likely at the end
        setTotalPages(
          Math.max(1, Math.ceil(originalDataLength / itemsPerPage) + 1)
        );
      } else {
        if (reset) {
          setPlaylists(data);
          setOffset(itemsPerPage);
        } else {
          setPlaylists((prev) => [...prev, ...data]);
          setOffset((prev) => prev + itemsPerPage);
        }
        // For infinite scroll, stop if we get no results or very few results
        setLoadedAll(originalDataLength === 0 || originalDataLength < 5);
      }
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCuratedPlaylists = async (
    category: string,
    subOption: string,
    reset = false,
    page = 1
  ) => {
    if (loading) return;

    setLoading(true);

    try {
      // Calculate offset based on pagination or infinite scroll
      const currentOffset = usePagination
        ? (page - 1) * itemsPerPage
        : reset
        ? 0
        : offset;

      // Use the sub-option as the category for the API call
      const apiCategory = subOption;

      const res = await fetch(
        `/api/spotify/curated-playlists?category=${apiCategory}&offset=${currentOffset}`
      );
      if (!res.ok) throw new Error("Failed to fetch playlists");

      const data: ISpotifyPlaylist[] = await res.json();
      const originalDataLength = data.length;

      if (usePagination) {
        // Pagination mode
        setPlaylists(data);
        setCurrentPage(page);
        // For pagination, if we get fewer items than requested, we're likely at the end
        setTotalPages(
          Math.max(1, Math.ceil(originalDataLength / itemsPerPage) + 1)
        );
      } else {
        // Infinite scroll mode
        if (reset) {
          setPlaylists(data);
          setOffset(itemsPerPage);
        } else {
          setPlaylists((prev) => [...prev, ...data]);
          setOffset((prev) => prev + itemsPerPage);
        }
        // For infinite scroll, stop if we get no results or very few results
        setLoadedAll(originalDataLength === 0 || originalDataLength < 5);
      }
    } catch (error) {
      console.error("Error fetching curated playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchMode) {
      clearContainerAndResetScroll();
      if (usePagination) {
        fetchCuratedPlaylists(activeCategory, activeSubOption, true, 1);
      } else {
        fetchCuratedPlaylists(activeCategory, activeSubOption, true);
      }
    }
  }, [activeCategory, activeSubOption, usePagination, isSearchMode]);

  const handleCategoryChange = (category: string) => {
    if (isSearchMode) return; // Don't change category in search mode
    setActiveCategory(category);

    const defaultSubOption =
      categorySubOptions[category as keyof typeof categorySubOptions]?.[0]?.id;
    if (defaultSubOption) {
      setActiveSubOption(defaultSubOption);
    }
  };

  const handleSubOptionChange = (subOption: string) => {
    if (isSearchMode) return; // Don't change sub-option in search mode
    setActiveSubOption(subOption);
  };

  const handleScroll = () => {
    if (listRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      const nearBottom = scrollHeight - scrollTop <= clientHeight + 100;

      if (nearBottom && !loading && !loadedAll) {
        if (isSearchMode) {
          fetchSearchPlaylists(searchText);
        } else {
          fetchCuratedPlaylists(activeCategory, activeSubOption);
        }
      }
    }
  };

  useEffect(() => {
    const currentRef = listRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, [
    loading,
    loadedAll,
    activeCategory,
    activeSubOption,
    isSearchMode,
    searchText,
  ]);

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative">
        <SearchBar value={searchText} onChange={setSearchText} />
        {searchText && (
          <button
            onClick={() => {
              setSearchText("");
              setIsSearchMode(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main Category Tabs - Only show when not in search mode */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 rounded-full font-medium transition-colors bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50"
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {showFilters && (
        <CategoryFilters
          handleCategoryChange={handleCategoryChange}
          handleSubOptionChange={handleSubOptionChange}
          isSearchMode={isSearchMode}
          activeCategory={activeCategory}
          activeSubOption={activeSubOption}
        />
      )}

      {/* Playlists */}
      <div className="grow overflow-hidden min-h-0 flex flex-col">
        <PlaylistList
          playlists={playlists}
          setIsLongPress={() => {}}
          isLongPress={false}
          deviceID={deviceID}
          player={player}
          setSelectedPlaylist={setSelectedPlaylist}
          loading={loading}
          loadedAllData={loadedAll}
          offset={offset}
          setOffset={setOffset}
          expandedPlaylist={expandedPlaylist}
          setExpandedPlaylist={setExpandedPlaylist}
          handleUnsubscribe={() => {}}
          previewTracks={previewTracks}
          setPreviewTracks={setPreviewTracks}
          testingRef={listRef}
          setShowSubscribeModal={setShowSubscribeModal}
        />
      </div>
    </div>
  );
};
