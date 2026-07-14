import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProvider, type MusicProvider, type PlaylistSummary } from "@/lib/music";
import { curatedCategoryTerms } from "constants/categories";

const PER_CATEGORY_LIMIT = 20;

/**
 * Browse playlists by category, on either service.
 *
 * "Curated" was never really curated — the Spotify route ran one search per
 * category term and flattened the results. That generalises for free: the terms
 * are plain English, so Apple Music gets category browsing without an
 * Apple-specific endpoint.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;
  const category = searchParams.get("category") ?? "popular";

  const terms = curatedCategoryTerms[category] ?? curatedCategoryTerms.popular;

  try {
    const client = await getProvider(provider).forUser(userId);

    if (!client) {
      return NextResponse.json(
        { error: `${provider} is not connected`, connected: false },
        { status: 409 },
      );
    }

    const perTerm = Math.max(
      1,
      Math.floor(PER_CATEGORY_LIMIT / Math.max(terms.length, 1)),
    );

    // One search per term, in parallel. allSettled so a single failing term
    // doesn't empty the whole category.
    const results = await Promise.allSettled(
      terms.map((term) => client.searchPlaylists(term, perTerm)),
    );

    const seen = new Set<string>();
    const playlists: PlaylistSummary[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      for (const playlist of result.value) {
        // The same playlist legitimately matches several terms in a category.
        if (seen.has(playlist.id)) continue;

        seen.add(playlist.id);
        playlists.push(playlist);
      }
    }

    return NextResponse.json({ provider, category, playlists });
  } catch (error: any) {
    console.error(`Curated browse failed on ${provider}:`, error.message);

    return NextResponse.json({ error: "Failed to load playlists" }, { status: 500 });
  }
}
