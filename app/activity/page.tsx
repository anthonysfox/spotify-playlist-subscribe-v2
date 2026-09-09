import { AppFrame } from "../components/Navigation/AppFrame";

/**
 * Activity — reverse-chronological log of every sync run (README "Screens" >
 * Activity). The run data it needs (added counts, skip breakdown by reason,
 * failure cause) is computed by the sync engine but not yet persisted, so this
 * is a placeholder until the sync-run-log backend pass lands.
 */
export default function ActivityPage() {
  return (
    <AppFrame>
      <div className="flex h-full min-h-0 flex-col px-4 py-5 min-[900px]:px-6 min-[900px]:py-6">
        <h1 className="mb-1 font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Activity
        </h1>
        <p className="mb-8 text-[13px] text-ink-50">
          Every sync run across your playlists, newest first.
        </p>

        <div className="flex grow flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-display text-[17px] font-semibold text-ink">
            No sync activity yet
          </p>
          <p className="mt-1 max-w-[42ch] text-[13px] leading-relaxed text-ink-50">
            Once your playlists start syncing, each run shows up here with what
            it added and what it skipped.
          </p>
        </div>
      </div>
    </AppFrame>
  );
}
