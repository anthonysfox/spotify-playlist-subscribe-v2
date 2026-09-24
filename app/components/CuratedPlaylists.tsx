"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PlaylistSummary, MusicProvider } from "@/lib/music/types";
import { SimplePlaylistList } from "./Playlist/SimpleList";
import { Search } from "lucide-react";
import { CategoryFilters } from "./Filters/CategoryFilters";
import { categorySubOptions } from "constants/categories";
import { useAssistantStore } from "store/useAssistantStore";

const PAGE = 24;

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
  const [activeSubOption, setActiveSubOption] = useState("trending");
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState(""); // committed query
  const [searchQuery, setSearchQuery] = useState(""); // input value
  const [isSearchMode, setIsSearchMode] = useState(false);

  const openAssistantWithMessage = useAssistantStore((s) => s.openWithMessage);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Refs, not state: the observer callback and back-to-back loads read these
  // synchronously, so a stale closure can't fire a duplicate page or the wrong
  // mode. `mode.search` null = curated browse; a string = that search.
  const inFlightRef = useRef(false);
  const offsetRef = useRef(0);
  const modeRef = useRef<{ search: string | null }>({ search: null });

  const loadMore = useCallback(
    async (reset: boolean) => {
      if (inFlightRef.current) return;
      if (!reset && loadedAll) return;

      inFlightRef.current = true;
      setLoading(true);
      if (reset) {
        setError(null);
        setPlaylists([]);
        setLoadedAll(false);
        offsetRef.current = 0;
        if (listRef.current) listRef.current.scrollTop = 0;
      }
      const offset = reset ? 0 : offsetRef.current;
      const { search } = modeRef.current;

      try {
        let page: PlaylistSummary[] = [];
        let more = false;

        if (search != null) {
          const res = await fetch(
            `/api/music/search?provider=${provider}&q=${encodeURIComponent(
              search,
            )}&limit=${PAGE}&offset=${offset}`,
          );
          if (!res.ok) throw new Error("search failed");
          const json = await res.json();
          page = (json.playlists ?? []) as PlaylistSummary[];
          // Providers null-pad short pages, so trust the server's signal, not
          // the filtered length.
          more = Boolean(json.hasMore);
        } else {
          const res = await fetch(
            `/api/music/curated?provider=${provider}&category=${activeSubOption}&offset=${offset}`,
          );
          if (!res.ok) {
            let msg = "Unable to load playlists.";
            try {
              const p = await res.json();
              if (p?.error) msg = p.error;
            } catch {}
            setError(msg);
            setLoadedAll(true);
            return;
          }
          const json = await res.json();
          page = (json.playlists ?? []) as PlaylistSummary[];
          more = Boolean(json.hasMore);
        }

        setPlaylists((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((p) => p.id));
          return [...base, ...page.filter((p) => p && !seen.has(p.id))];
        });
        offsetRef.current = offset + PAGE;
        setLoadedAll(!more || page.length === 0);
      } catch {
        setError("Unable to load playlists.");
        setLoadedAll(true);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [provider, activeSubOption, loadedAll, listRef],
  );

  // Curated browse: (re)load when the tab opens or the category changes.
  useEffect(() => {
    if (!isActive || isSearchMode) return;
    modeRef.current = { search: null };
    setLoadedAll(false);
    loadMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, activeCategory, activeSubOption, isSearchMode]);

  // Debounced search.
  useEffect(() => {
    const q = searchText.trim();
    if (!q) {
      setIsSearchMode(false);
      return;
    }
    const t = setTimeout(() => {
      setIsSearchMode(true);
      modeRef.current = { search: q };
      setLoadedAll(false);
      loadMore(true);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Infinite scroll — observe the scroll container (root), not the viewport,
  // or the sentinel is clipped and never intersects.
  useEffect(() => {
    if (loadedAll) return;
    const sentinel = sentinelRef.current;
    const root = listRef.current;
    if (!sentinel) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inFlightRef.current) loadMore(false);
      },
      { root: root ?? null, rootMargin: "600px", threshold: 0 },
    );
    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [loadedAll, playlists.length, loadMore, listRef]);

  const handleCategoryChange = (category: string) => {
    if (isSearchMode) return;
    setActiveCategory(category);
    const first =
      categorySubOptions[category as keyof typeof categorySubOptions]?.[0]?.id;
    if (first) setActiveSubOption(first);
  };

  const handleSubOptionChange = (subOption: string) => {
    if (isSearchMode) return;
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
        className="border-line-strong bg-surface flex items-center gap-2 rounded-full border py-2 pr-2 pl-4"
      >
        <Search className="text-ink-25 h-4 w-4 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search playlists — or describe a vibe"
          className="text-ink placeholder:text-ink-50 min-w-0 flex-1 bg-transparent py-1.5 text-[14px] focus:outline-none"
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
            className="text-ink-35 hover:text-ink-70 px-1"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => openAssistantWithMessage(searchQuery)}
          className="border-brand/25 bg-brand-tint text-brand-deep hover:bg-brand-tint-soft flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors"
        >
          <span className="bg-surface flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
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
          className="custom-scrollbar scrollbar-visible min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
          ref={listRef}
        >
          {/* Full-area load: a filter change or new search clears the grid, so
              show a skeleton rather than a blank pane. */}
          {loading && playlists.length === 0 ? (
            <div
              className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              aria-busy="true"
              aria-label="Loading playlists"
            >
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex animate-pulse flex-col gap-2">
                  <div className="art-placeholder aspect-square w-full rounded-xl" />
                  <div className="bg-ground-chip h-3 w-3/4 rounded" />
                  <div className="bg-ground-alt h-2.5 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <SimplePlaylistList
              playlists={playlists}
              onSubscribe={onSubscribe}
            />
          )}

          {loading && playlists.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="border-brand h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}

          {!loadedAll && (
            <div
              ref={sentinelRef}
              className="flex h-10 items-center justify-center"
            />
          )}

          {loadedAll && playlists.length > 0 && (
            <p className="text-ink-35 py-6 text-center text-[13px]">
              That&apos;s everything
            </p>
          )}

          {error && (
            <p className="text-warn-text py-6 text-center text-[13px]">
              {error}
            </p>
          )}

          {!loading && !playlists.length && !error && (
            <div className="border-line-strong mx-auto my-10 max-w-md rounded-2xl border border-dashed p-8 text-center">
              {searchText ? (
                <>
                  <p className="text-ink-70 text-[13.5px]">
                    Nothing came back for{" "}
                    <span className="text-ink font-medium">
                      &ldquo;{searchText}&rdquo;
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() => openAssistantWithMessage(searchText)}
                    className="border-brand/25 bg-brand-tint text-brand-deep hover:bg-brand-tint-soft mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors"
                  >
                    Ask the fox instead
                  </button>
                </>
              ) : (
                <p className="text-ink-50 text-[13.5px]">
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
