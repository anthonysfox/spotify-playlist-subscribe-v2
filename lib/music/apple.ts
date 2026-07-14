import { SignJWT, importPKCS8 } from "jose";
import type { PlaylistTrack } from "@/lib/track-filters";
import type {
  MusicClient,
  MusicProviderAdapter,
  PlaylistSummary,
} from "./types";

const API = "https://api.music.apple.com";

// Apple caps developer tokens at six months; a short life is fine because we
// mint one per process and cache it.
const DEVELOPER_TOKEN_TTL = "12h";

// Apple accepts at most 100 tracks per add call, matching Spotify.
const TRACK_BATCH_SIZE = 100;

// Hard bound on pagination. At 100 tracks a page this allows 20,000 tracks —
// far beyond any real playlist — while ensuring a malformed or self-referential
// `next` pointer can't spin a cron job until it runs out of memory.
const MAX_PAGES = 200;

/**
 * Apple has two separate ID spaces, and the sync engine touches both:
 *
 *   `p.…`  a *library* playlist — the user's own, and the only kind we can write
 *   `pl.…` a *catalog* playlist — Apple-curated, or a user playlist someone
 *          shared (which mints a `pl.u-…` globalId and promotes it to catalog)
 *
 * A managed playlist is always a library playlist; a source is always a catalog
 * one. They are read through completely different endpoints, so every read has
 * to know which it's holding.
 */
function isLibraryPlaylist(playlistId: string): boolean {
  return playlistId.startsWith("p.");
}

/**
 * The Apple Music developer token: an ES256 JWT signed with the MusicKit private
 * key. Cached for its lifetime — signing on every request is pure waste.
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Exported because the browser needs it too: MusicKit JS can't authorise a user
 * without `music.configure({ developerToken })`, and the token must be signed
 * server-side — the .p8 private key never goes near the client.
 */
export async function getDeveloperToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error(
      "Apple Music is not configured. Set APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID " +
        "and APPLE_MUSIC_PRIVATE_KEY (the contents of the MusicKit .p8 file).",
    );
  }

  // Env vars can't hold real newlines, so the .p8 may be stored with \n escapes.
  const key = await importPKCS8(privateKey.replace(/\\n/g, "\n").trim(), "ES256");

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime(DEVELOPER_TOKEN_TTL)
    .sign(key);

  // Re-mint a minute early rather than race the expiry.
  cachedToken = { token, expiresAt: Date.now() + 11 * 60 * 60 * 1000 };

  return token;
}

/** Raised when the user's Music User Token has expired or been revoked. */
export class AppleMusicAuthError extends Error {
  constructor() {
    super(
      "Apple Music user token is expired or invalid. Music User Tokens cannot be " +
        "refreshed server-side — the user must reconnect Apple Music.",
    );
    this.name = "AppleMusicAuthError";
  }
}

class AppleMusicClient implements MusicClient {
  readonly provider = "APPLE_MUSIC" as const;

  // Apple's REST API has no endpoint for removing tracks from a playlist —
  // removal exists only in native MusicKit, and only for playlists the calling
  // app itself created. SyncMode.REPLACE is therefore impossible here, and the
  // sync engine skips those playlists rather than silently appending forever.
  readonly capabilities = { removeTracks: false } as const;

  private storefront: string | null = null;

  constructor(
    private readonly developerToken: string,
    private readonly userToken: string,
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.developerToken}`,
        "Music-User-Token": this.userToken,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    // A dead Music User Token is the single most likely failure here, and it is
    // not retryable — surface it as something the UI can act on.
    if (response.status === 401 || response.status === 403) {
      throw new AppleMusicAuthError();
    }

    return response;
  }

  /** The user's iTunes storefront, which every catalog URL is scoped to. */
  private async getStorefront(): Promise<string> {
    if (this.storefront) return this.storefront;

    const response = await this.request("/v1/me/storefront");

    if (!response.ok) {
      throw new Error(`Failed to resolve storefront: ${response.status}`);
    }

    const body = await response.json();
    this.storefront = body.data?.[0]?.id ?? "us";

    return this.storefront!;
  }

  /**
   * Map an Apple track resource onto the engine's shape.
   *
   * Note `addedAt`: only *library* tracks carry a dateAdded. A catalog playlist
   * has no per-track added date at all, so sources report null — which
   * `withinAgeLimit` deliberately treats as "keep", since an unknown date is not
   * evidence of being old.
   */
  private toPlaylistTrack(item: any): PlaylistTrack | null {
    const attributes = item?.attributes;

    if (!item?.id || !attributes) return null;

    return {
      id: item.id,
      name: attributes.name ?? "",
      artists: attributes.artistName ? [attributes.artistName] : [],
      explicit: attributes.contentRating === "explicit",
      addedAt: attributes.dateAdded ?? null,
    };
  }

  private async paginate(firstPath: string): Promise<PlaylistTrack[]> {
    const tracks: PlaylistTrack[] = [];
    const seen = new Set<string>();

    let next: string | null = firstPath;
    let pages = 0;

    while (next) {
      // A `next` that points back at a page we've already fetched would loop
      // forever and take the cron job's memory with it. Trust Apple, but bound
      // it — both by page count and by never re-fetching the same path.
      if (seen.has(next) || ++pages > MAX_PAGES) {
        console.warn(
          `⚠️ Apple Music pagination stopped early at ${pages} pages for ${firstPath} ` +
            `(repeated or runaway 'next' pointer)`,
        );
        break;
      }

      seen.add(next);

      const response: Response = await this.request(next);

      if (!response.ok) {
        if (response.status === 404) {
          console.error(`❌ Apple Music playlist not found: ${firstPath}`);
          return [];
        }
        throw new Error(
          `Apple Music API error: ${response.status} ${response.statusText}`,
        );
      }

      const body: any = await response.json();

      for (const item of body.data ?? []) {
        const track = this.toPlaylistTrack(item);
        if (track) tracks.push(track);
      }

      // Apple returns `next` as a path (not a full URL), already including its
      // own offset — so it can be passed straight back to request().
      next = body.next ?? null;
    }

    return tracks;
  }

  async getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    if (isLibraryPlaylist(playlistId)) {
      return this.paginate(
        `/v1/me/library/playlists/${playlistId}/tracks?limit=100`,
      );
    }

    const storefront = await this.getStorefront();

    return this.paginate(
      `/v1/catalog/${storefront}/playlists/${playlistId}/tracks?limit=100`,
    );
  }

  async getPlaylist(playlistId: string): Promise<PlaylistSummary | null> {
    const path = isLibraryPlaylist(playlistId)
      ? `/v1/me/library/playlists/${playlistId}`
      : `/v1/catalog/${await this.getStorefront()}/playlists/${playlistId}`;

    const response = await this.request(path);

    if (!response.ok) return null;

    const body = await response.json();
    const playlist = body.data?.[0];

    if (!playlist) return null;

    const artwork = playlist.attributes?.artwork?.url;

    return {
      id: playlist.id,
      name: playlist.attributes?.name ?? "",
      // Apple returns artwork as a template with {w}/{h} placeholders that must
      // be filled in before the URL resolves to an actual image.
      imageUrl: artwork
        ? artwork.replace("{w}", "640").replace("{h}", "640")
        : null,
      // Apple doesn't report a track count on the playlist resource, so this is
      // only trustworthy after a sync recounts it.
      trackCount: playlist.attributes?.trackCount ?? 0,
    };
  }

  /** Fill in Apple's {w}/{h} artwork template so the URL resolves to an image. */
  private artworkUrl(attributes: any): string | null {
    const url = attributes?.artwork?.url;

    return url ? url.replace("{w}", "640").replace("{h}", "640") : null;
  }

  async searchPlaylists(
    query: string,
    limit = 20,
  ): Promise<PlaylistSummary[]> {
    const storefront = await this.getStorefront();

    const response = await this.request(
      `/v1/catalog/${storefront}/search?term=${encodeURIComponent(query)}&types=playlists&limit=${limit}`,
    );

    if (!response.ok) return [];

    const body = await response.json();

    return (body.results?.playlists?.data ?? []).map((playlist: any) => ({
      id: playlist.id,
      name: playlist.attributes?.name ?? "",
      imageUrl: this.artworkUrl(playlist.attributes),
      // Apple doesn't report a track count on playlist search results.
      trackCount: 0,
    }));
  }

  async getUserPlaylists(limit = 20, offset = 0): Promise<PlaylistSummary[]> {
    // The user's *library* playlists — these are the ones we can write to, and
    // therefore the only valid destinations. Catalog playlists are read-only.
    const response = await this.request(
      `/v1/me/library/playlists?limit=${limit}&offset=${offset}`,
    );

    if (!response.ok) return [];

    const body = await response.json();

    return (body.data ?? []).map((playlist: any) => ({
      id: playlist.id,
      name: playlist.attributes?.name ?? "",
      imageUrl: this.artworkUrl(playlist.attributes),
      trackCount: 0,
    }));
  }

  async createPlaylist(
    name: string,
    description?: string,
  ): Promise<PlaylistSummary> {
    const response = await this.request("/v1/me/library/playlists", {
      method: "POST",
      body: JSON.stringify({ attributes: { name, description } }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Failed to create Apple Music playlist: ${response.status} ${details}`,
      );
    }

    const body = await response.json();
    const playlist = body.data?.[0];

    return {
      id: playlist.id,
      name: playlist.attributes?.name ?? name,
      imageUrl: null,
      trackCount: 0,
    };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    for (let i = 0; i < trackIds.length; i += TRACK_BATCH_SIZE) {
      const batch = trackIds.slice(i, i + TRACK_BATCH_SIZE);

      const response = await this.request(
        `/v1/me/library/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          // Catalog song IDs are added with type "songs"; that is what reading a
          // catalog playlist's tracks hands back, so they can be passed straight
          // through.
          body: JSON.stringify({
            data: batch.map((id) => ({ id, type: "songs" })),
          }),
        },
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Failed to add tracks to Apple Music playlist: ${response.status} ${details}`,
        );
      }
    }
  }

  async removeTracks(): Promise<void> {
    // Deliberately unimplemented rather than quietly doing nothing. Apple's REST
    // API cannot remove playlist tracks, `capabilities.removeTracks` says so, and
    // the sync engine checks that before ever reaching here. Landing in this
    // method means the engine skipped that check — a bug worth hearing about.
    throw new Error(
      "Apple Music's API cannot remove tracks from a playlist. " +
        "Check client.capabilities.removeTracks before calling this.",
    );
  }
}

export function createAppleMusicClient(
  developerToken: string,
  userToken: string,
): MusicClient {
  return new AppleMusicClient(developerToken, userToken);
}

export const appleMusicProvider: MusicProviderAdapter = {
  id: "APPLE_MUSIC",

  async forUser(userId: string): Promise<MusicClient | null> {
    // Imported lazily so this module stays usable outside a Next server runtime.
    const { default: prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { appleMusicUserToken: true },
    });

    // No stored token means Apple Music was never connected, or the token was
    // cleared after expiring. Either way it's an ordinary "not connected" state,
    // and the sync engine skips the user rather than failing the run.
    if (!user?.appleMusicUserToken) return null;

    return createAppleMusicClient(
      await getDeveloperToken(),
      user.appleMusicUserToken,
    );
  },
};
