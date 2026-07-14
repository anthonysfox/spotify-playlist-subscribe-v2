import type { MusicProvider, MusicProviderAdapter } from "./types";
import { spotifyProvider } from "./spotify";

export type {
  MusicClient,
  MusicProvider,
  MusicProviderAdapter,
  PlaylistSummary,
  PlaylistTrack,
} from "./types";

/**
 * Every music service the app can talk to.
 *
 * Adding Apple Music is an entry in this record plus one `lib/music/apple.ts`
 * implementing `MusicProviderAdapter`. Nothing in the sync engine changes: it
 * resolves a client from here and works in terms of `PlaylistTrack`, so the
 * dedupe, filters, REPLACE rotation and vibe curation all come along for free.
 *
 * The two things an Apple adapter has to solve that Spotify's doesn't:
 *   - auth is a developer token (JWT, signed with the MusicKit private key)
 *     *plus* a per-user Music User Token obtained client-side via MusicKit JS.
 *   - Music User Tokens expire and cannot be refreshed server-side the way a
 *     Spotify refresh token can, so a background sync must handle an expired
 *     token by asking the user to reconnect rather than by retrying.
 * Both live behind `forUser()`, which is exactly why auth is bound there.
 */
const PROVIDERS: Record<MusicProvider, MusicProviderAdapter | undefined> = {
  SPOTIFY: spotifyProvider,
  APPLE_MUSIC: undefined,
};

/**
 * Look up the adapter for a provider.
 *
 * Throws for a provider that isn't implemented yet — a playlist row can only
 * name a provider the schema knows about, so reaching an unimplemented one is a
 * bug worth surfacing loudly rather than skipping past.
 */
export function getProvider(provider: MusicProvider): MusicProviderAdapter {
  const adapter = PROVIDERS[provider];

  if (!adapter) {
    throw new Error(`No adapter implemented for music provider "${provider}"`);
  }

  return adapter;
}

export function isProviderSupported(provider: MusicProvider): boolean {
  return Boolean(PROVIDERS[provider]);
}
