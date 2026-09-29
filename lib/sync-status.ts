import { ManagedPlaylistWithSubscriptions } from "@/types";
import { formatRelativeTime } from "utils/formatRelativeTime";

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
