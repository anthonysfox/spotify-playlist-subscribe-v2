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
import { totalSkipped, type SyncRunSummary } from "@/lib/sync/runs";
import { PlaylistSettingsForm } from "./PlaylistSettingsForm";
import { SyncFailedCard } from "../States/SyncFailedCard";
import { CoverArt } from "./CoverArt";

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

const RUN_DOT: Record<string, string> = {
  success: "bg-ok",
  running: "bg-brand animate-softpulse",
  failed: "bg-warn",
  stale: "bg-warn",
  skipped: "bg-ink-25",
};

/** One-line description of a run, shared by the Runs list and chart tooltips. */
function runSummary(run: SyncRunSummary): string {
  const skipped = totalSkipped(run);
  if (run.status === "success") {
    return run.tracksAdded > 0
      ? `+${run.tracksAdded} added${skipped ? ` · ${skipped} filtered out` : ""}`
      : skipped
        ? `${skipped} filtered out, none added`
        : "no new tracks";
  }
  if (run.status === "skipped") return run.skipReason ?? "skipped";
  if (run.status === "running") return "in progress";
  return run.errorMessage ?? "failed";
}

type BarKind = "added" | "empty" | "skipped" | "failed" | "running";

function barKind(run: SyncRunSummary): BarKind {
  if (run.status === "failed" || run.status === "stale") return "failed";
  if (run.status === "skipped") return "skipped";
  if (run.status === "running") return "running";
  return run.tracksAdded > 0 ? "added" : "empty";
}

const BAR_STYLE: Record<BarKind, string> = {
  added: "bg-brand",
  empty: "bg-ink-25",
  skipped: "border border-dashed border-ink-25",
  failed: "bg-warn",
  running: "bg-brand animate-softpulse",
};

const BAR_LABEL: Record<BarKind, (r: SyncRunSummary) => string> = {
  added: (r) => `+${r.tracksAdded}`,
  empty: () => "0",
  skipped: () => "–",
  failed: () => "!",
  running: () => "…",
};

const LEGEND: { kind: BarKind; label: string }[] = [
  { kind: "added", label: "Tracks added" },
  { kind: "empty", label: "Nothing new" },
  { kind: "skipped", label: "Skipped" },
  { kind: "failed", label: "Failed" },
];

const CHART_HEIGHT = 56;

function formatRunTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const OUTCOME_TEXT: Record<BarKind, string> = {
  added: "text-ink",
  empty: "text-ink-70",
  skipped: "text-ink-70",
  failed: "text-warn-text",
  running: "text-ink-70",
};

/** Hover/focus card for one bar of the run history chart. */
function RunTooltip({
  run,
  className,
}: {
  run: SyncRunSummary;
  className: string;
}) {
  const kind = barKind(run);
  const filtered = [
    { n: run.skippedAlreadyPresent, label: "already in playlist" },
    { n: run.skippedExplicit, label: "explicit" },
    { n: run.skippedTooOld, label: "too old" },
    { n: run.skippedByVibe, label: "off the vibe" },
  ].filter((f) => f.n > 0);
  const sources = run.sourceBreakdown.filter((s) => s.added > 0);

  return (
    <div
      role="tooltip"
      className={`border-line bg-surface pointer-events-none absolute z-20 w-56 rounded-xl border p-3 text-left shadow-lg ${className}`}
    >
      <div className="text-ink-35 flex justify-between text-[10.5px]">
        <span>{formatRunTime(run.startedAt)}</span>
        <span>{run.trigger === "MANUAL" ? "Manual" : "Scheduled"}</span>
      </div>

      <div
        className={`mt-1 text-[12.5px] font-medium break-words ${OUTCOME_TEXT[kind]}`}
      >
        {kind === "added"
          ? `+${run.tracksAdded} track${run.tracksAdded === 1 ? "" : "s"} added`
          : kind === "empty"
            ? "No new tracks"
            : runSummary(run)}
      </div>

      {sources.length > 0 && (
        <div className="mt-2 space-y-0.5 text-[11px]">
          {sources.map((s) => (
            <div
              key={s.sourcePlaylistId}
              className="flex justify-between gap-2"
            >
              <span className="text-ink-50 truncate">{s.sourceName}</span>
              <span className="text-ink-70 tabular-nums">+{s.added}</span>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="border-line mt-2 border-t pt-2 text-[11px]">
          <div className="text-ink-35 mb-0.5">Filtered out</div>
          {filtered.map((f) => (
            <div key={f.label} className="flex justify-between gap-2">
              <span className="text-ink-50">{f.label}</span>
              <span className="text-ink-70 tabular-nums">{f.n}</span>
            </div>
          ))}
        </div>
      )}

      {run.durationMs > 0 && kind !== "running" && (
        <div className="text-ink-35 mt-2 text-[10.5px]">
          Took {formatDuration(run.durationMs)}
        </div>
      )}
    </div>
  );
}

function RunHistoryChart({
  runs,
  runsHref,
}: {
  runs: SyncRunSummary[];
  runsHref: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const maxAdded = Math.max(1, ...runs.map((r) => r.tracksAdded));
  const totalAdded = runs.reduce((n, r) => n + r.tracksAdded, 0);
  const kinds = runs.map(barKind);
  const present = new Set(kinds);

  return (
    <>
      <p className="text-ink-50 mb-4 text-[12px]">
        Tracks added by each of the last {runs.length} syncs ·{" "}
        <span className="text-ink-70 font-medium">+{totalAdded} total</span>
      </p>

      <div
        className="relative flex items-end gap-1.5"
        style={{ height: CHART_HEIGHT + 16 }}
        onMouseLeave={() => setActive(null)}
      >
        {runs.map((r, i) => {
          const kind = kinds[i];
          const h =
            kind === "added"
              ? Math.max(8, (r.tracksAdded / maxAdded) * CHART_HEIGHT)
              : kind === "running"
                ? 8
                : 4;
          // Keep the tooltip inside the card: edge bars anchor it to that side.
          const align =
            i < 2
              ? "left-0"
              : i >= runs.length - 2
                ? "right-0"
                : "left-1/2 -translate-x-1/2";
          return (
            <button
              type="button"
              key={r.id}
              className={`focus-visible:ring-brand/50 relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1 rounded-t outline-none focus-visible:ring-2 ${
                active !== null && active !== i ? "opacity-50" : ""
              } transition-opacity`}
              aria-label={`${formatRunTime(r.startedAt)}: ${runSummary(r)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {active === i && (
                <RunTooltip run={r} className={`bottom-full mb-2 ${align}`} />
              )}
              <span
                className={`text-[10px] tabular-nums ${
                  kind === "failed"
                    ? "text-warn-text font-semibold"
                    : kind === "added"
                      ? "text-ink-70 font-medium"
                      : "text-ink-35"
                }`}
              >
                {BAR_LABEL[kind](r)}
              </span>
              <span
                className={`w-full rounded-t ${BAR_STYLE[kind]}`}
                style={{ height: h }}
              />
            </button>
          );
        })}
      </div>

      <div className="border-line text-ink-35 mt-0 flex justify-between border-t pt-1.5 text-[11px]">
        <span>{formatRelativeTime(runs[0].startedAt)}</span>
        <span>{formatRelativeTime(runs[runs.length - 1].startedAt)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        {LEGEND.filter((l) => present.has(l.kind)).map((l) => (
          <span key={l.kind} className="text-ink-50 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${BAR_STYLE[l.kind]}`} />
            {l.label}
          </span>
        ))}
        <Link
          href={runsHref}
          className="text-ink-50 hover:text-ink ml-auto underline-offset-2 hover:underline"
        >
          All runs →
        </Link>
      </div>
    </>
  );
}

function RunRow({ run }: { run: SyncRunSummary }) {
  const when = formatRelativeTime(run.finishedAt ?? run.startedAt);
  const summary = runSummary(run);

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
                <RunHistoryChart
                  runs={historyRuns}
                  runsHref={`/library/${id}/runs`}
                />
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
