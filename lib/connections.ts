import {
  getProvider,
  isProviderSupported,
  type MusicProvider,
} from "@/lib/music";

const ALL_PROVIDERS: MusicProvider[] = ["SPOTIFY", "APPLE_MUSIC"];

/**
 * Which music services this user has actually connected. `forUser()` returning
 * null is the single source of truth for "usable".
 *
 * Called directly by AppFrame and by `/api/music/connections`.
 */
export async function getConnectionsForUser(
  userId: string,
): Promise<Record<MusicProvider, boolean>> {
  const entries = await Promise.all(
    ALL_PROVIDERS.map(async (provider) => {
      if (!isProviderSupported(provider)) return [provider, false] as const;
      try {
        return [
          provider,
          Boolean(await getProvider(provider).forUser(userId)),
        ] as const;
      } catch {
        return [provider, false] as const;
      }
    }),
  );
  return Object.fromEntries(entries) as Record<MusicProvider, boolean>;
}
