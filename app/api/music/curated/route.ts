import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getProvider,
  type MusicProvider,
  type PlaylistSummary,
} from "@/lib/music";
import { curatedCategoryTerms } from "constants/categories";

// How many playlists to return for a category, and how many to pull per search
// term. These are deliberately generous relative to the target: Apple Music's
// catalogue search is sparse on generic terms — "trending now" returns nothing,
// "chart toppers" returns one workout playlist — so the terms that DO land have
// to carry the grid. Over-fetching per term and then capping fills it out on
// Apple without changing what Spotify shows.
// One response page. The full ordered pool below is deterministic per
// (provider, category), so paging is a stable slice of it.
const PAGE_SIZE = 24;
// How deep the pool goes — a few pages' worth. Bounded by the category's
// term list (~5 terms), so this is a ceiling, not a promise.
const MAX_POOL = 96;
const PER_TERM_LIMIT = 24;

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
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { searchParams } = request.nextUrl;
  const provider = (searchParams.get("provider") ?? "SPOTIFY") as MusicProvider;
  const category = searchParams.get("category") ?? "popular";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  const terms = curatedCategoryTerms[category] ?? curatedCategoryTerms.popular;

  try {
    const client = await getProvider(provider).forUser(userId);

    if (!client) {
      return NextResponse.json(
        { error: `${provider} is not connected`, connected: false },
        { status: 409 },
      );
    }

    // One search per term, in parallel. allSettled so a single failing term
    // doesn't empty the whole category.
    const results = await Promise.allSettled(
      terms.map((term) => client.searchPlaylists(term, PER_TERM_LIMIT)),
    );

    // Interleave the terms' results rather than concatenating them. Taken in
    // order, a single dominant first term (or, on Spotify, one that returns a
    // full page) would fill the whole grid before the others got a look in.
    // Round-robin keeps the category varied.
    const byTerm = results.map((r) => (r.status === "fulfilled" ? r.value : []));
    const seen = new Set<string>();
    const pool: PlaylistSummary[] = [];

    for (let i = 0; pool.length < MAX_POOL; i++) {
      let addedThisRound = false;

      for (const termResults of byTerm) {
        const playlist = termResults[i];
        if (!playlist) continue;

        addedThisRound = true;

        // The same playlist legitimately matches several terms in a category.
        if (seen.has(playlist.id)) continue;

        seen.add(playlist.id);
        pool.push(playlist);

        if (pool.length >= MAX_POOL) break;
      }

      // Every term is exhausted.
      if (!addedThisRound) break;
    }

    const playlists = pool.slice(offset, offset + PAGE_SIZE);
    const hasMore = offset + PAGE_SIZE < pool.length;

    return NextResponse.json(
      { provider, category, playlists, hasMore },
      {
        // The result only depends on provider + category, and curated grids
        // change slowly — let the browser reuse it across category toggles and
        // back-navigation instead of re-running a dozen Spotify searches.
        headers: {
          "Cache-Control":
            "private, max-age=300, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error: any) {
    console.error(`Curated browse failed on ${provider}:`, error.message);

    return NextResponse.json(
      { error: "Failed to load playlists" },
      { status: 500 },
    );
  }
}
