import type { PlaylistTrack } from "@/lib/sync/track-filters";
import type {
  MusicClient,
  MusicProviderAdapter,
  PlaylistSummary,
} from "./types";
import { spotifyFetch } from "./spotify-fetch";

// Spotify accepts at most 100 track URIs per add/remove call.
const TRACK_BATCH_SIZE = 100;

// The most results /search returns per request, and its highest allowed offset.
const SEARCH_PAGE_SIZE = 10;
const SEARCH_MAX_OFFSET = 1000;

const TRACK_FIELDS = "id,name,explicit,artists(name),external_ids(isrc)";

// A courtesy pause between batched writes, carried over from the original
// sync engine — Spotify rate-limits aggressively.
const BATCH_PAUSE_MS = 100;

const trackUri = (trackId: string) => `spotify:track:${trackId}`;

// Spotify is moving the track count from `tracks` to `items`, and only returns
// `items` on some playlists, so read both.
const trackTotal = (playlist: any): number =>
  playlist.items?.total ?? playlist.tracks?.total ?? 0;

class SpotifyClient implements MusicClient {
  readonly provider = "SPOTIFY" as const;

  // Spotify supports removing playlist items, so REPLACE mode works, and it
  // accepts a custom cover image upload (`PUT /playlists/{id}/images`).
  readonly capabilities = { removeTracks: true, setCoverImage: true } as const;

  constructor(private readonly token: string) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    // Spotify's paging `next` links are already absolute.
    const url = path.startsWith("http")
      ? path
      : `${process.env.BASE_SPOTIFY_URL}${path}`;

    return spotifyFetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

  async getPlaylistTracks(
    playlistId: string,
    limit?: number,
  ): Promise<PlaylistTrack[]> {
    // A `limit` (preview mode) only ever needs a handful of tracks, so ask
    // Spotify for exactly that many per page instead of the usual 50 — no
    // point paginating through a page of 50 to read the first 3.
    const pageSize = limit ? Math.min(limit, 50) : 50;
    const tracks: PlaylistTrack[] = [];

    // Ask for the metadata the engine actually needs. This used to request only
    // `items(track(id))`, which left the engine unable to tell what any song was
    // — no filtering, no dedupe, no judgement possible.
    let next: string | null =
      `/playlists/${playlistId}/items?fields=items(added_at,item(${TRACK_FIELDS})),next&limit=${pageSize}`;
    let usedLegacyEndpoint = false;

    while (next) {
      if (limit && tracks.length >= limit) break;

      const response: Response = await this.request(next);

      // /items is documented as 403 for playlists the user neither owns nor
      // collaborates on, which covers most sync sources. The spec offers no
      // replacement for reading those, so fall back to the deprecated endpoint.
      if (response.status === 403 && !usedLegacyEndpoint && !tracks.length) {
        usedLegacyEndpoint = true;
        next = `/playlists/${playlistId}/tracks?fields=items(added_at,track(${TRACK_FIELDS})),next&limit=${pageSize}`;
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ Playlist ${playlistId} not found`);
          return [];
        }
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: any = await response.json();

      for (const item of data.items ?? []) {
        const track = item?.item ?? item?.track;

        // Local files and removed tracks come back without an ID.
        if (!track?.id) continue;

        tracks.push({
          id: track.id,
          name: track.name ?? "",
          artists: (track.artists ?? [])
            .map((artist: any) => artist?.name)
            .filter(Boolean),
          explicit: Boolean(track.explicit),
          addedAt: item.added_at ?? null,
          isrc: track.external_ids?.isrc ?? null,
        });
      }

      next = data.next ?? null;
    }

    return limit ? tracks.slice(0, limit) : tracks;
  }

  async getPlaylist(playlistId: string): Promise<PlaylistSummary | null> {
    const response = await this.request(
      `/playlists/${playlistId}?fields=id,name,images,owner.display_name,items.total,tracks.total`,
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      imageUrl: data.images?.[0]?.url ?? null,
      trackCount: trackTotal(data),
      owner: data.owner?.display_name ?? null,
      provider: this.provider,
    };
  }

  async searchPlaylists(
    query: string,
    limit = 20,
    offset = 0,
  ): Promise<PlaylistSummary[]> {
    const playlists: PlaylistSummary[] = [];
    let fetched = 0;

    // Callers can ask for more than one /search page holds, so walk the pages.
    // `fetched` counts raw results, nulls included, so a caller's next
    // `offset + limit` page lines up with what Spotify actually skipped.
    while (fetched < limit && offset + fetched <= SEARCH_MAX_OFFSET) {
      const pageSize = Math.min(limit - fetched, SEARCH_PAGE_SIZE);
      const response = await this.request(
        `/search?q=${encodeURIComponent(query)}&type=playlist&limit=${pageSize}&offset=${offset + fetched}`,
      );

      if (!response.ok) break;

      const data = await response.json();
      const items: any[] = data.playlists?.items ?? [];

      playlists.push(
        ...items
          // Spotify returns nulls in this array for playlists it won't serve us.
          .filter(Boolean)
          .map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            imageUrl: playlist.images?.[0]?.url ?? null,
            trackCount: trackTotal(playlist),
            owner: playlist.owner?.display_name ?? null,
            provider: this.provider,
          })),
      );

      fetched += items.length;
      if (!items.length || !data.playlists?.next) break;
    }

    return playlists;
  }

  async searchTracks(query: string, limit = 5): Promise<PlaylistTrack[]> {
    const response = await this.request(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${Math.min(limit, SEARCH_PAGE_SIZE)}`,
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.tracks?.items ?? []).filter(Boolean).map((track: any) => ({
      id: track.id,
      name: track.name ?? "",
      artists: (track.artists ?? [])
        .map((artist: any) => artist?.name)
        .filter(Boolean),
      explicit: Boolean(track.explicit),
      addedAt: null,
    }));
  }

  async getUserPlaylists(limit = 20, offset = 0): Promise<PlaylistSummary[]> {
    // /me/playlists returns playlists the user *follows* as well as ones they
    // own, and you can't add tracks to someone else's playlist. Only owned ones
    // are valid destinations, so filter here — this is the only layer that knows
    // the Spotify user ID to compare against.
    const [meResponse, response] = await Promise.all([
      this.request("/me"),
      this.request(`/me/playlists?limit=${limit}&offset=${offset}`),
    ]);

    if (!response.ok || !meResponse.ok) return [];

    const { id: spotifyUserId } = await meResponse.json();
    const data = await response.json();

    return (data.items ?? [])
      .filter(Boolean)
      .filter((playlist: any) => playlist.owner?.id === spotifyUserId)
      .map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        imageUrl: playlist.images?.[0]?.url ?? null,
        trackCount: trackTotal(playlist),
        owner: playlist.owner?.display_name ?? null,
        provider: this.provider,
      }));
  }

  async createPlaylist(
    name: string,
    description?: string,
  ): Promise<PlaylistSummary> {
    const response = await this.request("/me/playlists", {
      method: "POST",
      body: JSON.stringify({ name, description, public: false }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create playlist: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      imageUrl: data.images?.[0]?.url ?? null,
      trackCount: trackTotal(data),
      owner: data.owner?.display_name ?? null,
      provider: this.provider,
    };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += TRACK_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + TRACK_BATCH_SIZE);

      const response = await this.request(`/playlists/${playlistId}/items`, {
        method: "POST",
        body: JSON.stringify({ uris: batch.map(trackUri) }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Failed to add tracks: ${response.status} ${details}`);
      }

      if (i + TRACK_BATCH_SIZE < trackIds.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    }
  }

  async removeTracks(playlistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += TRACK_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + TRACK_BATCH_SIZE);

      const response = await this.request(`/playlists/${playlistId}/items`, {
        method: "DELETE",
        body: JSON.stringify({
          items: batch.map((id) => ({ uri: trackUri(id) })),
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ Playlist ${playlistId} not found`);
          return;
        }

        const details = await response.text();
        throw new Error(
          `Failed to remove tracks: ${response.status} ${details}`,
        );
      }

      if (i + TRACK_BATCH_SIZE < trackIds.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    }
  }

  async setPlaylistCover(
    playlistId: string,
    jpegBase64: string,
  ): Promise<void> {
    // Spotify wants the *raw* base64 of a JPEG as the request body (not JSON,
    // not a data: URL), with an image/jpeg content type, and the payload must be
    // ≤ 256 KB. This endpoint requires the `ugc-image-upload` scope on the token
    // — without it Spotify returns 403.
    const response = await this.request(`/playlists/${playlistId}/images`, {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: jpegBase64,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Failed to set playlist cover: ${response.status} ${details}`,
      );
    }
  }
}

/**
 * Build a Spotify client from an access token you already have.
 *
 * Separated from `forUser` so that anything holding a token — a route that just
 * fetched one, or a test using a client-credentials token — can drive the exact
 * same code path the sync engine uses, rather than a reimplementation of it.
 */
export function createSpotifyClient(token: string): MusicClient {
  return new SpotifyClient(token);
}

export const spotifyProvider: MusicProviderAdapter = {
  id: "SPOTIFY",

  async forUser(userId: string): Promise<MusicClient | null> {
    // Imported lazily: `utils/clerk` pulls in `@clerk/nextjs/server`, which only
    // loads inside a Next server runtime. Keeping it out of module scope means
    // the rest of this adapter (and everything that imports it) stays usable in
    // plain Node — scripts, tests, a future React Native backend.
    const { default: getClerkOAuthToken } = await import("utils/clerk");

    const { token } = await getClerkOAuthToken(userId);

    // No token means the user hasn't connected Spotify (or the grant lapsed).
    // That's a normal state, not a failure — the caller skips them.
    if (!token) return null;

    return createSpotifyClient(token);
  },
};
