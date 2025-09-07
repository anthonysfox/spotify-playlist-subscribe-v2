"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { FilterModal } from "./Modals/FilterModal";
import { categorySubOptions, frontendCategories } from "constants/categories";

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

  // Intersection Observer for dynamic loading
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  // Check if we need more playlists to fill the container
  const ensureScrollbar = useCallback(() => {
    if (!listRef.current || loading || loadedAll) return;

    const container = listRef.current;
    const needsMoreContent = container.scrollHeight <= container.clientHeight;

    if (
      needsMoreContent &&
      playlists.length > 0 &&
      playlists.length % itemsPerPage === 0
    ) {
      // Load more content
      if (isSearchMode) {
        fetchSearchPlaylists(searchText);
      } else {
        fetchCuratedPlaylists(activeCategory, activeSubOption);
      }
    }
  }, [
    loading,
    loadedAll,
    playlists.length,
    isSearchMode,
    searchText,
    activeCategory,
    activeSubOption,
  ]);

  // Setup Intersection Observer for auto-loading
  useEffect(() => {
    if (!sentinelRef.current) return;

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && !loadedAll) {
          if (isSearchMode) {
            fetchSearchPlaylists(searchText);
          } else {
            fetchCuratedPlaylists(activeCategory, activeSubOption);
          }
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Load slightly before reaching the sentinel
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    loading,
    loadedAll,
    isSearchMode,
    searchText,
    activeCategory,
    activeSubOption,
  ]);

  // Check for scrollbar after playlists change
  useEffect(() => {
    const timeoutId = setTimeout(ensureScrollbar, 100);
    return () => clearTimeout(timeoutId);
  }, [playlists, ensureScrollbar]);

  // Handle search text changes with debouncing
  useEffect(() => {
    // Have this so if there is no search text, it stops here instead of proceeding
    if (!searchText?.trim()) {
      setIsSearchMode(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsSearchMode(true);
      clearContainerAndResetScroll();
      fetchSearchPlaylists(searchText.trim(), true, 1);
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

  // Remove the old scroll handler since we're using Intersection Observer now

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

      {/* Filter Button */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => setShowFilters(true)}
          className="px-6 py-3 rounded-xl font-semibold transition-all bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-white"
          >
            <path
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              d="M3 6h18M7 12h10M10 18h4"
            />
          </svg>
          <div className="flex flex-col items-start">
            <span className="text-xs text-green-100">Filter</span>
            <span className="text-sm font-bold">
              {(() => {
                const categoryName =
                  frontendCategories.find((cat) => cat.id === activeCategory)
                    ?.name || activeCategory;
                const subOptionName =
                  categorySubOptions[
                    activeCategory as keyof typeof categorySubOptions
                  ]?.find((sub) => sub.id === activeSubOption)?.name ||
                  activeSubOption;
                return `${categoryName} • ${subOptionName}`;
              })()}
            </span>
          </div>
        </button>
      </div>

      {/* Playlists */}
      <div className="grow overflow-hidden min-h-0 flex flex-col">
        <PlaylistList
          playlists={playlists}
          deviceID={deviceID}
          player={player}
          setSelectedPlaylist={setSelectedPlaylist}
          loading={loading}
          loadedAllData={loadedAll}
          previewTracks={previewTracks}
          setPreviewTracks={setPreviewTracks}
          testingRef={listRef}
          setShowSubscribeModal={setShowSubscribeModal}
          sentinelRef={sentinelRef}
        />
      </div>

      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        handleCategoryChange={handleCategoryChange}
        handleSubOptionChange={handleSubOptionChange}
        isSearchMode={isSearchMode}
        activeCategory={activeCategory}
        activeSubOption={activeSubOption}
      />
    </div>
  );
};