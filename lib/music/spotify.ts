import type { PlaylistTrack } from "@/lib/track-filters";
import type {
  MusicClient,
  MusicProviderAdapter,
  PlaylistSummary,
} from "./types";

// Spotify accepts at most 100 track URIs per add/remove call.
const TRACK_BATCH_SIZE = 100;

// A courtesy pause between batched writes, carried over from the original
// sync engine — Spotify rate-limits aggressively.
const BATCH_PAUSE_MS = 100;

const trackUri = (trackId: string) => `spotify:track:${trackId}`;

class SpotifyClient implements MusicClient {
  readonly provider = "SPOTIFY" as const;

  constructor(private readonly token: string) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${process.env.BASE_SPOTIFY_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

  async getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    // Ask for the metadata the engine actually needs. This used to request only
    // `items(track(id))`, which left the engine unable to tell what any song was
    // — no filtering, no dedupe, no judgement possible.
    const fields = "items(added_at,track(id,name,explicit,artists(name))),next";
    const tracks: PlaylistTrack[] = [];

    let next: string | null = `/playlists/${playlistId}/tracks?fields=${fields}&limit=50`;

    while (next) {
      // Spotify's `next` is an absolute URL, so only the first hop is relative.
      const response: Response = next.startsWith("http")
        ? await fetch(next, {
            headers: { Authorization: `Bearer ${this.token}` },
          })
        : await this.request(next);

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
        const track = item?.track;

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
        });
      }

      next = data.next ?? null;
    }

    return tracks;
  }

  async getPlaylist(playlistId: string): Promise<PlaylistSummary | null> {
    const response = await this.request(
      `/playlists/${playlistId}?fields=id,name,images,tracks.total`,
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      id: data.id,
      name: data.name,
      imageUrl: data.images?.[0]?.url ?? null,
      trackCount: data.tracks?.total ?? 0,
    };
  }

  async createPlaylist(
    name: string,
    description?: string,
  ): Promise<PlaylistSummary> {
    // Spotify creates playlists under a user, so we need the Spotify user ID —
    // not the Clerk one.
    const meResponse = await this.request("/me");

    if (!meResponse.ok) {
      throw new Error(`Failed to resolve Spotify user: ${meResponse.status}`);
    }

    const { id: spotifyUserId } = await meResponse.json();

    const response = await this.request(`/users/${spotifyUserId}/playlists`, {
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
      trackCount: data.tracks?.total ?? 0,
    };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += TRACK_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + TRACK_BATCH_SIZE);

      const response = await this.request(`/playlists/${playlistId}/tracks`, {
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

      // Keep the `/items` + `items` shape the engine has always used. It works
      // against live Spotify, and this refactor is not the place to also swap
      // the removal endpoint for the `/tracks` + `tracks` variant.
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
