import type { MusicProvider, MusicProviderAdapter } from "./types";
import { spotifyProvider } from "./spotify";
import { appleMusicProvider } from "./apple";

export type {
  MusicClient,
  MusicProvider,
  MusicProviderAdapter,
  PlaylistSummary,
  PlaylistTrack,
  ProviderCapabilities,
} from "./types";

/**
 * Every music service the app can talk to.
 *
 * The sync engine never names a provider: it resolves a client from here and
 * works in terms of `PlaylistTrack`, so dedupe, the explicit/age filters, the
 * REPLACE rotation and the AI vibe curation all apply to both services without
 * knowing which one they're looking at.
 *
 * The two services are NOT feature-equivalent, and the interface says so rather
 * than papering over it — see `MusicClient.capabilities`. Apple Music's REST API
 * cannot remove tracks from a playlist at all, so SyncMode.REPLACE is impossible
 * there and the engine skips it instead of appending forever.
 */
const PROVIDERS: Record<MusicProvider, MusicProviderAdapter | undefined> = {
  SPOTIFY: spotifyProvider,
  APPLE_MUSIC: appleMusicProvider,
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
