import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, isProviderSupported } from "@/lib/music";
import type { MusicProvider } from "@/lib/music";

const ALL_PROVIDERS: MusicProvider[] = ["SPOTIFY", "APPLE_MUSIC"];

/**
 * Which music services this user has actually connected.
 *
 * The app used to assume everyone signed in with Spotify, so every screen could
 * take a Spotify token for granted. Once someone can sign up with Apple instead,
 * that stops being true — and the UI needs to know which services are live so it
 * can offer the right ones rather than erroring on an absent grant.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const connections = await Promise.all(
    ALL_PROVIDERS.map(async (provider) => {
      if (!isProviderSupported(provider)) {
        return [provider, false] as const;
      }

      try {
        // forUser() returns null when the service isn't connected — that's the
        // single source of truth for "is this usable", rather than inspecting
        // tokens in two different places.
        const client = await getProvider(provider).forUser(userId);

        return [provider, Boolean(client)] as const;
      } catch {
        // A misconfigured provider (e.g. missing APPLE_MUSIC_* env) counts as
        // not connected rather than failing the whole request.
        return [provider, false] as const;
      }
    }),
  );

  return NextResponse.json({
    connections: Object.fromEntries(connections) as Record<
      MusicProvider,
      boolean
    >,
  });
}
