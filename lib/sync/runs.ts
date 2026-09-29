import type { SyncRun } from "@/generated/prisma/client";

/**
 * A RUNNING row older than this almost certainly means the sync process died
 * mid-run (a deploy, a timeout) rather than a sync that is genuinely still
 * going. The read layer surfaces those as "stale" so the UI doesn't sit on
 * "Syncing now…" forever.
 */
export const STALE_RUNNING_MS = 15 * 60 * 1000;

/** How far back the per-source contribution figures on Library rows look. */
export const CONTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type SyncRunUiStatus =
  "running" | "success" | "failed" | "skipped" | "stale";

export interface SourceContribution {
  sourcePlaylistId: string;
  sourceName: string;
  added: number;
}

export interface SyncRunSummary {
  id: string;
  status: SyncRunUiStatus;
  trigger: "SCHEDULED" | "MANUAL";
  tracksAdded: number;
  skippedAlreadyPresent: number;
  skippedExplicit: number;
  skippedTooOld: number;
  skippedByVibe: number;
  skipReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sourceBreakdown: SourceContribution[];
  durationMs: number;
  startedAt: string;
  finishedAt: string | null;
}

export function toSyncRunSummary(run: SyncRun): SyncRunSummary {
  let status: SyncRunUiStatus;
  if (run.status === "RUNNING") {
    status =
      Date.now() - new Date(run.startedAt).getTime() > STALE_RUNNING_MS
        ? "stale"
        : "running";
  } else {
    status = run.status.toLowerCase() as SyncRunUiStatus;
  }

  return {
    id: run.id,
    status,
    trigger: run.trigger,
    tracksAdded: run.tracksAdded,
    skippedAlreadyPresent: run.skippedAlreadyPresent,
    skippedExplicit: run.skippedExplicit,
    skippedTooOld: run.skippedTooOld,
    skippedByVibe: run.skippedByVibe,
    skipReason: run.skipReason,
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    sourceBreakdown: Array.isArray(run.sourceBreakdown)
      ? (run.sourceBreakdown as unknown as SourceContribution[])
      : [],
    durationMs: run.durationMs,
    startedAt: new Date(run.startedAt).toISOString(),
    finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : null,
  };
}

/** Total tracks a run skipped, across every reason. */
export function totalSkipped(s: SyncRunSummary): number {
  return (
    s.skippedAlreadyPresent +
    s.skippedExplicit +
    s.skippedTooOld +
    s.skippedByVibe
  );
}
