import type { DBVibeTrack } from "@/lib/music/types";

/** searchTracksByVibe results, closest match first (the order the query returns). */
export function VibeTrackTable({ tracks }: { tracks: DBVibeTrack[] }) {
  console.log("hi");
  if (tracks.length === 0) {
    return (
      <div className="border-line text-ink-50 self-start rounded-xl border px-3 py-2 text-[12.5px]">
        No matching tracks found.
      </div>
    );
  }

  return (
    <div className="border-line bg-surface w-full overflow-x-auto rounded-xl border">
      <table className="w-full table-fixed border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="border-line text-ink-35 border-b font-mono text-[10px] tracking-[0.08em] uppercase">
            <th scope="col" className="w-8 px-2.5 py-2 text-right font-medium">
              #
            </th>
            <th scope="col" className="px-2.5 py-2 font-medium">
              Title
            </th>
            <th scope="col" className="px-2.5 py-2 font-medium">
              Artist
            </th>
            <th scope="col" className="w-14 px-2.5 py-2 text-right font-medium">
              Match
            </th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track, i) => (
            <tr
              key={track.external_id}
              className="border-line border-b last:border-b-0"
            >
              <td className="text-ink-35 px-2.5 py-1.5 text-right tabular-nums">
                {i + 1}
              </td>
              <td
                className="text-ink truncate px-2.5 py-1.5 font-medium"
                title={track.title}
              >
                {track.title}
              </td>
              <td
                className="text-ink-50 truncate px-2.5 py-1.5"
                title={track.artist}
              >
                {track.artist}
              </td>
              <td className="text-ink-50 px-2.5 py-1.5 text-right tabular-nums">
                {track.similarity.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
