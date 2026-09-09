"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { PlaylistSummary, MusicProvider } from "@/lib/music/types";
import { SimplePlaylistList } from "./Playlist/SimpleList";
import { Search } from "lucide-react";
import { CategoryFilters } from "./Filters/CategoryFilters";
import { categorySubOptions } from "constants/categories";
import { useAssistantStore } from "store/useAssistantStore";

interface CuratedPlaylistsProps {
  /** Open the subscribe sheet for one or more source playlists (a single `+`
   *  click passes one; batch-select passes several). */
  onSubscribe: (sources: PlaylistSummary[]) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  provider: MusicProvider;
}

export const CuratedPlaylists: React.FC<CuratedPlaylistsProps> = ({
  onSubscribe,
  listRef,
  isActive,
  provider,
}) => {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [activeSubOption, setActiveSubOption] = useState("trending"); // Default sub-option
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadedAll, setLoadedAll] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const openAssistantWithMessage = useAssistantStore(
    (s) => s.openWithMessage,
  );
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [usePagination, setUsePagination] = useState(false); // Always use infinite scroll
  const itemsPerPage = 20;

  // Intersection Observer for dynamic loading
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Synchronous in-flight guard. `loading` is React state, so several fetches
  // fired in the same tick — the two mount effects, the intersection observer,
  // and the scrollbar filler all kick off at once — each read loading as false
  // before any setState flushed, and all four went through. A ref updates
  // immediately, so the first call wins and the rest bail. This is what caused
  // the burst of duplicate requests on entering the tab.
  const inFlightRef = useRef(false);

  // Clear container and reset scroll when filters change
  const clearContainerAndResetScroll = () => {
    setPlaylists([]);
    setOffset(0);
    setCurrentPage(1);
    setLoadedAll(false);
    setError(null);
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
      },
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
    page = 1,
  ) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);

    try {
      const currentOffset = usePagination
        ? (page - 1) * itemsPerPage
        : reset
          ? 0
          : offset;

      const res = await fetch(
        `/api/music/search?provider=${provider}&q=${encodeURIComponent(
          searchQuery,
        )}&limit=${itemsPerPage}`,
      );
      if (!res.ok) throw new Error("Failed to fetch search results");

      const { playlists: data } = (await res.json()) as {
        playlists: PlaylistSummary[];
      };
      const originalDataLength = data.length;

      if (usePagination) {
        setPlaylists(data);
        setCurrentPage(page);
        // For pagination, if we get fewer items than requested, we're likely at the end
        setTotalPages(
          Math.max(1, Math.ceil(originalDataLength / itemsPerPage) + 1),
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
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const fetchCuratedPlaylists = async (
    category: string,
    subOption: string,
    reset = false,
    page = 1,
  ) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

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
        `/api/music/curated?provider=${provider}&category=${apiCategory}`,
      );
      if (!res.ok) {
        let message = "Unable to load curated playlists.";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {}
        setError(message);
        setLoadedAll(true);
        return;
      }

      const { playlists: data } = (await res.json()) as {
        playlists: PlaylistSummary[];
      };
      const originalDataLength = data.length;

      if (usePagination) {
        // Pagination mode
        setPlaylists(data);
        setCurrentPage(page);
        // For pagination, if we get fewer items than requested, we're likely at the end
        setTotalPages(
          Math.max(1, Math.ceil(originalDataLength / itemsPerPage) + 1),
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
      setError("Unable to load curated playlists.");
      setLoadedAll(true);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  // One effect owns the category load. There used to be two — one keyed on the
  // category, one on `isActive` — and both fired on mount, doing the same thing.
  // Merged and gated on isActive so it loads once when the tab is shown and again
  // whenever the category changes, not twice on entry.
  useEffect(() => {
    if (!isActive || isSearchMode) return;

    clearContainerAndResetScroll();
    fetchCuratedPlaylists(
      activeCategory,
      activeSubOption,
      true,
      usePagination ? 1 : undefined,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, activeCategory, activeSubOption, usePagination, isSearchMode]);

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Search — a plain text filter for the grid below. "Ask the fox" hands
          whatever's typed to the assistant panel instead of discarding it. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = searchQuery.trim();
          if (q) setSearchText(q);
        }}
        className="flex items-center gap-2 rounded-full border border-line-strong bg-surface py-2 pl-4 pr-2"
      >
        <Search className="h-4 w-4 shrink-0 text-ink-25" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search playlists — or describe a vibe"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-ink placeholder:text-ink-50 focus:outline-none"
        />
        {searchText && (
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setSearchQuery("");
              setIsSearchMode(false);
            }}
            aria-label="Clear search"
            className="px-1 text-ink-35 hover:text-ink-70"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => openAssistantWithMessage(searchQuery)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand-tint px-3.5 py-2 text-[13px] font-medium text-brand-deep transition-colors hover:bg-brand-tint-soft"
        >
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-surface">
            <Image
              src="/logo.png"
              alt=""
              width={22}
              height={22}
              className="h-[22px] w-[22px] object-cover"
            />
          </span>
          Ask the fox
        </button>
      </form>

      {/* Category filters — inline chips, no modal. */}
      <CategoryFilters
        isSearchMode={isSearchMode}
        activeCategory={activeCategory}
        activeSubOption={activeSubOption}
        handleCategoryChange={handleCategoryChange}
        handleSubOptionChange={handleSubOptionChange}
      />

      {/* Grid */}
      <div className="flex min-h-0 grow flex-col overflow-hidden">
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar scrollbar-visible pr-1"
          ref={listRef}
        >
          <SimplePlaylistList playlists={playlists} onSubscribe={onSubscribe} />

          {loading && playlists.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          )}

          {!loadedAll && (
            <div
              ref={sentinelRef}
              className="flex h-10 items-center justify-center"
            />
          )}

          {loadedAll && playlists.length > 0 && (
            <p className="py-6 text-center text-[13px] text-ink-35">
              No more playlists to load
            </p>
          )}

          {error && (
            <p className="py-6 text-center text-[13px] text-warn-text">
              {error}
            </p>
          )}

          {!loading && !playlists.length && !error && (
            <div className="mx-auto my-10 max-w-md rounded-2xl border border-dashed border-line-strong p-8 text-center">
              {searchText ? (
                <>
                  <p className="text-[13.5px] text-ink-70">
                    Nothing came back for{" "}
                    <span className="font-medium text-ink">
                      &ldquo;{searchText}&rdquo;
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => openAssistantWithMessage(searchText)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-tint px-4 py-2 text-[13px] font-medium text-brand-deep transition-colors hover:bg-brand-tint-soft"
                  >
                    Ask the fox instead
                  </button>
                </>
              ) : (
                <p className="text-[13.5px] text-ink-50">
                  No playlists in this category right now.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
