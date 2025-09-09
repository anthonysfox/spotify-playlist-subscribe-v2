// iTunes API utility for track previews

interface iTunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}

interface iTunesResponse {
  results: iTunesTrack[];
}

export async function searchItunesTrack(
  trackName: string,
  artistName: string,
  albumName: string,
  durationMs: number
): Promise<string | null> {
  try {
    // Create a more specific search query
    const query = encodeURIComponent(`${trackName} ${artistName} ${albumName}`);
    const url = `https://itunes.apple.com/search?term=${query}&media=music&entity=song&limit=10`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("iTunes API error:", response.status);
      return null;
    }

    const data: iTunesResponse = await response.json();

    if (data.results && data.results.length > 0) {
      // Find the best match based on duration and preview URL
      const durationTolerance = 5000; // 5 seconds
      let potentialMatches = data.results.filter(
        (track) => track.previewUrl
      );

      if (potentialMatches.length === 0) {
        return null;
      }

      // Sort by duration difference
      potentialMatches.sort((a, b) => {
        const aDiff = a.trackTimeMillis ? Math.abs(a.trackTimeMillis - durationMs) : Infinity;
        const bDiff = b.trackTimeMillis ? Math.abs(b.trackTimeMillis - durationMs) : Infinity;
        return aDiff - bDiff;
      });

      // If the best match is within the tolerance, return it
      if (potentialMatches[0].trackTimeMillis && Math.abs(potentialMatches[0].trackTimeMillis - durationMs) < durationTolerance) {
        return potentialMatches[0].previewUrl || null;
      }

      // Fallback to the first result with a preview if no duration match
      const trackWithPreview = data.results.find((track) => track.previewUrl);
      return trackWithPreview?.previewUrl || null;
    }

    return null;
  } catch (error) {
    console.error("Error searching iTunes:", error);
    return null;
  }
}

// Cache to avoid repeated API calls for the same track
const previewCache = new Map<string, string | null>();

export async function getTrackPreviewUrl(
  trackName: string,
  artistName: string,
  albumName: string,
  durationMs: number
): Promise<string | null> {
  const cacheKey = `${trackName}-${artistName}-${albumName}-${durationMs}`.toLowerCase();

  // Check cache first
  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey) || null;
  }

  // Search iTunes
  const previewUrl = await searchItunesTrack(
    trackName,
    artistName,
    albumName,
    durationMs
  );

  // Cache the result (even if null)
  previewCache.set(cacheKey, previewUrl);

  return previewUrl;
}