import type {
  ManagedPlaylist,
  ManagedPlaylistSourceSubscription,
  SourcePlaylist,
} from "@/generated/prisma/client";
import type { MusicProvider, PlaylistSummary } from "@/lib/music/types";

/**
 * A managed playlist with its source subscriptions eagerly loaded — the shape
 * the store holds and the UI renders. Extends the Prisma row rather than
 * redefining it, so schema changes flow through automatically.
 */
export interface ManagedPlaylistWithSubscriptions extends ManagedPlaylist {
  subscriptions: (ManagedPlaylistSourceSubscription & {
    sourcePlaylist: SourcePlaylist;
  })[];
}

/**
 * What `selectedPlaylist` can actually hold.
 *
 * One piece of state serves two flows: a browsable playlist while subscribing,
 * and a managed playlist when opening its settings from the Subscriptions tab.
 */
export type SelectablePlaylist =
  | PlaylistSummary
  | ManagedPlaylistWithSubscriptions;

/**
 * Narrow the union to a browsable playlist (a search/curated result), as opposed
 * to one of the user's own managed playlists.
 *
 * `externalPlaylistId` only exists on the managed (database) shape, so it's a
 * reliable discriminator — and this keeps the subscribe flow honest rather than
 * casting and hoping.
 */
export function isPlaylistSummary(
  playlist: SelectablePlaylist | null,
): playlist is PlaylistSummary {
  return !!playlist && !("externalPlaylistId" in playlist);
}

/**
 * The request body the client sends to subscribe a source playlist to a managed
 * one. The server fills in defaults for anything optional (see
 * `app/api/music/subscribe/route.ts`).
 */
export interface SubscribeReqBody {
  /** Which service both playlists live on. Defaults to Spotify server-side. */
  provider?: MusicProvider;
  sourcePlaylist: {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
  };
  managedPlaylist?: {
    id: string;
    name: string;
    imageUrl: string | null;
    trackCount: number;
  };
  newPlaylistName?: string;
  syncFrequency: string;
  runImmediateSync: boolean;
  // Advanced settings properties
  syncQuantityPerSource?: number;
  syncMode?: string;
  explicitContentFilter?: boolean;
  trackAgeLimit?: number;
  vibePrompt?: string;
  customDays?: string[];
}
