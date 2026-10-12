import type { MusicProvider } from "@/generated/prisma/enums";

/**
 * Providers that are implemented but temporarily switched off.
 *
 * Apple Music is paused while the Apple Developer membership is lapsed — without
 * it the developer token can't be minted, so every Apple call would fail anyway.
 * Pausing it here (rather than ripping the adapter out) keeps the code intact:
 * empty this list to bring it back.
 *
 * Client-safe on purpose — no server imports — so the UI can read it too.
 */
export const PAUSED_PROVIDERS: readonly MusicProvider[] = ["APPLE_MUSIC"];

export function isProviderPaused(provider: MusicProvider): boolean {
  return PAUSED_PROVIDERS.includes(provider);
}

/**
 * The providers users can act on right now, as a non-empty tuple so it can feed
 * `z.enum()` directly — the AI assistant and MCP tools then never even see a
 * paused provider as an option.
 */
export const ACTIVE_PROVIDERS = (["SPOTIFY", "APPLE_MUSIC"] as const).filter(
  (provider) => !isProviderPaused(provider),
) as unknown as readonly ["SPOTIFY", ...MusicProvider[]];

export function pausedProviderMessage(provider: MusicProvider): string {
  const label = provider === "APPLE_MUSIC" ? "Apple Music" : provider;
  return `${label} is temporarily paused and will be back soon.`;
}
