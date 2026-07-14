import type { MusicProvider } from "@/generated/prisma/enums";
import type { PlaylistTrack } from "@/lib/track-filters";

export type { MusicProvider, PlaylistTrack };

/**
 * The bits of a playlist the app actually stores and displays, independent of
 * which service it came from.
 */
export interface PlaylistSummary {
  /** The playlist's ID *on its provider* (a Spotify ID, an Apple globalId, …). */
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
}

/**
 * A music service, bound to one user's credentials.
 *
 * This is deliberately the *only* surface the sync engine talks to. Everything
 * downstream of it — song identity, dedupe, explicit/age filters, REPLACE
 * rotation, the AI vibe filter — works on plain `PlaylistTrack` objects and has
 * no idea which service they came from. Adding Apple Music therefore means
 * writing one adapter, not editing the engine.
 *
 * Credentials are resolved when the client is created (see `MusicProviderAdapter`),
 * so no method here takes a token. That matters because the two services don't
 * agree on what a credential even is: Spotify wants one OAuth bearer token,
 * while Apple wants a developer token *and* a per-user Music User Token. Binding
 * auth at construction keeps that difference from leaking into the engine.
 */
/**
 * What a given service can actually do.
 *
 * Providers are not feature-equivalent, and pretending otherwise means silently
 * broken syncs. Apple Music's REST API has no endpoint for removing tracks from
 * a playlist at all — removal only exists in native MusicKit, and only for
 * playlists your own app created. So REPLACE mode is genuinely impossible there,
 * and the engine needs to know that rather than discover it via a 4xx.
 */
export interface ProviderCapabilities {
  /** Can tracks be removed from a playlist? Required for SyncMode.REPLACE. */
  readonly removeTracks: boolean;
}

export interface MusicClient {
  readonly provider: MusicProvider;
  readonly capabilities: ProviderCapabilities;

  /** Every track on a playlist, with the metadata the engine needs to judge it. */
  getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]>;

  /** Name, artwork and size. Null if the playlist is gone or not visible to us. */
  getPlaylist(playlistId: string): Promise<PlaylistSummary | null>;

  createPlaylist(name: string, description?: string): Promise<PlaylistSummary>;

  addTracks(playlistId: string, trackIds: string[]): Promise<void>;

  removeTracks(playlistId: string, trackIds: string[]): Promise<void>;
}

/**
 * A music service, before it knows which user it's acting for.
 *
 * `forUser` returns null rather than throwing when the user hasn't connected
 * this service — "not connected" is an ordinary state, not an error, and the
 * cron job needs to skip those users quietly rather than fail the whole run.
 */
export interface MusicProviderAdapter {
  readonly id: MusicProvider;
  forUser(userId: string): Promise<MusicClient | null>;
}
