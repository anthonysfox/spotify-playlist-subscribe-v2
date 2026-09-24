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
      <div className="text-warn-text flex items-center gap-2 text-[13px] font-medium">
        <span className="bg-warn h-1.5 w-1.5 rounded-full" />
        {playlistName} didn&apos;t sync
      </div>
      <p className="text-ink-70 mt-1.5 max-w-[46ch] text-[12.5px] leading-relaxed">
        Nothing was lost — the run will retry once you reconnect
        {cause ? ` (${cause})` : ""}.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Link
          href={fixHref}
          className="bg-ink text-surface rounded-full px-4 py-2 text-[12.5px] font-medium transition-opacity hover:opacity-90"
        >
          {fixLabel}
        </Link>
        <Link
          href={runLogHref}
          className="border-line-strong text-ink-70 hover:border-line rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors"
        >
          See run log
        </Link>
      </div>
    </div>
  );
}
