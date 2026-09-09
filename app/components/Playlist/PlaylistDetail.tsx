"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useUserStore, pendingRemovalKey } from "store/useUserStore";
import { PROVIDER_LABELS } from "store/useMusicStore";
import { formatRelativeTime } from "utils/formatRelativeTime";
import type { ManagedPlaylistWithSubscriptions } from "@/types";
import { PlaylistSettingsForm } from "./PlaylistSettingsForm";

/**
 * Managed-playlist detail (README "Playlist detail", artboard 1c) — the one new
 * route. Rendered in the light-converted form the README offers instead of the
 * dark screen. Tabs: Overview / Sources / Runs / Settings (7a).
 *
 * The sync-line outcome and run history need per-run data the engine computes
 * but doesn't persist yet, so those read as "nothing recorded" until the
 * sync-run-log backend pass. The mechanism diagram and everything on the
 * Sources and Settings tabs is live.
 */

type Tab = "overview" | "sources" | "runs" | "settings";

const TABS: { id: Tab; label: string; href: (id: string) => string }[] = [
  { id: "overview", label: "Overview", href: (id) => `/library/${id}` },
  { id: "sources", label: "Sources", href: (id) => `/library/${id}/sources` },
  { id: "runs", label: "Runs", href: (id) => `/library/${id}/runs` },
  {
    id: "settings",
    label: "Settings",
    href: (id) => `/library/${id}/settings`,
  },
];

function CoverArt({
  src,
  className,
}: {
  src: string | null | undefined;
  className: string;
}) {
  if (src) return <img src={src} alt="" className={`${className} object-cover`} />;
  return <span className={`${className} art-placeholder`} />;
}

export function PlaylistDetail({ id, tab }: { id: string; tab: Tab }) {
  const router = useRouter();
  const managedPlaylists = useUserStore((s) => s.managedPlaylists);
  const setManagedPlaylists = useUserStore((s) => s.setManagedPlaylists);
  const pendingSourceRemovals = useUserStore((s) => s.pendingSourceRemovals);
  const removeSourceWithUndo = useUserStore((s) => s.removeSourceWithUndo);
  const undoSourceRemoval = useUserStore((s) => s.undoSourceRemoval);

  const [loading, setLoading] = useState(managedPlaylists.length === 0);
  const [syncing, setSyncing] = useState(false);

  const playlist = useMemo(
    () => managedPlaylists.find((p) => p.id === id) ?? null,
    [managedPlaylists, id],
  );

  useEffect(() => {
    if (playlist || managedPlaylists.length > 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me/managed-playlists");
        const data = await res.json();
        if (!cancelled) setManagedPlaylists([...data]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/users/me/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || "Sync failed");
      }
      toast.success(data?.message || "Sync started.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start sync");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-[13px] text-ink-50">
        Loading…
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-display text-[17px] font-semibold text-ink">
          Playlist not found
        </p>
        <Link
          href="/library"
          className="rounded-full border border-line-strong px-4 py-2 text-[13px] font-medium text-ink-70 hover:border-brand/40 hover:text-brand"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  const synced = formatRelativeTime(playlist.lastSyncCompletedAt);
  const nextIn = formatRelativeTime(playlist.nextSyncTime);
  const sources = playlist.subscriptions;

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      {/* Head */}
      <Link
        href="/library"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-50 hover:text-ink-70"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <CoverArt
            src={playlist.imageUrl}
            className="h-[60px] w-[60px] shrink-0 rounded-xl"
          />
          <div>
            <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-35">
              Managed playlist
            </div>
            <h1 className="font-display text-[27px] font-semibold leading-tight tracking-[-0.02em] text-ink">
              {playlist.name}
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-50">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  playlist.provider === "APPLE_MUSIC"
                    ? "bg-apple"
                    : "bg-spotify"
                }`}
              />
              {PROVIDER_LABELS[playlist.provider]} · {sources.length} source
              {sources.length === 1 ? "" : "s"} · {playlist.trackCount} tracks
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[12.5px] font-medium text-surface transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href(playlist.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
              tab === t.id
                ? "border-brand text-ink"
                : "border-transparent text-ink-50 hover:text-ink-70"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "overview" && (
          <div className="flex flex-col gap-5">
            {/* Sync line — mechanism */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                How a run flows
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  {sources.slice(0, 3).map((s) => (
                    <div
                      key={s.sourcePlaylist.id}
                      className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5"
                    >
                      <CoverArt
                        src={s.sourcePlaylist.imageUrl}
                        className="h-6 w-6 shrink-0 rounded"
                      />
                      <span className="max-w-[140px] truncate text-[12px] font-medium text-ink-70">
                        {s.sourcePlaylist.name}
                      </span>
                    </div>
                  ))}
                  {sources.length > 3 && (
                    <span className="pl-1 text-[11.5px] text-ink-35">
                      +{sources.length - 3} more
                    </span>
                  )}
                  {sources.length === 0 && (
                    <span className="text-[12px] text-ink-35">No sources</span>
                  )}
                </div>

                <svg
                  width="56"
                  height="72"
                  viewBox="0 0 56 72"
                  className="shrink-0 overflow-visible"
                  aria-hidden="true"
                >
                  {[16, 36, 56].map((y) => (
                    <path
                      key={y}
                      d={`M0 ${y} C 24 ${y}, 28 36, 56 36`}
                      fill="none"
                      stroke="var(--color-brand)"
                      strokeWidth="1.5"
                      strokeDasharray="4 6"
                      className="animate-flowdash"
                    />
                  ))}
                </svg>

                <span className="shrink-0 rounded-full bg-ground-alt px-3 py-1.5 font-mono text-[10.5px] text-ink-50">
                  dedupe · filters · vibe
                </span>

                <svg
                  width="32"
                  height="4"
                  viewBox="0 0 32 4"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <line
                    x1="0"
                    y1="2"
                    x2="32"
                    y2="2"
                    stroke="var(--color-brand)"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                    className="animate-flowdash"
                  />
                </svg>

                <div className="min-w-0 flex-1 rounded-xl border border-line bg-brand-tint-soft p-3">
                  <div className="flex items-center gap-2">
                    <CoverArt
                      src={playlist.imageUrl}
                      className="h-8 w-8 shrink-0 rounded-md"
                    />
                    <span className="truncate text-[13px] font-medium text-ink">
                      {playlist.name}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] text-ink-50">
                    {synced
                      ? `Last synced ${synced}`
                      : "No runs recorded yet"}
                    {nextIn ? ` · next ${nextIn}` : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Run history placeholder */}
            <div className="rounded-2xl border border-line bg-surface p-5">
              <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                Recent runs
              </div>
              <div className="flex items-end gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-full rounded-t bg-ground-chip"
                    style={{ height: 8 + ((i * 7) % 34) }}
                  />
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-ink-35">
                Per-run results — added, skipped, failed — appear here once runs
                are recorded.
              </p>
            </div>

            {/* Footer strip */}
            <div className="flex items-center gap-3 rounded-2xl bg-ground-alt px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface shadow-[0_0_0_1px_var(--color-line)]">
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-cover"
                />
              </span>
              <span className="flex-1 text-[12.5px] leading-relaxed text-ink-70">
                Pulls up to {playlist.syncQuantityPerSource} tracks from each of{" "}
                {sources.length} source{sources.length === 1 ? "" : "s"},{" "}
                {playlist.syncMode.toLowerCase()},{" "}
                {playlist.syncInterval.toLowerCase()}.
              </span>
              <Link
                href={`/library/${playlist.id}/settings`}
                className="shrink-0 text-[12.5px] font-medium text-brand-deep hover:text-brand"
              >
                Change rules
              </Link>
            </div>
          </div>
        )}

        {tab === "sources" && (
          <div className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink-35">
                Sources
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
              {sources.map((sub) => {
                const key = pendingRemovalKey(playlist.id, sub.sourcePlaylist.id);
                if (pendingSourceRemovals[key]) {
                  return (
                    <div
                      key={key}
                      className="m-2 flex items-center justify-between rounded-xl bg-brand-tint px-3 py-2 text-[12.5px] text-brand-deep"
                    >
                      <span className="min-w-0 truncate">
                        Removed{" "}
                        <b className="font-semibold">
                          {sub.sourcePlaylist.name}
                        </b>
                        .
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
                return (
                  <div
                    key={sub.sourcePlaylist.id}
                    className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
                  >
                    <CoverArt
                      src={sub.sourcePlaylist.imageUrl}
                      className="h-8 w-8 shrink-0 rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-70">
                      {sub.sourcePlaylist.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-35">
                      {sub.sourcePlaylist.trackCount} trks
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        removeSourceWithUndo(
                          playlist.id,
                          sub.sourcePlaylist.id,
                          sub.sourcePlaylist.name,
                        )
                      }
                      className="shrink-0 text-[12px] font-medium text-ink-35 hover:text-warn-text"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {sources.length === 0 && (
                <p className="px-4 py-6 text-center text-[12.5px] text-ink-50">
                  No sources feed this playlist.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "runs" && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-10 text-center">
            <p className="font-display text-[15px] font-semibold text-ink">
              No run history yet
            </p>
            <p className="mt-1 max-w-[42ch] text-[12.5px] leading-relaxed text-ink-50">
              Once this playlist syncs, every run shows up here with what it
              added and what it skipped, and why.
            </p>
          </div>
        )}

        {tab === "settings" && (
          <PlaylistSettingsForm
            playlist={playlist}
            onStopped={() => router.push("/library")}
          />
        )}
      </div>
    </div>
  );
}
