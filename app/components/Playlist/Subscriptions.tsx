"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Settings,
  ChevronDown,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore, pendingRemovalKey } from "store/useUserStore";
import { PROVIDER_LABELS } from "store/useMusicStore";
import type { ManagedPlaylistWithSubscriptions } from "@/types";
import type { MusicProvider } from "@/lib/music/types";
import { SubscriptionSkeleton } from "../Skeletons/SubscriptionSkeleton";
import { formatRelativeTime } from "utils/formatRelativeTime";

type ProviderFilter = "ALL" | MusicProvider;
type SortKey = "nextSync" | "name" | "lastSynced" | "sourceCount";

const PROVIDER_DOT: Record<MusicProvider, string> = {
  SPOTIFY: "bg-spotify",
  APPLE_MUSIC: "bg-apple",
};

const SORT_LABELS: Record<SortKey, string> = {
  nextSync: "Next sync",
  name: "Name",
  lastSynced: "Last synced",
  sourceCount: "Source count",
};

/** Cover art, or the diagonal-stripe placeholder for a playlist with no
 *  artwork yet (a brand-new Apple Music playlist has none until it has tracks). */
function CoverArt({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className: string;
}) {
  if (src) return <img src={src} alt={alt} className={`${className} object-cover`} />;
  return <div className={`${className} art-placeholder`} aria-label={alt} />;
}

const SKIP_HINT: Record<string, string> = {
  PROVIDER_NOT_CONNECTED: "Reconnect your music service",
  REPLACE_UNSUPPORTED: "Replace mode isn't supported here",
  NO_SUBSCRIPTIONS: "No sources yet",
};

/**
 * Sync status for one managed playlist (README "Library" > status block), from
 * the per-run log (`playlist.lastRun`) with the old `lastSyncCompletedAt` as a
 * fallback for playlists that ran before the log existed.
 */
export function deriveStatus(playlist: ManagedPlaylistWithSubscriptions): {
  tone: "ok" | "warn" | "running" | "none";
  dot: string;
  pulse?: boolean;
  label: string;
  detail: string;
} {
  const nextIn = formatRelativeTime(playlist.nextSyncTime);
  const run = playlist.lastRun;
  const nSources = playlist.subscriptions.length;

  if (run?.status === "running") {
    return {
      tone: "running",
      dot: "bg-brand",
      pulse: true,
      label: "Syncing now…",
      detail: `Pulling from ${nSources} source${nSources === 1 ? "" : "s"}`,
    };
  }
  if (run?.status === "failed" || run?.status === "stale") {
    return {
      tone: "warn",
      dot: "bg-warn",
      label: "Last run failed",
      detail: run.errorMessage
        ? run.errorMessage.slice(0, 64)
        : "check the run log",
    };
  }
  if (run?.status === "skipped") {
    return {
      tone: "warn",
      dot: "bg-warn",
      label: "Last run skipped",
      detail: SKIP_HINT[run.skipReason ?? ""] ?? "skipped",
    };
  }
  if (run?.status === "success") {
    const ago = formatRelativeTime(run.finishedAt);
    return {
      tone: "ok",
      dot: "bg-ok",
      label:
        run.tracksAdded > 0
          ? `Synced · +${run.tracksAdded} track${run.tracksAdded === 1 ? "" : "s"}`
          : "Synced · no new tracks",
      detail: [ago, nextIn ? `next ${nextIn}` : null]
        .filter(Boolean)
        .join(" · "),
    };
  }

  if (playlist.lastSyncCompletedAt) {
    const ago = formatRelativeTime(playlist.lastSyncCompletedAt);
    return {
      tone: "ok",
      dot: "bg-ok",
      label: "Synced",
      detail: [ago, nextIn ? `next ${nextIn}` : null]
        .filter(Boolean)
        .join(" · "),
    };
  }
  return {
    tone: "none",
    dot: "bg-ink-25",
    label: "Not synced yet",
    detail: nextIn ? `next ${nextIn}` : "not scheduled",
  };
}

const TONE_TEXT: Record<string, string> = {
  ok: "text-ok-text",
  warn: "text-warn-text",
  running: "text-ink-70",
  none: "text-ink-50",
};

function StatusBlock({
  playlist,
}: {
  playlist: ManagedPlaylistWithSubscriptions;
}) {
  const s = deriveStatus(playlist);
  return (
    <div className="min-w-0 text-right">
      <div
        className={`flex items-center justify-end gap-1.5 text-[12.5px] font-medium ${TONE_TEXT[s.tone]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot} ${
            s.pulse ? "animate-softpulse" : ""
          }`}
        />
        {s.label}
      </div>
      {s.detail && (
        <div className="mt-0.5 text-[11.5px] text-ink-35">{s.detail}</div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-line text-ink-35 transition-colors hover:border-line-strong hover:bg-ground-alt hover:text-ink-70"
    >
      {children}
    </button>
  );
}

export const Subscriptions = () => {
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);
  const isLoading = useUserStore((s) => s.isLoading);
  const setIsLoading = useUserStore((s) => s.setLoading);
  const pendingSourceRemovals = useUserStore((s) => s.pendingSourceRemovals);
  const removeSourceWithUndo = useUserStore((s) => s.removeSourceWithUndo);
  const undoSourceRemoval = useUserStore((s) => s.undoSourceRemoval);

  const [isSyncing, setIsSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("nextSync");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSubscriptions() {
      setIsLoading(true);
      const res = await fetch(`/api/users/me/managed-playlists`);
      const data = await res.json();
      setManagedPlaylists([...data]);
      setIsLoading(false);
    }
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/users/me/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "Sync failed");
      }
      toast.success(
        data?.message || "Sync started. Playlists will update shortly.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const totalSources = useMemo(
    () =>
      managedPlaylists.reduce((n, p) => n + p.subscriptions.length, 0),
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

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
          <h1 className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Library
          </h1>
          <p className="mt-0.5 text-[12.5px] text-ink-50">
            {managedPlaylists.length} managed playlist
            {managedPlaylists.length === 1 ? "" : "s"} · {totalSources} source
            {totalSources === 1 ? "" : "s"}
            {soonestNextSync ? ` · next sync ${soonestNextSync}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing || isEmpty}
            className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-medium text-ink-70 transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? "Syncing…" : "Sync all"}
          </button>
          <Link
            href="/"
            className="rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-surface transition-colors hover:bg-brand-deep"
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
            className="min-w-[180px] flex-1 rounded-full border border-line-strong bg-surface px-4 py-2 text-[13px] text-ink placeholder:text-ink-50 focus:border-brand/40 focus:outline-none"
          />

          <div className="flex rounded-full bg-ground-chip p-0.5">
            {(["ALL", "SPOTIFY", "APPLE_MUSIC"] as ProviderFilter[]).map((p) => (
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
            ))}
          </div>

          <label className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none rounded-full border border-line-strong bg-surface px-3 py-1.5 pr-7 text-[12px] font-medium text-ink-70 focus:outline-none"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-35" />
          </label>

          {expanded.size > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(new Set())}
              className="text-[12px] font-medium text-ink-50 hover:text-ink-70"
            >
              Collapse all
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div className="min-h-0 grow overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-10 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
              <img
                src="/logo.png"
                alt=""
                className="h-16 w-16 object-cover"
              />
            </span>
            <p className="font-display text-[17px] font-semibold text-ink">
              No managed playlists yet
            </p>
            <p className="mt-1 max-w-[38ch] text-[13px] leading-relaxed text-ink-50">
              Subscribe to a source playlist from Discover and it becomes a
              managed playlist that keeps itself fresh.
            </p>
            <Link
              href="/"
              className="mt-5 rounded-full bg-brand px-5 py-2.5 text-[13px] font-medium text-surface transition-colors hover:bg-brand-deep"
            >
              Browse Discover
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-50">
            No playlists match “{query}”.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((playlist) => {
              const isOpen = expanded.has(playlist.id);
              const configLine = [
                `${playlist.subscriptions.length} source${
                  playlist.subscriptions.length === 1 ? "" : "s"
                }`,
                `${playlist.syncQuantityPerSource} per source`,
                playlist.syncInterval.toLowerCase(),
                playlist.syncMode.toLowerCase(),
              ].join(" · ");

              return (
                <div
                  key={playlist.id}
                  className="overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  <div className="flex items-center gap-3 p-3.5">
                    <CoverArt
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      className="h-12 w-12 shrink-0 rounded-[10px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/library/${playlist.id}`}
                          className="truncate font-display text-[15px] font-semibold text-ink hover:text-brand-deep"
                        >
                          {playlist.name}
                        </Link>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ground-alt px-2 py-0.5 text-[11px] font-medium text-ink-50">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${PROVIDER_DOT[playlist.provider]}`}
                          />
                          {PROVIDER_LABELS[playlist.provider]}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-ink-50">
                        {configLine}
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      <StatusBlock playlist={playlist} />
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton label="Sync now" onClick={handleSyncNow}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </IconButton>
                      <Link
                        href={`/library/${playlist.id}/settings`}
                        aria-label={`Settings for ${playlist.name}`}
                        title="Settings"
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-line text-ink-35 transition-colors hover:border-line-strong hover:bg-ground-alt hover:text-ink-70"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Link>
                      <IconButton
                        label={isOpen ? "Collapse" : "Expand"}
                        onClick={() => toggleExpanded(playlist.id)}
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </IconButton>
                    </div>
                  </div>

                  {/* status on its own line on narrow screens */}
                  <div className="border-t border-line px-3.5 py-2 sm:hidden">
                    <StatusBlock playlist={playlist} />
                  </div>

                  {isOpen && (
                    <div className="border-t border-line bg-surface-sunk px-3.5 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                          {playlist.contributions &&
                          Object.keys(playlist.contributions).length
                            ? "Sources · contribution last 30 days"
                            : "Sources"}
                        </span>
                        <Link
                          href="/"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-deep hover:text-brand"
                        >
                          <Plus className="h-3 w-3" />
                          Add source
                        </Link>
                      </div>

                      <div className="flex flex-col">
                        {playlist.subscriptions.map((sub) => {
                          const key = pendingRemovalKey(
                            playlist.id,
                            sub.sourcePlaylist.id,
                          );
                          if (pendingSourceRemovals[key]) {
                            return (
                              <div
                                key={key}
                                className="my-1 flex items-center justify-between rounded-xl bg-brand-tint px-3 py-2 text-[12.5px] text-brand-deep"
                              >
                                <span className="min-w-0 truncate">
                                  Removed{" "}
                                  <b className="font-semibold">
                                    {sub.sourcePlaylist.name}
                                  </b>{" "}
                                  from this playlist.
                                </span>
                                <button
                                  type="button"
                                  onClick={() => undoSourceRemoval(key)}
                                  className="ml-3 shrink-0 font-semibold underline underline-offset-2"
                                >
                                  Undo
                                </button>
                              </div>
                            );
                          }
                          const contrib =
                            playlist.contributions?.[sub.sourcePlaylist.id] ??
                            null;
                          const maxContrib = playlist.contributions
                            ? Math.max(
                                1,
                                ...Object.values(playlist.contributions),
                              )
                            : 1;
                          return (
                            <div
                              key={sub.sourcePlaylist.id}
                              className={`flex items-center gap-3 border-b border-line py-2 last:border-b-0 ${
                                contrib === 0 ? "opacity-60" : ""
                              }`}
                            >
                              <CoverArt
                                src={sub.sourcePlaylist.imageUrl}
                                alt={sub.sourcePlaylist.name}
                                className="h-7 w-7 shrink-0 rounded-md"
                              />
                              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-70">
                                {sub.sourcePlaylist.name}
                              </span>
                              {contrib !== null ? (
                                <span className="flex w-24 shrink-0 items-center gap-2">
                                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-ground-chip">
                                    <span
                                      className="block h-full rounded-full bg-brand"
                                      style={{
                                        width: `${(contrib / maxContrib) * 100}%`,
                                      }}
                                    />
                                  </span>
                                  <span className="font-mono text-[11px] text-ink-35">
                                    {contrib}
                                  </span>
                                </span>
                              ) : (
                                <span className="shrink-0 font-mono text-[11px] text-ink-35">
                                  {sub.sourcePlaylist.trackCount} trks
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  removeSourceWithUndo(
                                    playlist.id,
                                    sub.sourcePlaylist.id,
                                    sub.sourcePlaylist.name,
                                  )
                                }
                                className="shrink-0 text-[12px] font-medium text-ink-35 transition-colors hover:text-warn-text"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}

                        {playlist.subscriptions.every(
                          (sub) =>
                            pendingSourceRemovals[
                              pendingRemovalKey(
                                playlist.id,
                                sub.sourcePlaylist.id,
                              )
                            ],
                        ) &&
                          playlist.subscriptions.length > 0 && (
                            <p className="py-2 text-[12px] text-ink-35">
                              All sources removed.
                            </p>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
