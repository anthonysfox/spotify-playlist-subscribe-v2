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
import { totalSkipped, type SyncRunSummary } from "@/lib/sync-runs";
import { PlaylistSettingsForm } from "./PlaylistSettingsForm";
import { SyncFailedCard } from "../States/SyncFailedCard";

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
  if (src)
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={`${className} object-cover`}
      />
    );
  return <span className={`${className} art-placeholder`} />;
}

const RUN_DOT: Record<string, string> = {
  success: "bg-ok",
  running: "bg-brand animate-softpulse",
  failed: "bg-warn",
  stale: "bg-warn",
  skipped: "bg-ink-25",
};

function RunRow({ run }: { run: SyncRunSummary }) {
  const when = formatRelativeTime(run.finishedAt ?? run.startedAt);
  const skipped = totalSkipped(run);
  let summary: string;
  if (run.status === "success") {
    summary =
      run.tracksAdded > 0
        ? `+${run.tracksAdded} added${skipped ? ` · ${skipped} skipped` : ""}`
        : skipped
          ? `${skipped} skipped, none added`
          : "no changes";
  } else if (run.status === "skipped") {
    summary = run.skipReason ?? "skipped";
  } else if (run.status === "running") {
    summary = "in progress";
  } else {
    summary = run.errorMessage ?? "failed";
  }

  return (
    <div className="border-line flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${RUN_DOT[run.status] ?? "bg-ink-25"}`}
      />
      <span className="text-ink-35 w-14 shrink-0 text-[11px] font-medium tracking-wide uppercase">
        {run.trigger === "MANUAL" ? "Manual" : "Scheduled"}
      </span>
      <span className="text-ink-70 min-w-0 flex-1 truncate text-[12.5px]">
        {summary}
      </span>
      <span className="text-ink-35 shrink-0 text-[11.5px]">{when}</span>
    </div>
  );
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
  const [runs, setRuns] = useState<SyncRunSummary[] | null>(null);

  const playlist = useMemo(
    () => managedPlaylists.find((p) => p.id === id) ?? null,
    [managedPlaylists, id],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/users/me/managed-playlists/${id}/runs`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRuns(data.runs ?? []);
      } catch {
        /* leave null — the UI shows an empty state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, syncing]);

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
      <div className="text-ink-50 flex h-full items-center justify-center p-8 text-[13px]">
        Loading…
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="font-display text-ink text-[17px] font-semibold">
          Playlist not found
        </p>
        <Link
          href="/library"
          className="border-line-strong text-ink-70 hover:border-brand/40 hover:text-brand rounded-full border px-4 py-2 text-[13px] font-medium"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  const synced = formatRelativeTime(playlist.lastSyncCompletedAt);
  const nextIn = formatRelativeTime(playlist.nextSyncTime);
  const sources = playlist.subscriptions;

  const lastRun = playlist.lastRun ?? runs?.[0] ?? null;
  // Oldest → newest, last 9, for the history bars.
  const historyRuns = (runs ?? []).slice(0, 9).reverse();
  const maxAdded = Math.max(1, ...historyRuns.map((r) => r.tracksAdded));

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      {/* Head */}
      <Link
        href="/library"
        className="text-ink-50 hover:text-ink-70 mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium"
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
            <div className="text-ink-35 font-mono text-[10.5px] font-medium tracking-[0.08em] uppercase">
              Managed playlist
            </div>
            <h1 className="font-display text-ink text-[27px] leading-tight font-semibold tracking-[-0.02em]">
              {playlist.name}
            </h1>
            <div className="text-ink-50 mt-0.5 flex items-center gap-1.5 text-[12.5px]">
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
        <div className="flex items-center gap-2.5">
          {lastRun && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
                lastRun.status === "success"
                  ? "border-line text-ok-text"
                  : lastRun.status === "running"
                    ? "border-line text-ink-70"
                    : "border-warn/25 text-warn-text"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${RUN_DOT[lastRun.status] ?? "bg-ink-25"}`}
              />
              {lastRun.status === "success"
                ? `Synced${lastRun.tracksAdded ? ` · +${lastRun.tracksAdded}` : ""}`
                : lastRun.status === "running"
                  ? "Syncing…"
                  : lastRun.status === "skipped"
                    ? "Skipped"
                    : "Failed"}
            </span>
          )}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="bg-brand text-surface hover:bg-brand-deep inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-line mt-5 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href(playlist.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
              tab === t.id
                ? "border-brand text-ink"
                : "text-ink-50 hover:text-ink-70 border-transparent"
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
            <div className="border-line bg-surface rounded-2xl border p-5">
              <div className="text-ink-35 mb-4 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                How a run flows
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-1">
                <div className="flex flex-col gap-2">
                  {sources.slice(0, 3).map((s) => (
                    <div
                      key={s.sourcePlaylist.id}
                      className="border-line flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                    >
                      <CoverArt
                        src={s.sourcePlaylist.imageUrl}
                        className="h-6 w-6 shrink-0 rounded"
                      />
                      <span className="text-ink-70 max-w-[140px] truncate text-[12px] font-medium">
                        {s.sourcePlaylist.name}
                      </span>
                    </div>
                  ))}
                  {sources.length > 3 && (
                    <span className="text-ink-35 pl-1 text-[11.5px]">
                      +{sources.length - 3} more
                    </span>
                  )}
                  {sources.length === 0 && (
                    <span className="text-ink-35 text-[12px]">No sources</span>
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

                <span className="bg-ground-alt text-ink-50 shrink-0 rounded-full px-3 py-1.5 font-mono text-[10.5px]">
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

                <div className="border-line bg-brand-tint-soft min-w-[180px] flex-1 rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <CoverArt
                      src={playlist.imageUrl}
                      className="h-8 w-8 shrink-0 rounded-md"
                    />
                    <span className="text-ink truncate text-[13px] font-medium">
                      {playlist.name}
                    </span>
                  </div>
                  {lastRun && lastRun.status === "success" ? (
                    <div className="text-ink-70 mt-2 flex flex-col gap-0.5 text-[12px]">
                      <span className="text-ink font-medium">
                        {lastRun.tracksAdded > 0
                          ? `${lastRun.tracksAdded} added ${formatRelativeTime(lastRun.finishedAt)}`
                          : `No new tracks ${formatRelativeTime(lastRun.finishedAt)}`}
                      </span>
                      {lastRun.skippedAlreadyPresent > 0 && (
                        <span>
                          {lastRun.skippedAlreadyPresent} skipped — already
                          present
                        </span>
                      )}
                      {lastRun.skippedExplicit > 0 && (
                        <span>
                          {lastRun.skippedExplicit} skipped — explicit
                        </span>
                      )}
                      {lastRun.skippedTooOld > 0 && (
                        <span>{lastRun.skippedTooOld} skipped — too old</span>
                      )}
                      {lastRun.skippedByVibe > 0 && (
                        <span>
                          {lastRun.skippedByVibe} skipped — off the vibe
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-ink-50 mt-2 text-[12px]">
                      {synced
                        ? `Last synced ${synced}`
                        : "No runs recorded yet"}
                      {nextIn ? ` · next ${nextIn}` : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(lastRun?.status === "failed" || lastRun?.status === "stale") && (
              <SyncFailedCard
                playlistName={playlist.name}
                cause={lastRun.errorMessage ?? undefined}
                fixLabel="Reconnect"
              />
            )}

            {/* Run history */}
            <div className="border-line bg-surface rounded-2xl border p-5">
              <div className="text-ink-35 mb-3 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                Recent runs
              </div>
              {historyRuns.length === 0 ? (
                <p className="text-ink-35 text-[11.5px]">
                  Per-run results — added, skipped, failed — appear here once
                  runs are recorded.
                </p>
              ) : (
                <>
                  <div
                    className="flex items-end gap-1.5"
                    style={{ height: 44 }}
                  >
                    {historyRuns.map((r, i) => {
                      const failed =
                        r.status === "failed" ||
                        r.status === "stale" ||
                        r.status === "skipped";
                      const h = failed
                        ? 10
                        : Math.max(6, (r.tracksAdded / maxAdded) * 44);
                      const newest = i === historyRuns.length - 1;
                      return (
                        <span
                          key={r.id}
                          title={
                            failed
                              ? (r.errorMessage ?? r.skipReason ?? "failed")
                              : `${r.tracksAdded} added`
                          }
                          className={`w-full rounded-t ${
                            failed
                              ? "bg-[#7C2D12]"
                              : newest
                                ? "bg-brand"
                                : "bg-brand/40"
                          }`}
                          style={{ height: h }}
                        />
                      );
                    })}
                  </div>
                  <div className="text-ink-35 mt-2 flex justify-between text-[11px]">
                    <span>{formatRelativeTime(historyRuns[0].startedAt)}</span>
                    {historyRuns.some(
                      (r) => r.status === "failed" || r.status === "stale",
                    ) && (
                      <span className="text-warn-text">
                        {
                          historyRuns.filter(
                            (r) =>
                              r.status === "failed" || r.status === "stale",
                          ).length
                        }{" "}
                        failed
                      </span>
                    )}
                    <span>
                      {formatRelativeTime(
                        historyRuns[historyRuns.length - 1].startedAt,
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer strip */}
            <div className="bg-ground-alt flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="bg-surface flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_1px_var(--color-line)]">
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-cover"
                />
              </span>
              <span className="text-ink-70 flex-1 text-[12.5px] leading-relaxed">
                Pulls up to {playlist.syncQuantityPerSource} tracks from each of{" "}
                {sources.length} source{sources.length === 1 ? "" : "s"},{" "}
                {playlist.syncMode.toLowerCase()},{" "}
                {playlist.syncInterval.toLowerCase()}.
              </span>
              <Link
                href={`/library/${playlist.id}/settings`}
                className="text-brand-deep hover:text-brand shrink-0 text-[12.5px] font-medium"
              >
                Change rules
              </Link>
            </div>
          </div>
        )}

        {tab === "sources" && (
          <div className="border-line bg-surface rounded-2xl border">
            <div className="border-line flex items-center justify-between border-b px-4 py-3">
              <span className="text-ink-35 font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                Sources
              </span>
              <Link
                href="/"
                className="text-brand-deep hover:text-brand inline-flex items-center gap-1 text-[12px] font-medium"
              >
                <Plus className="h-3 w-3" />
                Add source
              </Link>
            </div>
            <div className="flex flex-col">
              {sources.map((sub) => {
                const key = pendingRemovalKey(
                  playlist.id,
                  sub.sourcePlaylist.id,
                );
                if (pendingSourceRemovals[key]) {
                  return (
                    <div
                      key={key}
                      className="bg-brand-tint text-brand-deep m-2 flex items-center justify-between rounded-xl px-3 py-2 text-[12.5px]"
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
                    className="border-line flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
                  >
                    <CoverArt
                      src={sub.sourcePlaylist.imageUrl}
                      className="h-8 w-8 shrink-0 rounded-md"
                    />
                    <span className="text-ink-70 min-w-0 flex-1 truncate text-[13px] font-medium">
                      {sub.sourcePlaylist.name}
                    </span>
                    <span className="text-ink-35 shrink-0 font-mono text-[11px]">
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
                      className="text-ink-35 hover:text-warn-text shrink-0 text-[12px] font-medium"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              {sources.length === 0 && (
                <p className="text-ink-50 px-4 py-6 text-center text-[12.5px]">
                  No sources feed this playlist.
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "runs" &&
          (runs && runs.length > 0 ? (
            <div className="border-line bg-surface rounded-2xl border">
              {runs.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </div>
          ) : (
            <div className="border-line-strong flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
              <p className="font-display text-ink text-[15px] font-semibold">
                No run history yet
              </p>
              <p className="text-ink-50 mt-1 max-w-[42ch] text-[12.5px] leading-relaxed">
                Once this playlist syncs, every run shows up here with what it
                added and what it skipped, and why.
              </p>
            </div>
          ))}

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
