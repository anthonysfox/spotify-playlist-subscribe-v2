"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "utils/formatRelativeTime";
import { totalSkipped, type SyncRunSummary } from "@/lib/sync-runs";

type Row = SyncRunSummary & {
  playlist: {
    id: string;
    name: string;
    imageUrl: string | null;
    provider: "SPOTIFY" | "APPLE_MUSIC";
  } | null;
};

const DOT: Record<string, string> = {
  success: "bg-ok",
  running: "bg-brand animate-softpulse",
  failed: "bg-warn",
  stale: "bg-warn",
  skipped: "bg-ink-25",
};

const SKIP_HINT: Record<string, string> = {
  PROVIDER_NOT_CONNECTED: "reconnect your music service",
  REPLACE_UNSUPPORTED: "replace mode isn't supported here",
  NO_SUBSCRIPTIONS: "no sources yet",
};

/** Newest run timestamp the user has seen, so the rail badge can clear. */
export const ACTIVITY_SEEN_KEY = "pf:activity-seen";

function summarise(r: Row): string {
  const skipped = totalSkipped(r);
  if (r.status === "success") {
    return r.tracksAdded > 0
      ? `Added ${r.tracksAdded} track${r.tracksAdded === 1 ? "" : "s"}${
          skipped ? ` · ${skipped} skipped` : ""
        }`
      : skipped
        ? `${skipped} skipped, none added`
        : "No changes";
  }
  if (r.status === "skipped") {
    return `Skipped — ${SKIP_HINT[r.skipReason ?? ""] ?? "see settings"}`;
  }
  if (r.status === "running") return "Syncing now…";
  return `Failed — ${r.errorMessage ?? "see the playlist"}`;
}

export function ActivityFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (after?: string) => {
    const res = await fetch(
      `/api/users/me/sync-runs?limit=40${after ? `&cursor=${after}` : ""}`,
    );
    if (!res.ok) return { runs: [] as Row[], nextCursor: null };
    return (await res.json()) as { runs: Row[]; nextCursor: string | null };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { runs, nextCursor } = await load();
      if (cancelled) return;
      setRows(runs);
      setCursor(nextCursor);
      setLoading(false);
      if (runs[0]) {
        try {
          localStorage.setItem(ACTIVITY_SEEN_KEY, runs[0].startedAt);
          window.dispatchEvent(new Event("pf:activity-seen"));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const more = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const { runs, nextCursor } = await load(cursor);
    setRows((r) => [...r, ...runs]);
    setCursor(nextCursor);
    setLoadingMore(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
      <h1 className="mb-1 font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Activity
      </h1>
      <p className="mb-6 text-[13px] text-ink-50">
        Every sync run across your playlists, newest first.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-ink-50">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="flex grow flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-10 text-center">
            <p className="font-display text-[17px] font-semibold text-ink">
              No sync activity yet
            </p>
            <p className="mt-1 max-w-[42ch] text-[13px] leading-relaxed text-ink-50">
              Once your playlists start syncing, each run shows up here with what
              it added and what it skipped.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[r.status] ?? "bg-ink-25"}`}
                />
                {r.playlist ? (
                  <Link
                    href={`/library/${r.playlist.id}`}
                    className="shrink-0 max-w-[40%] truncate text-[13px] font-medium text-ink hover:text-brand-deep"
                  >
                    {r.playlist.name}
                  </Link>
                ) : (
                  <span className="text-[13px] font-medium text-ink-50">
                    (deleted playlist)
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-70">
                  {summarise(r)}
                </span>
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-35">
                  {r.trigger === "MANUAL" ? "Manual" : "Scheduled"}
                </span>
                <span className="shrink-0 text-[11.5px] text-ink-35">
                  {formatRelativeTime(r.finishedAt ?? r.startedAt)}
                </span>
              </div>
            ))}
          </div>
        )}

        {cursor && (
          <button
            type="button"
            onClick={more}
            disabled={loadingMore}
            className="mx-auto mt-4 block rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-medium text-ink-70 hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
