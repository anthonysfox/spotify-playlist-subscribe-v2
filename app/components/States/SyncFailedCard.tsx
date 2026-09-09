import Link from "next/link";

/**
 * "Sync failed" state (README "Screens" > Empty and error states, artboard 1d).
 *
 * Reassuring by design — nothing was lost, the run retries — with the fix as the
 * primary action. Not wired live yet: it needs the per-run failure cause the
 * sync engine computes but doesn't persist (see the Library status block and the
 * sync-run-log backend pass).
 */
export function SyncFailedCard({
  playlistName,
  cause,
  fixLabel = "Reconnect",
  fixHref = "/settings/connections",
  runLogHref = "/activity",
}: {
  playlistName: string;
  cause?: string;
  fixLabel?: string;
  fixHref?: string;
  runLogHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(194,65,12,0.25)] bg-[#FEF6F1] p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-warn-text">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        {playlistName} didn&apos;t sync
      </div>
      <p className="mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed text-ink-70">
        Nothing was lost — the run will retry once you reconnect
        {cause ? ` (${cause})` : ""}.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Link
          href={fixHref}
          className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-medium text-surface transition-opacity hover:opacity-90"
        >
          {fixLabel}
        </Link>
        <Link
          href={runLogHref}
          className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-medium text-ink-70 transition-colors hover:border-line"
        >
          See run log
        </Link>
      </div>
    </div>
  );
}
