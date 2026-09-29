"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore } from "store/useUserStore";
import { PROVIDER_LABELS } from "store/useMusicStore";
import type { MusicProvider } from "@/lib/music/types";
import { SubscriptionSkeleton } from "../Skeletons/SubscriptionSkeleton";
import { formatRelativeTime } from "utils/formatRelativeTime";
import { SubscriptionRow } from "./SubscriptionRow";

type ProviderFilter = "ALL" | MusicProvider;
type SortKey = "nextSync" | "name" | "lastSynced" | "sourceCount";

const SORT_LABELS: Record<SortKey, string> = {
  nextSync: "Next sync",
  name: "Name",
  lastSynced: "Last synced",
  sourceCount: "Source count",
};

export const Subscriptions = () => {
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);
  const isLoading = useUserStore((s) => s.isLoading);
  const setIsLoading = useUserStore((s) => s.setLoading);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [playlistsBeingSynced, setPlaylistsBeingSynced] = useState<Set<string>>(
    new Set(),
  );
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("nextSync");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    // AppFrame already seeded the store server-side. Only show the skeleton
    // when there's genuinely nothing (a hard load with a cold store); otherwise
    // revalidate quietly in the background so the list never flashes empty.
    const cold = managedPlaylists.length === 0;
    if (cold) setIsLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/users/me/managed-playlists`);
        if (res.ok) setManagedPlaylists(await res.json());
      } finally {
        if (cold) setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestSync = async (playlistId?: string) => {
    const playlistString = playlistId
      ? `?playlistId=${encodeURIComponent(playlistId)}`
      : "";
    const res = await fetch(`/api/users/me/sync${playlistString}`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || data?.error || "Sync failed");
    }
    toast.success(
      data?.message || "Sync started. Playlists will update shortly.",
    );
  };

  const handleSyncAll = async () => {
    if (isSyncingAll || playlistsBeingSynced.size > 0) return;
    setIsSyncingAll(true);
    try {
      await requestSync();
    } catch (e: any) {
      toast.error(e?.message || "Failed to start sync");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncOne = async (playlistId: string) => {
    if (isSyncingAll || playlistsBeingSynced.has(playlistId)) return;
    setPlaylistsBeingSynced((ids) => new Set(ids).add(playlistId));

    try {
      await requestSync(playlistId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start sync");
    } finally {
      setPlaylistsBeingSynced((prev) => {
        const next = new Set(prev);
        next.delete(playlistId);
        return next;
      });
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalSources = useMemo(
    () => managedPlaylists.reduce((n, p) => n + p.subscriptions.length, 0),
    [managedPlaylists],
  );

  const soonestNextSync = useMemo(() => {
    const times = managedPlaylists
      .map((p) => p.nextSyncTime)
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => new Date(t).getTime())
      .filter((t) => !Number.isNaN(t));
    if (!times.length) return null;
    return formatRelativeTime(new Date(Math.min(...times)));
  }, [managedPlaylists]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = managedPlaylists.filter((p) => {
      if (providerFilter !== "ALL" && p.provider !== providerFilter)
        return false;
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      return p.subscriptions.some((s) =>
        s.sourcePlaylist.name.toLowerCase().includes(q),
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "sourceCount":
          return b.subscriptions.length - a.subscriptions.length;
        case "lastSynced": {
          const av = a.lastSyncCompletedAt
            ? new Date(a.lastSyncCompletedAt).getTime()
            : 0;
          const bv = b.lastSyncCompletedAt
            ? new Date(b.lastSyncCompletedAt).getTime()
            : 0;
          return bv - av;
        }
        case "nextSync":
        default: {
          const av = a.nextSyncTime
            ? new Date(a.nextSyncTime).getTime()
            : Infinity;
          const bv = b.nextSyncTime
            ? new Date(b.nextSyncTime).getTime()
            : Infinity;
          return av - bv;
        }
      }
    });
    return list;
  }, [managedPlaylists, query, providerFilter, sortKey]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
        <SubscriptionSkeleton />
      </div>
    );
  }

  const isEmpty = managedPlaylists.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-ink text-[24px] font-semibold tracking-[-0.02em]">
            Library
          </h1>
          <p className="text-ink-50 mt-0.5 text-[12.5px]">
            {managedPlaylists.length} managed playlist
            {managedPlaylists.length === 1 ? "" : "s"} · {totalSources} source
            {totalSources === 1 ? "" : "s"}
            {soonestNextSync ? ` · next sync ${soonestNextSync}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSyncAll()}
            disabled={isSyncingAll || playlistsBeingSynced.size > 0}
            className="border-line-strong text-ink-70 hover:border-brand/40 hover:text-brand rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncingAll || playlistsBeingSynced.size > 0
              ? "Syncing…"
              : "Sync all"}
          </button>
          <Link
            href="/"
            className="bg-brand text-surface hover:bg-brand-deep rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors"
          >
            New playlist
          </Link>
        </div>
      </div>

      {!isEmpty && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search playlists and sources"
            className="border-line-strong bg-surface text-ink placeholder:text-ink-50 focus:border-brand/40 min-w-[180px] flex-1 rounded-full border px-4 py-2 text-[13px] focus:outline-none"
          />

          <div className="bg-ground-chip flex rounded-full p-0.5">
            {(["ALL", "SPOTIFY", "APPLE_MUSIC"] as ProviderFilter[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProviderFilter(p)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    providerFilter === p
                      ? "bg-ink text-surface"
                      : "text-ink-50 hover:text-ink-70"
                  }`}
                >
                  {p === "ALL" ? "All" : PROVIDER_LABELS[p as MusicProvider]}
                </button>
              ),
            )}
          </div>

          <label className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="border-line-strong bg-surface text-ink-70 appearance-none rounded-full border px-3 py-1.5 pr-7 text-[12px] font-medium focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            <ChevronDown className="text-ink-35 pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2" />
          </label>

          {expanded.size > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(new Set())}
              className="text-ink-50 hover:text-ink-70 text-[12px] font-medium"
            >
              Collapse all
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="min-h-0 grow overflow-y-auto">
        {isEmpty ? (
          <div className="border-line-strong flex h-full flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
            <span className="bg-surface mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
              <img src="/logo.png" alt="" className="h-16 w-16 object-cover" />
            </span>
            <p className="font-display text-ink text-[17px] font-semibold">
              No managed playlists yet
            </p>
            <p className="text-ink-50 mt-1 max-w-[38ch] text-[13px] leading-relaxed">
              Subscribe to a source playlist from Discover and it becomes a
              managed playlist that keeps itself fresh.
            </p>
            <Link
              href="/"
              className="bg-brand text-surface hover:bg-brand-deep mt-5 rounded-full px-5 py-2.5 text-[13px] font-medium transition-colors"
            >
              Browse Discover
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-ink-50 py-10 text-center text-[13px]">
            No playlists match “{query}”.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((playlist) => (
              <SubscriptionRow
                key={playlist.id}
                playlist={playlist}
                isOpen={expanded.has(playlist.id)}
                onToggle={() => toggleExpanded(playlist.id)}
                isSyncing={
                  isSyncingAll || playlistsBeingSynced.has(playlist.id)
                }
                syncDisabled={
                  isSyncingAll || playlistsBeingSynced.has(playlist.id)
                }
                onSync={() => handleSyncOne(playlist.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
