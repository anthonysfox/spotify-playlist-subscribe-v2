import type { AgentProposal } from "./proposals";
import type { ManagedPlaylistWithSubscriptions } from "@/types";

export type ProposalDescription = {
  heading: string;
  lines: string[];
  unresolved?: boolean;
};

const FREQ_WORD: Record<string, string> = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

const PROVIDER_NAME: Record<string, string> = {
  SPOTIFY: "Spotify",
  APPLE_MUSIC: "Apple Music",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function describeProposal(
  p: AgentProposal,
  library: ManagedPlaylistWithSubscriptions[],
): ProposalDescription {
  switch (p.action) {
    case "unsubscribe": {
      const managed = library.find((m) => m.id === p.params.managedPlaylistId);
      const source = managed?.subscriptions.find(
        (s) => s.sourcePlaylist.id === p.params.sourcePlaylistId,
      )?.sourcePlaylist;

      if (!managed || !source) {
        return { heading: "Unknown playlist", lines: [], unresolved: true };
      }

      // Work out "last source" from the library, not from the params.
      const lastSource = managed.subscriptions.length === 1;
      return {
        heading: `Remove ${source.name} from ${managed.name}`,
        lines: lastSource
          ? [`It's the last source, so ${managed.name} stops being managed`]
          : [],
      };
    }
    case "subscribe": {
      const {
        sourcePlaylist,
        managedPlaylist,
        newPlaylistName,
        syncFrequency,
        provider,
      } = p.params;
      const freq = FREQ_WORD[syncFrequency] ?? syncFrequency.toLowerCase();

      if (managedPlaylist) {
        const dest = library.find(
          (m) =>
            m.externalPlaylistId === managedPlaylist.id &&
            m.provider === provider,
        );

        if (!dest)
          return { heading: "Unknown playlist", lines: [], unresolved: true };

        return {
          heading: `Add ${sourcePlaylist.name} to ${dest.name}`,
          lines: [
            `${plural(sourcePlaylist.trackCount, "track")} on ${PROVIDER_NAME[provider]}`,
            `New tracks add ${freq}`,
          ],
        };
      }

      return {
        heading: `Create "${newPlaylistName ?? "New Playlist"} from ${sourcePlaylist.name}`,
        lines: [
          `${plural(sourcePlaylist.trackCount, "track")} on ${PROVIDER_NAME[provider]}`,
          `New tracks added ${freq}`,
        ],
      };
    }
    case "generatePlaylist": {
      const { playlistName, count, vibe, provider } = p.params;
      return {
        heading: `Create ${playlistName}`,
        lines: [
          `${plural(count, "track")} on ${PROVIDER_NAME[provider]}`,
          `Vibe: ${vibe}`,
        ],
      };
    }
    case "addArtists": {
      const { managed, artists, syncFrequency, provider } = p.params;
      const dest = library.find(
        (m) => m.externalPlaylistId === managed.id && m.provider === provider,
      );
      if (!dest)
        return { heading: "Unknown playlist", lines: [], unresolved: false };

      return {
        heading: `Add ${plural(artists.length, "artist")} to ${dest.name}`,
        lines: [
          artists.join(", "),
          `New tracks added ${FREQ_WORD[syncFrequency] ?? "weekly"}`,
        ],
      };
    }
  }
}
