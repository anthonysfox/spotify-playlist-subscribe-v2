import { NextResponse } from "next/server";
import getClerkOAuthToken from "utils/clerk";
import { OFFSET } from "utils/constants";

export async function GET(request: Request) {
  const { userId, token } = await getClerkOAuthToken();

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "popular";
  const offset = searchParams.get("offset") || 0;

  // Define curated search terms for different categories
  const curatedCategories = {
    popular: [
      "top hits 2024",
      "viral hits",
      "trending now",
      "popular songs",
      "chart toppers",
    ],
    mood: [
      "chill vibes",
      "workout motivation",
      "party hits",
      "study focus",
      "sleep relaxation",
    ],
    genre: [
      "pop hits",
      "rock classics",
      "hip hop essentials",
      "electronic dance",
      "indie alternative",
      "r&b soul",
      "country favorites",
      "jazz vibes",
      "classical music",
      "reggae beats",
    ],
    // New specific genre categories for frontend
    pop: [
      "pop hits",
      "top 40 hits",
      "mainstream pop",
      "pop classics",
      "chart pop",
    ],
    rock: [
      "rock classics",
      "alternative rock",
      "indie rock",
      "classic rock",
      "hard rock",
    ],
    hiphop: [
      "hip hop essentials",
      "rap hits",
      "trap music",
      "old school hip hop",
      "modern rap",
    ],
    electronic: [
      "electronic dance",
      "edm hits",
      "house music",
      "techno beats",
      "trance music",
    ],
    "r&b": [
      "r&b soul",
      "neo soul",
      "classic soul",
      "contemporary r&b",
      "smooth r&b",
    ],
    country: [
      "country favorites",
      "country hits",
      "folk music",
      "bluegrass",
      "country rock",
    ],
    jazz: [
      "jazz vibes",
      "smooth jazz",
      "blues music",
      "jazz classics",
      "fusion jazz",
    ],
    classical: [
      "classical music",
      "orchestral",
      "piano music",
      "instrumental",
      "film scores",
    ],
    // Popular sub-options
    trending: [
      "trending now",
      "viral hits",
      "trending songs",
      "trending music",
      "trending playlists",
    ],
    viral: [
      "viral hits",
      "viral songs",
      "viral music",
      "viral tiktok",
      "viral trending",
    ],
    charts: [
      "chart toppers",
      "billboard hits",
      "top charts",
      "chart music",
      "chart songs",
    ],
    hits: ["top hits", "hit songs", "popular hits", "hit music", "hits 2024"],
    top40: [
      "top 40 hits",
      "top 40 songs",
      "top 40 music",
      "top 40 radio",
      "top 40 playlist",
    ],
    // Mood sub-options
    chill: [
      "chill vibes",
      "chill music",
      "chill songs",
      "chill playlist",
      "chill beats",
    ],
    energetic: [
      "energetic music",
      "high energy",
      "energetic songs",
      "energy boost",
      "energetic workout",
    ],
    romantic: [
      "romantic songs",
      "romantic music",
      "love songs",
      "romantic playlist",
      "romantic vibes",
    ],
    melancholy: [
      "melancholy music",
      "sad songs",
      "melancholy vibes",
      "emotional music",
      "melancholy playlist",
    ],
    happy: [
      "happy songs",
      "happy music",
      "feel good songs",
      "happy vibes",
      "happy playlist",
    ],
    focused: [
      "focus music",
      "study focus",
      "concentration music",
      "focus playlist",
      "productive music",
    ],
    // Decade sub-options
    "2020s": [
      "2020s hits",
      "2020s music",
      "2020s songs",
      "modern hits",
      "2020s playlist",
    ],
    "2010s": [
      "2010s hits",
      "2010s music",
      "2010s songs",
      "2010s playlist",
      "2010s pop",
    ],
    "2000s": [
      "2000s hits",
      "2000s music",
      "2000s songs",
      "2000s playlist",
      "2000s pop",
    ],
    "1990s": [
      "90s hits",
      "90s music",
      "90s songs",
      "90s playlist",
      "90s classics",
    ],
    "1980s": [
      "80s hits",
      "80s music",
      "80s songs",
      "80s playlist",
      "80s classics",
    ],
    "1970s": [
      "70s hits",
      "70s music",
      "70s songs",
      "70s playlist",
      "70s classics",
    ],
    "1960s": [
      "60s hits",
      "60s music",
      "60s songs",
      "60s playlist",
      "60s classics",
    ],
    // Activity sub-options
    workout: [
      "workout motivation",
      "workout music",
      "gym playlist",
      "fitness music",
      "workout songs",
    ],
    running: [
      "running music",
      "running playlist",
      "jogging music",
      "running songs",
      "cardio music",
    ],
    cooking: [
      "cooking playlist",
      "cooking music",
      "kitchen vibes",
      "cooking songs",
      "chef music",
    ],
    commute: [
      "commute songs",
      "commute music",
      "driving playlist",
      "road trip music",
      "commute vibes",
    ],
    gaming: [
      "gaming soundtrack",
      "gaming music",
      "video game music",
      "gaming playlist",
      "game music",
    ],
    travel: [
      "travel vibes",
      "travel music",
      "travel playlist",
      "vacation music",
      "travel songs",
    ],
    study: [
      "study focus",
      "study music",
      "study playlist",
      "academic music",
      "study songs",
    ],
    party: [
      "party hits",
      "party music",
      "party playlist",
      "party songs",
      "celebration music",
    ],
    decade: [
      "90s hits",
      "2000s pop",
      "2010s hits",
      "classic rock",
      "modern hits",
    ],
    activity: [
      "running music",
      "cooking playlist",
      "commute songs",
      "gaming soundtrack",
      "travel vibes",
    ],
  };

  const searchTerms =
    curatedCategories[category as keyof typeof curatedCategories] ||
    curatedCategories.popular;

  try {
    // Fetch playlists for the selected category
    const playlistPromises = searchTerms.map((term) => {
      const spotifyUrl = `${
        process.env.BASE_SPOTIFY_URL
      }/search?q=${encodeURIComponent(term)}&type=playlist&limit=${Math.floor(
        OFFSET / searchTerms.length
      )}&offset=${offset}`;
      return fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch playlists for term: ${term}`);
        }
        return res.json();
      });
    });

    const responses = await Promise.allSettled(playlistPromises);

    // Extract successful responses and flatten playlist items
    const playlists = responses
      .filter((response) => response.status === "fulfilled")
      .flatMap(
        (response) =>
          response.value.playlists?.items.filter((isThere) => isThere) || []
      );

    // Remove duplicates based on playlist ID
    const uniquePlaylists = playlists.filter(
      (playlist, index, self) =>
        index === self.findIndex((p) => p?.id === playlist?.id)
    );

    return NextResponse.json(uniquePlaylists);
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
    });
  }
}
